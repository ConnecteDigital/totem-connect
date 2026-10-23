package br.com.connectdigital.totemmaquininha.pagamento

import android.content.Context
import android.util.Log
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPag
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagActivationData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPaymentData

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

    private val plugpag by lazy { PlugPag(context) }
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
    }
}
