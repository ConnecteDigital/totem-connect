package br.com.connectdigital.totemtablet

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** Fala com o backend (Vercel). O token de dispositivo identifica o totem. */
object Api {
    private val http = OkHttpClient.Builder()
        .connectTimeout(6, TimeUnit.SECONDS)
        .callTimeout(10, TimeUnit.SECONDS)
        .build()

    /**
     * POST /api/totem/estado — registra sinal de vida/bateria e devolve o estado de tela que
     * o PDV pediu ("ligada" | "desligada"), ou null se a chamada falhou.
     */
    fun enviarEstado(bateria: Int, carregando: Boolean, tela: String): String? {
        val corpo = JSONObject()
            .put("bateria", bateria)
            .put("carregando", carregando)
            .put("tela", tela)
            .put("versao", BuildConfig.VERSION_NAME)
        val req = Request.Builder()
            .url("${BuildConfig.BASE_URL}/api/totem/estado")
            .header("x-device-token", BuildConfig.DEVICE_TOKEN)
            .post(corpo.toString().toRequestBody("application/json".toMediaType()))
            .build()
        http.newCall(req).execute().use { r ->
            if (!r.isSuccessful) return null
            val texto = r.body?.string() ?: return null
            return JSONObject(texto).optString("telaDesejada").ifBlank { null }
        }
    }
}
