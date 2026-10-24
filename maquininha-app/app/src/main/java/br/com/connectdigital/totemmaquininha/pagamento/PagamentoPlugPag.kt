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
                pp.setEventListener(ouvinteEventos(pp))
            } catch (e: Exception) {
                Log.w(TAG, "listeners: ${e.message}")
            }
        }
    }

    private fun ouvinteEventos(pp: PlugPag) = object : PlugPagEventListener {
        override fun onEvent(p0: PlugPagEventData) {
            Log.i(TAG, "evento ${p0.eventCode}: ${p0.customMessage}")
            motivoDoEvento(p0.eventCode)?.let { ultimoMotivo = it }
            if (p0.eventCode == PlugPagEventData.EVENT_CODE_INSERTED_CARD) cartaoDetectado = true
            if (p0.eventCode == PlugPagEventData.EVENT_CODE_SALE_APPROVED) {
                responderComprovanteSemVia(pp)
                val aviso = aoAutorizar
                Log.i(TAG, "autorizado: aviso ${if (aviso != null) "ligado" else "AUSENTE"}")
                if (aviso != null) Thread { aviso() }.start()
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

    /** Último evento de falha do terminal na cobrança atual (para explicar a recusa na tela). */
    @Volatile
    private var ultimoMotivo: String? = null

    private fun motivoDoEvento(codigo: Int): String? = when (codigo) {
        PlugPagEventData.EVENT_CODE_CONTACTLESS_ERROR ->
            "Erro de comunicação com o cartão. Aproxime de novo ou insira o cartão"
        PlugPagEventData.EVENT_CODE_USE_CHIP -> "Insira o cartão (chip)"
        PlugPagEventData.EVENT_CODE_USE_TARJA -> "Passe o cartão (tarja)"
        PlugPagEventData.EVENT_CODE_SALE_NOT_APPROVED -> "Pagamento não aprovado"
        else -> null
    }

    /** Texto para o cliente quando o doPayment não aprova: erro de comunicação x recusa do emissor. */
    private fun explicarFalha(result: Int, codigoErro: String?, mensagem: String?): String {
        val comunicacao = result == PlugPag.COMMUNICATION_ERROR || result == PlugPag.HOST_ERROR
        // M3011 / -1005 ("Transação não autorizada") é o que o terminal devolve quando a leitura do cartão
        // por aproximação falha (cartão longe ou tirado cedo); a recusa do emissor vem com outro código.
        val leitura = result == -1005 || codigoErro == "M3011"
        val base = when {
            leitura -> "Leitura do cartão não concluída. Aproxime bem de perto ou insira o cartão"
            comunicacao -> "Erro de comunicação. Tente de novo"
            !mensagem.isNullOrBlank() -> mensagem
            ultimoMotivo != null -> ultimoMotivo!!
            else -> "Pagamento não aprovado"
        }
        return if (codigoErro.isNullOrBlank() || codigoErro == PlugPag.ERROR_CODE_OK) base else "$base ($codigoErro)"
    }

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

    /**
     * Última transação aprovada que o terminal tinha ANTES da 1ª tentativa de cada pedido.
     * Se numa tentativa seguinte aparecer uma aprovada nova com o mesmo valor, o cliente já pagou:
     * não cobra de novo (evita "transação duplicada").
     */
    private val baseline = java.util.concurrent.ConcurrentHashMap<String, String>()

    override suspend fun cobrar(valorCentavos: Long, tipo: TipoPagamento, referencia: String): ResultadoPagamento {
        ativar()
        // O registro dos ouvintes pode expirar com o tempo: renova antes de cada cobrança.
        try {
            plugpag.setPrintActionListener(ouvinteComprovante(plugpag))
            plugpag.setEventListener(ouvinteEventos(plugpag))
        } catch (e: Exception) {
            Log.w(TAG, "renovar ouvintes: ${e.message}")
        }
        pagando = true
        ultimoMotivo = null
        cancelado = false
        reiniciando = false
        vigiarSessao(
            when (tipo) {
                TipoPagamento.CREDITO -> PlugPag.TYPE_CREDITO
                TipoPagamento.DEBITO -> PlugPag.TYPE_DEBITO
                TipoPagamento.PIX -> PlugPag.TYPE_PIX
            },
        )
        try {
            return cobrarInterno(valorCentavos, tipo, referencia)
        } finally {
            pagando = false
        }
    }

    private fun cobrarInterno(valorCentavos: Long, tipo: TipoPagamento, referencia: String): ResultadoPagamento {
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
        val ultima = ultimaAprovada()
        val base = if (referencia.isBlank()) (ultima?.transactionId ?: "") else baseline.getOrPut(referencia) { ultima?.transactionId ?: "" }
        Log.i(TAG, "cobrando ref=$referencia valor=$valorCentavos baseline=$base ultima=${ultima?.transactionId} (${ultima?.amount})")
        if (baseline.containsKey(referencia) && ultima?.transactionId != null && ultima.transactionId != base && valorConfere(ultima, valorCentavos)) {
            Log.w(TAG, "retentativa: o terminal já tem a aprovação ${ultima.transactionId} deste pedido — não cobra de novo")
            baseline.remove(referencia)
            return aprovadaDe(ultima, null)
        }
        val res = doPaymentRenovando(dados, tipoSdk)
        Log.i(
            TAG,
            "resultado tipo=$tipoSdk result=${res.result} erro=${res.errorCode} " +
                "msg=${res.message} bandeira=${res.cardBrand} codigo=${res.transactionCode}",
        )
        if (res.result != PlugPag.RET_OK) {
            // Rede de segurança: a maquininha pode ter aprovado mesmo devolvendo erro (já aconteceu no
            // crédito). Se apareceu uma transação aprovada nova, é ela — nunca cobrar o cliente duas vezes.
            val nova = ultimaAprovada()
            Log.i(TAG, "pós-erro: ultimaAprovada=${nova?.transactionId} (${nova?.amount}) baseline=$base")
            if (nova?.transactionId != null && nova.transactionId != base && valorConfere(nova, valorCentavos)) {
                Log.w(TAG, "doPayment devolveu erro, mas há transação aprovada nova: ${nova.transactionId} (valor=${nova.amount})")
                baseline.remove(referencia)
                return aprovadaDe(nova, res.cardBrand)
            }
        }
        val aprovado = res.result == PlugPag.RET_OK
        if (aprovado) baseline.remove(referencia)
        return ResultadoPagamento(
            aprovado = aprovado,
            transacaoId = res.transactionId ?: res.transactionCode,
            bandeira = res.cardBrand,
            mensagem = if (aprovado) res.message else explicarFalha(res.result ?: PlugPag.UNKNOWN_ERROR_CODE, res.errorCode, res.message),
        )
    }

    private fun aprovadaDe(r: PlugPagTransactionResult, bandeiraAlt: String?) = ResultadoPagamento(
        aprovado = true,
        transacaoId = r.transactionId ?: r.transactionCode,
        bandeira = r.cardBrand ?: bandeiraAlt,
        mensagem = r.message,
    )

    /** O valor da transação do terminal é o do pedido? (se o terminal não informar o valor, aceita) */
    private fun valorConfere(r: PlugPagTransactionResult, valorCentavos: Long): Boolean {
        val v = r.amount?.filter { it.isDigit() }?.toLongOrNull() ?: return true
        return v == valorCentavos
    }

    /** Última transação aprovada guardada no terminal (ou null se não houver / falhar). */
    private fun ultimaAprovada(): PlugPagTransactionResult? = try {
        val r = plugpag.getLastApprovedTransaction()
        if (r.result == PlugPag.RET_OK) r else null
    } catch (e: Exception) {
        Log.w(TAG, "ultimaAprovada: ${e.message}")
        null
    }

    /** O totem cancelou (ou venceu o tempo): o laço de renovação não deve recomeçar. */
    @Volatile
    private var cancelado = false

    /** O cliente encostou/inseriu o cartão nesta sessão (o terminal já está lendo). */
    @Volatile
    private var cartaoDetectado = false

    /** Reinício feito pelo próprio app (não é cancelamento do cliente). */
    @Volatile
    private var reiniciando = false

    /**
     * Em crédito/débito, se o cartão não chega em [REINICIO_MS], reinicia a sessão do terminal.
     * Observado no piloto: depois de ~1 min esperando, o leitor NFC não lê mais o cartão (erro M3011/
     * "não autorizada"); aproximar logo no começo da sessão sempre aprova. Recomeçar mantém o leitor "fresco".
     */
    private fun doPaymentRenovando(dados: PlugPagPaymentData, tipoSdk: Int): PlugPagTransactionResult {
        var res = plugpag.doPayment(dados)
        if (tipoSdk == PlugPag.TYPE_PIX) return res
        var voltas = 0
        while (voltas < MAX_REINICIOS && reiniciando && !cancelado && res.result != PlugPag.RET_OK) {
            voltas++
            reiniciando = false
            Log.i(TAG, "reiniciando a sessão do terminal (volta $voltas)")
            try {
                Thread.sleep(800)
            } catch (_: InterruptedException) {
            }
            res = plugpag.doPayment(dados)
        }
        return res
    }

    private fun vigiarSessao(tipoSdk: Int) {
        if (tipoSdk == PlugPag.TYPE_PIX) return
        Thread {
            while (pagando && !cancelado) {
                cartaoDetectado = false
                val inicio = System.currentTimeMillis()
                while (pagando && !cancelado && !cartaoDetectado &&
                    System.currentTimeMillis() - inicio < REINICIO_MS
                ) {
                    try {
                        Thread.sleep(500)
                    } catch (_: InterruptedException) {
                    }
                }
                if (!pagando || cancelado || cartaoDetectado) {
                    // cartão chegou (ou acabou): se foi só o cartão, espera esta sessão terminar
                    while (pagando && !cancelado && cartaoDetectado) {
                        try {
                            Thread.sleep(500)
                        } catch (_: InterruptedException) {
                        }
                    }
                    if (!pagando || cancelado) return@Thread
                    continue
                }
                Log.i(TAG, "sem cartão há ${REINICIO_MS / 1000}s: abortando para reiniciar a sessão")
                reiniciando = true
                try {
                    plugpag.abort()
                } catch (e: Exception) {
                    Log.w(TAG, "reinício: ${e.message}")
                }
                try {
                    Thread.sleep(2500) // deixa o doPayment devolver e o laço recomeçar
                } catch (_: InterruptedException) {
                }
            }
        }.start()
    }

    override fun abortar() {
        cancelado = true
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

        /** Sem cartão por este tempo, reinicia a sessão do terminal (leitor NFC "esfria" depois de ~1 min). */
        const val REINICIO_MS = 30_000L
        const val MAX_REINICIOS = 12
    }
}
