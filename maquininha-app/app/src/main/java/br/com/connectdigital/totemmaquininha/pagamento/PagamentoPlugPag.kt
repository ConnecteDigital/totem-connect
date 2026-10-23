package br.com.connectdigital.totemmaquininha.pagamento

import android.content.Context
import android.util.Log
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPag
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagActivationData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagEventData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagEventListener
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPaymentData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagTransactionResult
import br.com.uol.pagseguro.plugpagservice.wrapper.exception.PlugPagException
import br.com.uol.pagseguro.plugpagservice.wrapper.listeners.PlugPagPrintActionListener

/**
 * Implementação real com o PlugPagServiceWrapper (SmartPOS / Moderninha Smart 2 / Gertec GPOS780S).
 *
 * Assinaturas conferidas no SDK 1.35.0 (javap):
 *  - PlugPag(Context)
 *  - initializeAndActivatePinpad(PlugPagActivationData(codigo)) -> PlugPagInitializationResult
 *  - doPayment(PlugPagPaymentData(tipo, valorCentavos, tipoParcela, parcelas, referencia, imprimir))
 *      -> PlugPagTransactionResult (result, transactionId, transactionCode, cardBrand, message…)
 *  - abort()
 *  Tipos: TYPE_CREDITO=1, TYPE_DEBITO=2, TYPE_VOUCHER=3, TYPE_PIX=5; à vista: INSTALLMENT_TYPE_A_VISTA
 *
 * Regras já respeitadas:
 *  - `plugpag` é uma ÚNICA instância (lazy)
 *  - todos os métodos são `suspend` e o Orquestrador os chama em Dispatchers.IO
 *  - o Orquestrador serializa as chamadas (Mutex) -> nunca 2 pagamentos juntos
 *
 * PROBLEMA CONHECIDO (resolvido aqui): depois de aprovar, o serviço da PagBank abre na maquininha a
 * pergunta "via do cliente: imprimir / SMS / cancelar" (PLUGPAG_YNINPUT) e SEGURA o doPayment até
 * alguém tocar. Num totem isso trava o pedido. O app responde sozinho com doPrintAction(5 = não
 * fazer nada) — insistindo, porque o serviço às vezes está ocupado e recusa ("non occupiable").
 */
class PagamentoPlugPag(
    private val context: Context,
    private val activationCode: String,
) : Pagamento {

    private val plugpag by lazy {
        PlugPag(context).also { pp ->
            try {
                val rl = pp.setPrintActionListener(ouvinteComprovante(pp))
                Log.i(TAG, "setPrintActionListener -> result=${rl.result}")
                pp.setEventListener(object : PlugPagEventListener {
                    override fun onEvent(p0: PlugPagEventData) {
                        Log.i(TAG, "evento ${p0.eventCode}: ${p0.customMessage}")
                        if (p0.eventCode == PlugPagEventData.EVENT_CODE_SALE_APPROVED) {
                            responderComprovanteSemVia(pp)
                            val aviso = aoAutorizar
                            if (aviso != null) Thread { aviso() }.start()
                        }
                    }
                })
            } catch (e: Exception) {
                Log.w(TAG, "listeners: ${e.message}")
            }
        }
    }

    /** Ouvinte que responde sozinho à pergunta de comprovante (sem via na maquininha). */
    private fun ouvinteComprovante(pp: PlugPag) = object : PlugPagPrintActionListener {
        override fun onPrint(
            phoneNumber: String?,
            transactionResult: PlugPagTransactionResult?,
            onFinishActions: PlugPagPrintActionListener.OnFinishPlugPagPrintActions?,
        ) {
            Log.i(TAG, "onPrint DISPAROU: respondendo doNothing")
            onFinishActions?.doNothing(pp)
        }

        override fun onError(e: PlugPagException?) {
            Log.w(TAG, "printAction erro: ${e?.message}")
        }
    }

    private var ativado = false

    @Volatile
    private var aoAutorizar: (() -> Unit)? = null

    override fun definirAoAutorizar(callback: (() -> Unit)?) {
        aoAutorizar = callback
    }

    /** true enquanto um doPayment está em andamento (usado pelo laço que responde o comprovante). */
    @Volatile
    private var pagando = false

    private fun responderComprovanteSemVia(pp: PlugPag) {
        Thread {
            var n = 0
            while (pagando && n < MAX_TENTATIVAS) {
                try {
                    Thread.sleep(500)
                    if (!pagando) break
                    pp.doPrintAction(ACAO_NAO_FAZER_NADA, null)
                    Log.i(TAG, "doPrintAction($ACAO_NAO_FAZER_NADA) tentativa ${n + 1}")
                } catch (ex: Exception) {
                    Log.w(TAG, "doPrintAction falhou: ${ex.message}")
                }
                n++
            }
        }.start()
    }

    override suspend fun ativar() {
        if (ativado) return
        require(activationCode.isNotBlank()) { "ACTIVATION_CODE vazio (local.properties)" }
        val r = plugpag.initializeAndActivatePinpad(PlugPagActivationData(activationCode))
        if (r.result != PlugPag.RET_OK) {
            error("Falha na ativação: ${r.errorCode} ${r.errorMessage}")
        }
        ativado = true
        Log.i(TAG, "terminal ativado")
    }

    override suspend fun cobrar(valorCentavos: Long, tipo: TipoPagamento): ResultadoPagamento {
        ativar()
        // O registro do ouvinte pode expirar com o tempo: renova antes de cada cobrança.
        try {
            plugpag.setPrintActionListener(ouvinteComprovante(plugpag))
        } catch (e: Exception) {
            Log.w(TAG, "renovar ouvinte: ${e.message}")
        }
        pagando = true
        try {
            return cobrarInterno(valorCentavos, tipo)
        } finally {
            pagando = false
        }
    }

    private fun cobrarInterno(valorCentavos: Long, tipo: TipoPagamento): ResultadoPagamento {
        val tipoSdk = when (tipo) {
            TipoPagamento.CREDITO -> PlugPag.TYPE_CREDITO
            TipoPagamento.DEBITO -> PlugPag.TYPE_DEBITO
            TipoPagamento.PIX -> PlugPag.TYPE_PIX
        }
        val dados = PlugPagPaymentData(
            tipoSdk,
            valorCentavos.toInt(),
            PlugPag.INSTALLMENT_TYPE_A_VISTA,
            PlugPag.A_VISTA_INSTALLMENT_QUANTITY,
            "TOTEM",
            false, // printReceipt: a senha sai na impressora do totem. CONFIRMAR com a PagBank se exigem o comprovante do terminal
        )
        val antes = ultimaAprovada()?.transactionId
        val res = plugpag.doPayment(dados)
        Log.i(
            TAG,
            "resultado tipo=$tipoSdk result=${res.result} erro=${res.errorCode} " +
                "msg=${res.message} bandeira=${res.cardBrand} codigo=${res.transactionCode}",
        )
        if (res.result != PlugPag.RET_OK) {
            // Rede de segurança: a maquininha pode ter aprovado mesmo devolvendo erro (já aconteceu no
            // crédito). Se apareceu uma transação aprovada nova, é ela — nunca cobrar o cliente duas vezes.
            val nova = ultimaAprovada()
            if (nova?.transactionId != null && nova.transactionId != antes) {
                Log.w(TAG, "doPayment devolveu erro, mas há transação aprovada nova: ${nova.transactionId} (valor=${nova.amount})")
                return ResultadoPagamento(
                    aprovado = true,
                    transacaoId = nova.transactionId ?: nova.transactionCode,
                    bandeira = nova.cardBrand ?: res.cardBrand,
                    mensagem = nova.message,
                )
            }
        }
        return ResultadoPagamento(
            aprovado = res.result == PlugPag.RET_OK,
            transacaoId = res.transactionId ?: res.transactionCode,
            bandeira = res.cardBrand,
            mensagem = res.message,
        )
    }

    /** Última transação aprovada guardada no terminal (ou null se não houver / falhar). */
    private fun ultimaAprovada(): PlugPagTransactionResult? = try {
        val r = plugpag.getLastApprovedTransaction()
        if (r.result == PlugPag.RET_OK) r else null
    } catch (e: Exception) {
        Log.w(TAG, "ultimaAprovada: ${e.message}")
        null
    }

    override fun abortar() {
        try {
            plugpag.abort()
        } catch (e: Exception) {
            Log.w(TAG, "abortar: ${e.message}")
        }
    }

    private companion object {
        const val TAG = "PagamentoPlugPag"

        /** IPlugPagWrapper.doPrintAction(5) = doNothing (sem via do cliente) */
        const val ACAO_NAO_FAZER_NADA = 5
        const val MAX_TENTATIVAS = 40
    }
}
