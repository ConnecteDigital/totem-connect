package br.com.connectdigital.totemmaquininha.pagamento

enum class TipoPagamento { CREDITO, DEBITO, PIX }

data class ResultadoPagamento(
    val aprovado: Boolean,
    val transacaoId: String? = null,
    val bandeira: String? = null,
    val mensagem: String? = null,
)

/**
 * Contrato de pagamento. Duas implementações:
 *  - [PagamentoSimulado]  -> roda em qualquer aparelho, sem SDK (testes)
 *  - [PagamentoPlugPag]   -> usa o PlugPagServiceWrapper na Moderninha Smart 2
 *
 * A senha/comanda do cliente NÃO sai aqui: é impressa pelo próprio totem (impressora USB).
 *
 * Regras do SDK PagBank já refletidas aqui:
 *  - uma única instância viva por processo (a impl guarda o PlugPag como singleton)
 *  - TODAS as chamadas devem rodar em background (o chamador usa Dispatchers.IO)
 *  - nunca disparar [cobrar]/[estornar] de novo antes do anterior terminar
 *    (o Orquestrador serializa com um Mutex)
 */
interface Pagamento {

    /** Ativa o terminal (idempotente). Chamar uma vez ao subir o app. */
    suspend fun ativar()

    /** Executa a cobrança. Bloqueante até o cliente concluir na maquininha. */
    suspend fun cobrar(valorCentavos: Long, tipo: TipoPagamento): ResultadoPagamento

    /** Aborta uma cobrança em andamento (ex: timeout do totem). */
    fun abortar()
}
