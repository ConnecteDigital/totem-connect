package br.com.connectdigital.totemmaquininha.pagamento

import android.util.Log
import kotlinx.coroutines.delay

/** Aprova depois de alguns segundos. Não fala com hardware nenhum. */
class PagamentoSimulado : Pagamento {

    override suspend fun ativar() {
        Log.i(TAG, "ativar() simulado")
    }

    override suspend fun cobrar(valorCentavos: Long, tipo: TipoPagamento): ResultadoPagamento {
        Log.i(TAG, "cobrar() simulado: $valorCentavos centavos, $tipo")
        delay(4000)
        return ResultadoPagamento(
            aprovado = true,
            transacaoId = "SIM-${System.currentTimeMillis()}",
            bandeira = "SIMULADO",
            mensagem = "Pagamento simulado aprovado",
        )
    }

    override suspend fun imprimirComanda(texto: String) {
        Log.i(TAG, "imprimirComanda() simulado:\n$texto")
    }

    override fun abortar() {
        Log.i(TAG, "abortar() simulado")
    }

    private companion object {
        const val TAG = "PagamentoSimulado"
    }
}
