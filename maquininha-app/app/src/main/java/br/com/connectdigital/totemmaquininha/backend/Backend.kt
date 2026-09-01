package br.com.connectdigital.totemmaquininha.backend

import br.com.connectdigital.totemmaquininha.BuildConfig
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class PedidoPendente(
    val id: String,
    val numeroPedido: Int,
    val nomeCliente: String?,
    val valorCentavos: Long,
    val forma: String?,          // "pix" | "cartao_credito" | "cartao_debito"
    val itens: List<ItemPendente>,
)

data class ItemPendente(
    val nome: String,
    val quantidade: Int,
    val adicionais: List<String>,
)

/**
 * Cliente do backend Totem Connect.
 * Hoje: polling em /api/maquininha/pendentes. Depois pode virar Realtime (WebSocket
 * do Supabase) mantendo a mesma interface.
 */
class Backend(
    private val baseUrl: String = BuildConfig.BASE_URL,
    private val deviceToken: String = BuildConfig.DEVICE_TOKEN,
) {
    private val http = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    private val jsonType = "application/json; charset=utf-8".toMediaType()

    /** Lê os pedidos aguardando pagamento. */
    fun pendentes(): List<PedidoPendente> {
        val req = Request.Builder()
            .url("$baseUrl/api/maquininha/pendentes")
            .header("x-device-token", deviceToken)
            .get()
            .build()

        http.newCall(req).execute().use { resp ->
            val body = resp.body?.string().orEmpty()
            if (!resp.isSuccessful) error("pendentes HTTP ${resp.code}: $body")
            val arr = JSONObject(body).optJSONArray("pendentes") ?: JSONArray()
            return (0 until arr.length()).map { i -> parsePendente(arr.getJSONObject(i)) }
        }
    }

    /** Reporta o resultado da cobrança. */
    fun confirmar(
        pedidoId: String,
        aprovado: Boolean,
        transacaoId: String?,
        bandeira: String?,
        formaReal: String?,
    ) {
        val payload = JSONObject().apply {
            put("pedidoId", pedidoId)
            put("resultado", if (aprovado) "aprovado" else "recusado")
            put("transacaoId", transacaoId ?: JSONObject.NULL)
            put("bandeira", bandeira ?: JSONObject.NULL)
            put("formaReal", formaReal ?: JSONObject.NULL)
        }
        val req = Request.Builder()
            .url("$baseUrl/api/maquininha/confirmar")
            .header("x-device-token", deviceToken)
            .post(payload.toString().toRequestBody(jsonType))
            .build()

        http.newCall(req).execute().use { resp ->
            val body = resp.body?.string().orEmpty()
            if (!resp.isSuccessful) error("confirmar HTTP ${resp.code}: $body")
        }
    }

    private fun parsePendente(o: JSONObject): PedidoPendente {
        val itensArr = o.optJSONArray("pedido_itens") ?: JSONArray()
        val itens = (0 until itensArr.length()).map { i ->
            val it = itensArr.getJSONObject(i)
            val addArr = it.optJSONArray("pedido_item_adicionais") ?: JSONArray()
            ItemPendente(
                nome = it.optString("produto_nome"),
                quantidade = it.optInt("quantidade", 1),
                adicionais = (0 until addArr.length()).map { j ->
                    addArr.getJSONObject(j).optString("adicional_nome")
                },
            )
        }
        val valorReais = o.optDouble("valor_total", 0.0)
        return PedidoPendente(
            id = o.getString("id"),
            numeroPedido = o.optInt("numero_pedido"),
            nomeCliente = o.optString("nome_cliente").ifBlank { null },
            valorCentavos = Math.round(valorReais * 100),
            forma = o.optString("forma_pagamento").ifBlank { null },
            itens = itens,
        )
    }
}
