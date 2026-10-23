package br.com.connectdigital.totemmaquininha.pagamento

import android.content.Context
import android.util.Log
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPag
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagActivationData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagEventData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPaymentData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagTransactionResult
import br.com.uol.pagseguro.plugpagservice.wrapper.exception.PlugPagException
import br.com.uol.pagseguro.plugpagservice.wrapper.listeners.PlugPagPrintActionListener

/**
 * Implementação real com o PlugPagServiceWrapper (SmartPOS / Moderninha Smart 2).
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
 */
class PagamentoPlugPag(
    private val context: Context,
    private val activationCode: String,
) : Pagamento {

    private val plugpag by lazy {
        PlugPag(context).also { pp ->
            // O SDK, depois de autorizar, pergunta ao cliente na maquininha o que fazer com a via
            // (imprimir / SMS). Isso trava o resultado até alguém tocar — inaceitável num totem.
            // Aqui o app responde sozinho: sem comprovante na maquininha (a senha sai no totem).
            try {
                val rl = pp.setPrintActionListener(object : PlugPagPrintActionListener {
                    override fun onPrint(
                        phoneNumber: String?,
                        transactionResult: PlugPagTransactionResult?,
                        onFinishActions: PlugPagPrintActionListener.OnFinishPlugPagPrintActions?,
                    ) {
                        Log.i(TAG, "comprovante: respondendo doNothing (sem via na maquininha)")
                        onFinishActions?.doNothing(pp)
                    }

                    override fun onError(e: PlugPagException?) {
                        Log.w(TAG, "printAction erro: ${e?.message}")
                    }
                })
                Log.i(TAG, "setPrintActionListener -> result=${rl.result}")
                pp.setEventListener(object : br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagEventListener {
                    override fun onEvent(p0: PlugPagEventData) {
                        Log.i(TAG, "evento ${p0.eventCode}: ${p0.customMessage}")
                        if (p0.eventCode == PlugPagEventData.EVENT_CODE_SALE_APPROVED) {
                            // Aprovou: o serviço vai abrir a pergunta "via do cliente?" na maquininha.
                            // Respondemos sozinhos (5 = não fazer nada) pra o resultado não ficar preso.
                            Thread {
                                try {
                                    Thread.sleep(700)
                                    pp.doPrintAction(ACAO_NAO_FAZER_NADA, null)
                                    Log.i(TAG, "doPrintAction($ACAO_NAO_FAZER_NADA) enviado")
                                } catch (ex: Exception) {
                                    Log.w(TAG, "doPrintAction falhou: ${ex.message}")
                                }
                            }.start()
                        }
                    }
                })
            } catch (e: Exception) {
                Log.w(TAG, "listeners: ${e.message}")
            }
        }
    }
    private var ativado = false

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
        val res = plugpag.doPayment(dados)
        return ResultadoPagamento(
            aprovado = res.result == PlugPag.RET_OK,
            transacaoId = res.transactionId ?: res.transactionCode,
            bandeira = res.cardBrand,
            mensagem = res.message,
        )
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
        /** código do SDK: IPlugPagWrapper.doPrintAction(5) = doNothing (sem via do cliente) */
        const val ACAO_NAO_FAZER_NADA = 5
    }
}
