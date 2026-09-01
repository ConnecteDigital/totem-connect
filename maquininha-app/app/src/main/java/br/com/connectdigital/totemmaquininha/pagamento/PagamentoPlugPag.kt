package br.com.connectdigital.totemmaquininha.pagamento

import android.content.Context
import android.util.Log

/**
 * Implementação real com o PlugPagServiceWrapper (SmartPOS / Moderninha Smart 2).
 *
 * ============================ COMO COMPLETAR ============================
 * 1. settings.gradle.kts  -> descomentar o maven do PlugPagServiceWrapper
 * 2. app/build.gradle.kts  -> descomentar a dependência `wrapper:1.35.x`
 * 3. Preencher os TODO abaixo com as assinaturas reais do SDK. Referência:
 *    - app de exemplo "SmartCoffee" da PagBank
 *    - https://github.com/pagseguro/pagseguro-sdk-plugpagservicewrapper
 *    Classes esperadas: PlugPag, PlugPagActivationData, PlugPagPaymentData,
 *      PlugPagPrinterData, PlugPagPrintResult, PlugPagTransactionResult
 *    Métodos: initializeAndActivatePinpad(activationData), doPayment(paymentData),
 *      printFromFile(printerData) ou print(...), abort()
 *    Constantes de tipo (confirmar no SDK):
 *      TYPE_CREDITO = 1, TYPE_DEBITO = 2, TYPE_VOUCHER = 3, TYPE_PIX = 5
 *    Constantes de parcela: INSTALLMENT_TYPE_A_VISTA = 1
 * ======================================================================
 *
 * Regras já respeitadas:
 *  - `plugpag` é uma ÚNICA instância (lazy, guardada aqui)
 *  - todos os métodos são `suspend` e o Orquestrador os chama em Dispatchers.IO
 *  - o Orquestrador serializa as chamadas (Mutex) -> nunca 2 pagamentos juntos
 */
class PagamentoPlugPag(
    private val context: Context,
    private val activationCode: String,
) : Pagamento {

    // TODO: trocar Any pela instância real:  private val plugpag by lazy { PlugPag(context) }
    private val plugpag: Any? by lazy { criarPlugPag() }
    private var ativado = false

    private fun criarPlugPag(): Any? {
        // TODO: return PlugPag(context)
        Log.w(TAG, "PlugPag ainda não integrado — preencha PagamentoPlugPag.kt")
        return null
    }

    override suspend fun ativar() {
        if (ativado) return
        require(activationCode.isNotBlank()) { "ACTIVATION_CODE vazio (local.properties)" }
        // TODO:
        // val data = PlugPagActivationData(activationCode)
        // val r = (plugpag as PlugPag).initializeAndActivatePinpad(data)
        // if (r.result != PlugPag.RET_OK) error("Falha na ativação: ${r.errorCode} ${r.errorMessage}")
        ativado = true
        Log.i(TAG, "ativar(): TODO integrar SDK")
    }

    override suspend fun cobrar(valorCentavos: Long, tipo: TipoPagamento): ResultadoPagamento {
        ativar()
        // val tipoSdk = when (tipo) {
        //     TipoPagamento.CREDITO -> PlugPag.TYPE_CREDITO   // 1
        //     TipoPagamento.DEBITO  -> PlugPag.TYPE_DEBITO    // 2
        //     TipoPagamento.PIX     -> PlugPag.TYPE_PIX       // 5
        // }
        // val pagamento = PlugPagPaymentData(
        //     type = tipoSdk,
        //     amount = valorCentavos.toInt(),
        //     installmentType = PlugPag.INSTALLMENT_TYPE_A_VISTA,
        //     installments = 1,
        //     userReference = "TOTEM",
        //     printReceipt = false,   // a comanda a gente imprime depois, com layout próprio
        // )
        // val res: PlugPagTransactionResult = (plugpag as PlugPag).doPayment(pagamento)
        // return ResultadoPagamento(
        //     aprovado = res.result == PlugPag.RET_OK,
        //     transacaoId = res.transactionId ?: res.transactionCode,
        //     bandeira = res.cardBrand,
        //     mensagem = res.message,
        // )
        throw NotImplementedError("PagamentoPlugPag.cobrar — integrar o SDK PagBank")
    }

    override suspend fun imprimirComanda(texto: String) {
        // Opção 1: gerar um bitmap/arquivo do texto e usar printFromFile(PlugPagPrinterData(path, ...))
        // Opção 2: usar a API de impressão de texto do wrapper, se disponível
        // val printer = PlugPagPrinterData(filePath = arquivoDoTexto(texto), printerQuality = 4, step = 0)
        // (plugpag as PlugPag).printFromFile(printer)
        throw NotImplementedError("PagamentoPlugPag.imprimirComanda — integrar impressão do SDK")
    }

    override fun abortar() {
        // (plugpag as? PlugPag)?.abort()
        Log.i(TAG, "abortar(): TODO integrar SDK")
    }

    private companion object {
        const val TAG = "PagamentoPlugPag"
    }
}
