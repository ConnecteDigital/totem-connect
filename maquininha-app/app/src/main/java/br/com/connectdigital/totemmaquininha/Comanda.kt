package br.com.connectdigital.totemmaquininha

import br.com.connectdigital.totemmaquininha.backend.PedidoPendente
import java.text.NumberFormat
import java.util.Locale

/** Monta o texto da comanda do cliente pra impressora da maquininha. */
object Comanda {

    private val brl = NumberFormat.getCurrencyInstance(Locale("pt", "BR"))

    fun montar(pedido: PedidoPendente, estabelecimento: String = "Hamburgueria Piloto"): String {
        val sb = StringBuilder()
        sb.appendLine(centro(estabelecimento))
        sb.appendLine(centro("Comprovante do pedido"))
        sb.appendLine(linha())
        sb.appendLine(centro("SENHA"))
        sb.appendLine(centro("#${pedido.numeroPedido}"))
        pedido.nomeCliente?.let { sb.appendLine(centro(it)) }
        sb.appendLine(linha())
        pedido.itens.forEach { it ->
            sb.appendLine("${it.quantidade}x ${it.nome}")
            it.adicionais.forEach { a -> sb.appendLine("  + $a") }
        }
        sb.appendLine(linha())
        sb.appendLine("TOTAL: ${brl.format(pedido.valorCentavos / 100.0)}")
        sb.appendLine(linha())
        sb.appendLine(centro("Obrigado!"))
        return sb.toString()
    }

    private fun centro(s: String, largura: Int = 32): String {
        if (s.length >= largura) return s
        val pad = (largura - s.length) / 2
        return " ".repeat(pad) + s
    }

    private fun linha(largura: Int = 32) = "-".repeat(largura)
}
