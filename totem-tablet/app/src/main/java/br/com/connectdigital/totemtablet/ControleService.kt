package br.com.connectdigital.totemtablet

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Serviço em primeiro plano. A cada 10s:
 *  - manda bateria + estado da tela pro backend (o PDV mostra online/bateria)
 *  - recebe do backend se a tela deve estar ligada/desligada e aplica
 */
class ControleService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var laco: Job? = null
    private var acordando: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(ID_NOTIF, notificacao())
        if (laco?.isActive != true) {
            // CPU ligada mesmo com a tela apagada, senão o comando de "ligar" nunca chegaria
            val pm = getSystemService(PowerManager::class.java)
            pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "totem:controle").apply {
                setReferenceCounted(false)
                acquire()
            }
            laco = scope.launch {
                while (isActive) {
                    try {
                        ciclo()
                    } catch (e: Exception) {
                        Log.w(TAG, "ciclo: ${e.message}")
                    }
                    delay(INTERVALO_MS)
                }
            }
        }
        return START_STICKY
    }

    private fun ciclo() {
        val pm = getSystemService(PowerManager::class.java)
        val ligada = pm.isInteractive
        val (pct, carregando) = bateria()
        val desejada = Api.enviarEstado(pct, carregando, if (ligada) "ligada" else "desligada")
            ?: return

        when {
            desejada == "desligada" && ligada -> apagarTela()
            desejada == "ligada" && !ligada -> acenderTela(pm)
        }
    }

    private fun apagarTela() {
        val dpm = getSystemService(DevicePolicyManager::class.java)
        val admin = ComponentName(this, AdminReceiver::class.java)
        if (dpm.isAdminActive(admin)) {
            dpm.lockNow()
        } else {
            Log.w(TAG, "Sem permissão de administrador — não dá pra apagar a tela (abra os Ajustes do app)")
        }
    }

    @Suppress("DEPRECATION")
    private fun acenderTela(pm: PowerManager) {
        acordando?.takeIf { it.isHeld }?.release()
        acordando = pm.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
            "totem:acordar",
        ).also { it.acquire(8_000) }

        // Recomeça o totem do zero pro próximo cliente
        MainActivity.recarregar()
        try {
            startActivity(
                Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        } catch (e: Exception) {
            Log.w(TAG, "abrir tela: ${e.message}")
        }
    }

    private fun bateria(): Pair<Int, Boolean> {
        val i = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val nivel = i?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val escala = i?.getIntExtra(BatteryManager.EXTRA_SCALE, 100) ?: 100
        val status = i?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val pct = if (nivel < 0) -1 else nivel * 100 / escala
        val carregando = status == BatteryManager.BATTERY_STATUS_CHARGING ||
            status == BatteryManager.BATTERY_STATUS_FULL
        return pct to carregando
    }

    private fun notificacao(): Notification {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CANAL, "Totem", NotificationManager.IMPORTANCE_MIN),
        )
        return Notification.Builder(this, CANAL)
            .setContentTitle("Totem ativo")
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        laco?.cancel()
        super.onDestroy()
    }

    private companion object {
        const val TAG = "ControleService"
        const val CANAL = "totem_controle"
        const val ID_NOTIF = 1
        const val INTERVALO_MS = 10_000L
    }
}
