import { createServerFn } from '@tanstack/react-start'
import { criarSupabaseServidor } from '#/lib/supabase/server'
import { resolverEstabelecimentoTotem } from '#/server/_comum'
import * as core from '#/server/pagamentoCore'
import { pagamentoProvedor } from '#/lib/config'
import { cieloSandbox, simularPagamentoCielo } from '#/server/cielo'

/** Totem: consulta o andamento do pagamento (polling na tela "aguardando"). */
export const getStatusPedido = createServerFn({ method: 'GET' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supa = criarSupabaseServidor()
    const estId = await resolverEstabelecimentoTotem(supa)
    return core.statusPedido(estId, data.id)
  })

/** Concluído pela maquininha (app Smart 2) ou pelo simulador /dev/maquininha. */
export const confirmarPagamento = createServerFn({ method: 'POST' })
  .validator((d: core.ResultadoConfirmacao) => d)
  .handler(async ({ data }) => {
    const supa = criarSupabaseServidor()
    const estId = await resolverEstabelecimentoTotem(supa)
    return core.confirmarPagamento(estId, data)
  })

/** Totem: cliente desistiu ou o tempo esgotou -> cancela o pedido. */
export const cancelarPagamento = createServerFn({ method: 'POST' })
  .validator((d: { pedidoId: string }) => d)
  .handler(async ({ data }) => {
    const supa = criarSupabaseServidor()
    const estId = await resolverEstabelecimentoTotem(supa)
    return core.cancelarPagamento(estId, data.pedidoId)
  })

/** Simulador /dev/maquininha: lista pagamentos pendentes do estabelecimento. */
export const listarPagamentosPendentes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const supa = criarSupabaseServidor()
    const estId = await resolverEstabelecimentoTotem(supa)
    return core.listarPendentes(estId)
  },
)

/**
 * Teste (sandbox da Cielo): paga o pedido PELO caminho da Cielo — cria uma transação
 * simulada lá, e o totem percebe pela consulta de status, como será com a maquininha.
 * Só funciona com PAGAMENTO_PROVEDOR=cielo e CIELO_AMBIENTE != producao.
 */
export const simularPagamentoCieloSandbox = createServerFn({ method: 'POST' })
  .validator((d: { pedidoId: string }) => d)
  .handler(async ({ data }) => {
    if (pagamentoProvedor() !== 'cielo' || !cieloSandbox()) {
      throw new Error('Disponível só com a Cielo em modo sandbox.')
    }
    const supa = criarSupabaseServidor()
    const estId = await resolverEstabelecimentoTotem(supa)
    const { data: pedido } = await supa
      .from('pedidos')
      .select('id')
      .eq('id', data.pedidoId)
      .eq('estabelecimento_id', estId)
      .maybeSingle()
    if (!pedido) throw new Error('Pedido não encontrado.')
    const { data: pg } = await supa
      .from('pagamentos')
      .select('valor, provedor_pedido_id')
      .eq('pedido_id', data.pedidoId)
      .maybeSingle()
    if (!pg?.provedor_pedido_id) throw new Error('Pedido sem id da Cielo.')
    await simularPagamentoCielo(pg.provedor_pedido_id, Math.round(Number(pg.valor) * 100))
    return { ok: true }
  })
