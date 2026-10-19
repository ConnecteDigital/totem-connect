package br.com.connectdigital.totemtablet

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import java.lang.ref.WeakReference

/** Tela cheia do totem: um WebView em /totem, sem barra, sem sair do app. */
class MainActivity : Activity() {
    private lateinit var web: WebView
    private val h = Handler(Looper.getMainLooper())
    private val urlTotem = "${BuildConfig.BASE_URL}/totem"
    private val host = Uri.parse(BuildConfig.BASE_URL).host

    @SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        instancia = WeakReference(this)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }

        web = WebView(this).apply {
            overScrollMode = View.OVER_SCROLL_NEVER
            isHapticFeedbackEnabled = false
            setOnLongClickListener { true }
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                mediaPlaybackRequiresUserGesture = false
                setSupportZoom(false)
                builtInZoomControls = false
                cacheMode = WebSettings.LOAD_DEFAULT
            }
            addJavascriptInterface(Ponte(), "TotemNativo")
            webViewClient = ClienteWeb()
        }
        setContentView(web)
        esconderBarras()

        startForegroundService(Intent(this, ControleService::class.java))
        carregar()
    }

    /** Recomeça pela tela inicial do totem (também usado ao acordar a tela). */
    fun carregar() {
        h.removeCallbacks(tentarDeNovo)
        web.loadUrl(urlTotem)
    }

    private val tentarDeNovo = Runnable { carregar() }

    @Suppress("DEPRECATION")
    private fun esconderBarras() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            )
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) esconderBarras()
    }

    /** Botão voltar não faz nada: cliente não sai do totem. */
    @Suppress("OVERRIDE_DEPRECATION")
    override fun onBackPressed() {}

    override fun onDestroy() {
        h.removeCallbacksAndMessages(null)
        if (instancia?.get() === this) instancia = null
        web.destroy()
        super.onDestroy()
    }

    /** Chamada pelo JavaScript da página (só existe dentro deste app). */
    inner class Ponte {
        @JavascriptInterface
        fun abrirConfig() {
            runOnUiThread { startActivity(Intent(this@MainActivity, ConfigActivity::class.java)) }
        }

        @JavascriptInterface
        fun versao(): String = BuildConfig.VERSION_NAME
    }

    private inner class ClienteWeb : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
            request.url.host != host // nunca sai do domínio do totem

        override fun onReceivedError(
            view: WebView,
            request: WebResourceRequest,
            error: WebResourceError,
        ) {
            if (!request.isForMainFrame) return
            view.loadDataWithBaseURL(null, HTML_SEM_CONEXAO, "text/html", "utf-8", null)
            h.removeCallbacks(tentarDeNovo)
            h.postDelayed(tentarDeNovo, 5_000)
        }

        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            recreate() // o processo do WebView morreu: sobe outro
            return true
        }
    }

    companion object {
        private var instancia: WeakReference<MainActivity>? = null

        /** Chamado pelo serviço quando a tela é ligada pelo PDV. */
        fun recarregar() {
            Handler(Looper.getMainLooper()).post { instancia?.get()?.carregar() }
        }

        private const val HTML_SEM_CONEXAO = """
            <html><body style="margin:0;background:#0b0b0b;color:#fff;font-family:sans-serif;
            display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">
            <div><div style="font-size:48px;color:#ff6a00;font-weight:700">Sem conexão</div>
            <div style="font-size:24px;margin-top:12px;color:#aaa">Tentando reconectar…</div></div>
            </body></html>
        """
    }
}
