package br.com.connectdigital.totemmaquininha

import android.util.Log
import br.com.connectdigital.totemmaquininha.backend.Backend
import br.com.connectdigital.totemmaquininha.backend.PedidoPendente
import br.com.connectdigital.totemmaquininha.pagamento.Pagamento
import br.com.connectdigital.totemmaquininha.pagamento.TipoPagamento
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.util.concurrent.atomic.AtomicBoolean

sealed class Estado {
    data object Iniciando : Estado()
    data object Aguardando : Estado()
    data class Cobrando(val numero: Int, val valorCentavos: Long) : Estado()
    /** Terminal autorizou, mas o cliente ainda não retirou o cartão. */
    data class Autorizado(val numero: Int) : Estado()
    data class Aprovado(val numero: Int) : Estado()
    data class Recusado(val numero: Int, val motivo: String? = null) : Estado()
    data class Erro(val mensagem: String) : Estado()
}

/**
 * Laço principal: procura pedido pendente -> cobra na maquininha -> reporta ao
 * backend. (A senha do cliente é impressa pelo totem, não aqui.) Serializado por Mutex (nunca 2 cobranças juntas).
 */
class Orquestrador(
    private val backend: Backend,
    private val pagamento: Pagamento,
    private val scope: CoroutineScope,
) {
    private val _estado = MutableStateFlow<Estado>(Estado.Iniciando)
    val estado = _estado.asStateFlow()

    private val trava = Mutex()
    private val processados = HashSet<String>()

    fun iniciar() {
        scope.launch(Dispatchers.IO) {
            try {
                pagamento.ativar()
            } catch (e: Exception) {
                Log.e(TAG, "ativar falhou", e)
                _estado.value = Estado.Erro(e.message ?: "Falha na ativação")
            }
            _estado.value = Estado.Aguardando

            while (isActive) {
                try {
                    val inicio = System.currentTimeMillis()
                    val pendentes = backend.pendentes(ESPERA_SEG).filter { it.id !in processados }
                    if (pendentes.isNotEmpty()) processar(pendentes.first())
                    // Se o servidor respondeu na hora sem pedido (servidor antigo, sem espera longa), não martela.
                    val esperou = System.currentTimeMillis() - inicio > 5000
                    delay(if (pendentes.isEmpty() && esperou) 300 else 1500)
                } catch (e: Exception) {
                    Log.w(TAG, "loop: ${e.message}")
                    delay(5000)
                }
            }
        }
    }

    private suspend fun processar(pedido: PedidoPendente) = trava.withLock {
        processados.add(pedido.id)
        _estado.value = Estado.Cobrando(pedido.numeroPedido, pedido.valorCentavos)

        val tipo = when (pedido.forma) {
            "pix" -> TipoPagamento.PIX
            "cartao_debito" -> TipoPagamento.DEBITO
            else -> TipoPagamento.CREDITO
        }

        // Se o cliente cancelar no totem durante a cobrança, tira a tela de pagamento da maquininha.
        val autorizado = AtomicBoolean(false)
        val vigia = scope.launch(Dispatchers.IO) { vigiarCancelamento(pedido, autorizado) }

        // Assim que o terminal autoriza, o totem já mostra "aprovado" (sem esperar o cliente retirar o cartão).
        // O id da transação e a bandeira seguem no aviso final, quando o doPayment termina.
        pagamento.definirAoAutorizar {
            autorizado.set(true)
            _estado.value = Estado.Autorizado(pedido.numeroPedido)
            reportar(pedido, aprovado = true, transacaoId = null, bandeira = null)
        }

        val res = try {
            withContext(Dispatchers.IO) { pagamento.cobrar(pedido.valorCentavos, tipo, pedido.id) }
        } catch (e: Exception) {
            Log.e(TAG, "cobrar falhou", e)
            pagamento.definirAoAutorizar(null)
            vigia.cancel()
            reportar(pedido, aprovado = false, transacaoId = null, bandeira = null)
            _estado.value = Estado.Erro(e.message ?: "Falha na cobrança")
            volta()
            return@withLock
        }

        pagamento.definirAoAutorizar(null)
        vigia.cancel()
        reportar(pedido, res.aprovado, res.transacaoId, res.bandeira)

        if (res.aprovado) {
            _estado.value = Estado.Aprovado(pedido.numeroPedido)
        } else {
            // recusado: libera pra nova tentativa
            processados.remove(pedido.id)
            _estado.value = Estado.Recusado(pedido.numeroPedido, res.mensagem)
        }
        volta(if (res.aprovado) 4000 else 6000) // dá tempo de ler o motivo antes da próxima tentativa
    }

    private suspend fun vigiarCancelamento(pedido: PedidoPendente, autorizado: AtomicBoolean) {
        while (currentCoroutineContext().isActive) {
            delay(3000)
            // já autorizado pelo terminal: não aborta mais (o pedido virou "pago" no servidor)
            if (autorizado.get()) return
            try {
                val status = backend.statusPedido(pedido.id)
                if (status.isNotBlank() && status != "aguardando_pagamento") {
                    // insiste a cada volta: um abort que chega no meio de um reinício de sessão se perde
                    // (o vigia só para quando a cobrança termina e o processar o cancela)
                    Log.i(TAG, "pedido ${pedido.numeroPedido} saiu de aguardando_pagamento ($status): abortando cobrança")
                    pagamento.abortar()
                }
            } catch (e: Exception) {
                Log.w(TAG, "vigia: ${e.message}")
            }
        }
    }

    private fun reportar(
        pedido: PedidoPendente,
        aprovado: Boolean,
        transacaoId: String?,
        bandeira: String?,
    ) {
        try {
            backend.confirmar(
                pedidoId = pedido.id,
                aprovado = aprovado,
                transacaoId = transacaoId,
                bandeira = bandeira,
                formaReal = pedido.forma,
            )
        } catch (e: Exception) {
            Log.e(TAG, "confirmar falhou (pedido ${pedido.numeroPedido})", e)
        }
    }

    private suspend fun volta(ms: Long = 4000) {
        delay(ms)
        if (_estado.value !is Estado.Cobrando) _estado.value = Estado.Aguardando
    }

    private companion object {
        const val TAG = "Orquestrador"

        /** Espera longa (segundos) na consulta de pedidos: poucas requisições = pouco consumo de dados. */
        const val ESPERA_SEG = 20
    }
}
