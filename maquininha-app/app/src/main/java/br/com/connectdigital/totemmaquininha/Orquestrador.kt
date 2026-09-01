package br.com.connectdigital.totemmaquininha

import android.util.Log
import br.com.connectdigital.totemmaquininha.backend.Backend
import br.com.connectdigital.totemmaquininha.backend.PedidoPendente
import br.com.connectdigital.totemmaquininha.pagamento.Pagamento
import br.com.connectdigital.totemmaquininha.pagamento.TipoPagamento
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

sealed class Estado {
    data object Iniciando : Estado()
    data object Aguardando : Estado()
    data class Cobrando(val numero: Int, val valorCentavos: Long) : Estado()
    data class Aprovado(val numero: Int) : Estado()
    data class Recusado(val numero: Int) : Estado()
    data class Erro(val mensagem: String) : Estado()
}

/**
 * Laço principal: procura pedido pendente -> cobra na maquininha -> reporta ao
 * backend -> imprime a comanda. Serializado por Mutex (nunca 2 cobranças juntas).
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
                    val pendentes = backend.pendentes().filter { it.id !in processados }
                    if (pendentes.isNotEmpty()) processar(pendentes.first())
                } catch (e: Exception) {
                    Log.w(TAG, "loop: ${e.message}")
                }
                delay(3000)
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

        val res = try {
            withContext(Dispatchers.IO) { pagamento.cobrar(pedido.valorCentavos, tipo) }
        } catch (e: Exception) {
            Log.e(TAG, "cobrar falhou", e)
            reportar(pedido, aprovado = false, transacaoId = null, bandeira = null)
            _estado.value = Estado.Erro(e.message ?: "Falha na cobrança")
            volta()
            return@withLock
        }

        reportar(pedido, res.aprovado, res.transacaoId, res.bandeira)

        if (res.aprovado) {
            try {
                withContext(Dispatchers.IO) {
                    pagamento.imprimirComanda(Comanda.montar(pedido))
                }
            } catch (e: Exception) {
                Log.w(TAG, "impressão falhou: ${e.message}")
            }
            _estado.value = Estado.Aprovado(pedido.numeroPedido)
        } else {
            // recusado: libera pra nova tentativa
            processados.remove(pedido.id)
            _estado.value = Estado.Recusado(pedido.numeroPedido)
        }
        volta()
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

    private suspend fun volta() {
        delay(4000)
        if (_estado.value !is Estado.Cobrando) _estado.value = Estado.Aguardando
    }

    private companion object {
        const val TAG = "Orquestrador"
    }
}
