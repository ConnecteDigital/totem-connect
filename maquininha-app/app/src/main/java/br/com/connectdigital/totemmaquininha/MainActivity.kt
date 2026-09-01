package br.com.connectdigital.totemmaquininha

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.Lifecycle
import br.com.connectdigital.totemmaquininha.backend.Backend
import br.com.connectdigital.totemmaquininha.databinding.ActivityMainBinding
import br.com.connectdigital.totemmaquininha.pagamento.Pagamento
import br.com.connectdigital.totemmaquininha.pagamento.PagamentoPlugPag
import br.com.connectdigital.totemmaquininha.pagamento.PagamentoSimulado
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var orquestrador: Orquestrador
    private val brl = NumberFormat.getCurrencyInstance(Locale("pt", "BR"))

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val pagamento: Pagamento = when (BuildConfig.PAGAMENTO_IMPL) {
            "PLUGPAG" -> PagamentoPlugPag(applicationContext, BuildConfig.ACTIVATION_CODE)
            else -> PagamentoSimulado()
        }

        orquestrador = Orquestrador(Backend(), pagamento, lifecycleScope)
        orquestrador.iniciar()

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                orquestrador.estado.collectLatest { render(it) }
            }
        }
    }

    private fun render(e: Estado) {
        val (titulo, detalhe) = when (e) {
            Estado.Iniciando -> "Iniciando…" to ""
            Estado.Aguardando -> "Aguardando pedido" to "Modo: ${BuildConfig.PAGAMENTO_IMPL}"
            is Estado.Cobrando -> "Cobrando #${e.numero}" to brl.format(e.valorCentavos / 100.0)
            is Estado.Aprovado -> "Aprovado" to "Pedido #${e.numero}"
            is Estado.Recusado -> "Recusado" to "Pedido #${e.numero} - tente de novo"
            is Estado.Erro -> "Erro" to e.mensagem
        }
        binding.estado.text = titulo
        binding.detalhe.text = detalhe
    }
}
