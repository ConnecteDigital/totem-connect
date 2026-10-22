package br.com.connectdigital.totemtablet

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Impressora térmica USB (classe 7 "printer") ligada no tablet pelo USB host do Android.
 * Recebe os bytes ESC/POS já prontos (o site monta a comanda) e os manda pelo endpoint bulk OUT.
 * O WebView não tem WebUSB, por isso esta ponte existe.
 */
class ImpressoraUsb(private val contexto: Context) {
    private val usb = contexto.getSystemService(Context.USB_SERVICE) as UsbManager

    private fun interfaceDeImpressora(d: UsbDevice): UsbInterface? =
        (0 until d.interfaceCount)
            .map { d.getInterface(it) }
            .firstOrNull { it.interfaceClass == UsbConstants.USB_CLASS_PRINTER }

    fun encontrar(): UsbDevice? =
        usb.deviceList.values.firstOrNull { interfaceDeImpressora(it) != null }

    /** Texto curto para a tela do operador. */
    fun status(): String {
        val d = encontrar() ?: return "nenhuma impressora USB encontrada"
        val ids = "%04x:%04x".format(d.vendorId, d.productId)
        val perm = if (usb.hasPermission(d)) "permitida" else "SEM permissão"
        return "${d.productName ?: "impressora"} ($ids) — $perm"
    }

    /** Pede a permissão ao Android (abre a caixa "permitir?"). true se concedida. */
    fun pedirPermissao(): Boolean {
        val d = encontrar() ?: return false
        return garantirPermissao(d)
    }

    private fun garantirPermissao(d: UsbDevice): Boolean {
        if (usb.hasPermission(d)) return true
        val trava = CountDownLatch(1)
        val receptor = object : BroadcastReceiver() {
            override fun onReceive(c: Context, i: Intent) {
                trava.countDown()
            }
        }
        contexto.registerReceiver(receptor, IntentFilter(ACAO_PERMISSAO))
        try {
            val pi = PendingIntent.getBroadcast(
                contexto,
                0,
                Intent(ACAO_PERMISSAO).setPackage(contexto.packageName),
                PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
            usb.requestPermission(d, pi)
            trava.await(30, TimeUnit.SECONDS)
        } finally {
            contexto.unregisterReceiver(receptor)
        }
        return usb.hasPermission(d)
    }

    /** Envia os bytes pra impressora. Devolve "ok" ou a mensagem do erro. */
    @Synchronized
    fun imprimir(bytes: ByteArray): String {
        val d = encontrar() ?: return "Impressora USB não encontrada (cabo e hub conectados?)"
        if (!garantirPermissao(d)) return "Sem permissão para usar a impressora USB"
        val intf = interfaceDeImpressora(d) ?: return "Interface de impressora não encontrada"
        val saida = (0 until intf.endpointCount)
            .map { intf.getEndpoint(it) }
            .firstOrNull {
                it.direction == UsbConstants.USB_DIR_OUT && it.type == UsbConstants.USB_ENDPOINT_XFER_BULK
            } ?: return "A impressora não tem entrada de dados (endpoint bulk OUT)"
        val conexao = usb.openDevice(d) ?: return "Não consegui abrir a impressora USB"
        try {
            if (!conexao.claimInterface(intf, true)) return "Não consegui reservar a interface da impressora"
            var enviado = 0
            while (enviado < bytes.size) {
                val n = minOf(TAM_PACOTE, bytes.size - enviado)
                val r = conexao.bulkTransfer(saida, bytes, enviado, n, 5_000)
                if (r < 0) return "Falha ao enviar para a impressora (erro $r)"
                enviado += r
            }
            return "ok"
        } finally {
            conexao.releaseInterface(intf)
            conexao.close()
        }
    }

    private companion object {
        const val ACAO_PERMISSAO = "br.com.connectdigital.totemtablet.USB_PERMISSAO"
        const val TAM_PACOTE = 4096
    }
}
