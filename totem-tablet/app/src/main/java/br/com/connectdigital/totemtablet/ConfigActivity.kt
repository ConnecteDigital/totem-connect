package br.com.connectdigital.totemtablet

import android.app.Activity
import android.app.AlertDialog
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

/**
 * Ajustes do operador, protegidos por PIN (BuildConfig.PIN_OPERADOR). Aqui se liberam as 3
 * permissões que o Android exige e se pode sair do totem para as configurações do tablet.
 */
class ConfigActivity : Activity() {
    private lateinit var status: TextView
    private var liberado = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.decorView.setBackgroundColor(0xFF111111.toInt())

        val coluna = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(64, 48, 64, 48)
        }
        coluna.addView(texto("Ajustes do tablet — versão ${BuildConfig.VERSION_NAME}", 26f, 0xFFFF6A00.toInt()))
        status = texto("", 18f, 0xFFDDDDDD.toInt()).apply { setPadding(0, 24, 0, 24) }
        coluna.addView(status)

        coluna.addView(botao("1. Ativar administrador (apagar a tela pelo PDV)") {
            startActivity(
                Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
                    .putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, ComponentName(this, AdminReceiver::class.java))
                    .putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, getString(R.string.admin_explicacao)),
            )
        })
        coluna.addView(botao("2. Liberar uso de bateria (não deixar o Android fechar o app)") {
            try {
                startActivity(
                    Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                        .setData(Uri.parse("package:$packageName")),
                )
            } catch (e: Exception) {
                startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
            }
        })
        coluna.addView(botao("3. Definir como tela inicial do tablet") {
            startActivity(Intent(Settings.ACTION_HOME_SETTINGS))
        })
        coluna.addView(botao("4. Permitir a impressora USB") {
            // a caixa "permitir?" precisa da tela livre: pede em outra thread
            Thread {
                ImpressoraUsb(applicationContext).pedirPermissao()
                runOnUiThread { atualizarStatus() }
            }.start()
        })
        coluna.addView(botao("Ajustes do app (início automático, notificações)") {
            startActivity(
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).setData(Uri.parse("package:$packageName")),
            )
        })
        coluna.addView(botao("Configurações do Android (Wi-Fi etc.)") {
            startActivity(Intent(Settings.ACTION_SETTINGS))
        })
        coluna.addView(botao("Voltar ao totem") { finish() })

        setContentView(ScrollView(this).apply { addView(coluna) })
        coluna.visibility = View.INVISIBLE
        pedirPin(coluna)
    }

    private fun pedirPin(conteudo: View) {
        val campo = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
            gravity = Gravity.CENTER
        }
        AlertDialog.Builder(this)
            .setTitle("PIN do operador")
            .setView(campo)
            .setCancelable(false)
            .setPositiveButton("Entrar") { _, _ ->
                if (campo.text.toString() == BuildConfig.PIN_OPERADOR) {
                    liberado = true
                    conteudo.visibility = View.VISIBLE
                    atualizarStatus()
                } else {
                    finish()
                }
            }
            .setNegativeButton("Cancelar") { _, _ -> finish() }
            .show()
    }

    override fun onResume() {
        super.onResume()
        aberta = true
        if (liberado) atualizarStatus()
    }

    override fun onPause() {
        aberta = false
        super.onPause()
    }

    private fun atualizarStatus() {
        val dpm = getSystemService(DevicePolicyManager::class.java)
        val pm = getSystemService(PowerManager::class.java)
        val admin = dpm.isAdminActive(ComponentName(this, AdminReceiver::class.java))
        val bateria = pm.isIgnoringBatteryOptimizations(packageName)
        val home = packageManager.resolveActivity(
            Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), 0,
        )?.activityInfo?.packageName == packageName
        status.text = listOf(
            "Administrador do dispositivo: ${if (admin) "OK" else "FALTA"}",
            "Uso de bateria liberado: ${if (bateria) "OK" else "FALTA"}",
            "Tela inicial do tablet: ${if (home) "OK" else "FALTA"}",
            "Impressora USB: ${ImpressoraUsb(applicationContext).status()}",
        ).joinToString("\n")
    }

    companion object {
        /** Enquanto os Ajustes estão abertos, o serviço não apaga a tela (senão não dá pra configurar). */
        @Volatile
        var aberta = false
    }

    private fun texto(t: String, tamanho: Float, cor: Int) = TextView(this).apply {
        text = t
        textSize = tamanho
        setTextColor(cor)
    }

    private fun botao(t: String, acao: () -> Unit) = Button(this).apply {
        text = t
        isAllCaps = false
        setOnClickListener { acao() }
    }
}
