package br.com.connectdigital.totemtablet

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Tablet ligou (ou o app foi atualizado): sobe o serviço de controle. A tela do totem em si é
 * aberta pelo Android, porque o app é a "tela inicial" (HOME).
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        context.startForegroundService(Intent(context, ControleService::class.java))
    }
}
