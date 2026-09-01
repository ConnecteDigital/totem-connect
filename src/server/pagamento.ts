import { createServerFn } from '@tanstack/react-start'
import { criarSupabaseServidor } from '#/lib/supabase/server'
import { resolverEstabelecimentoTotem } from '#/server/_comum'
import * as core from '#/server/pagamentoCore'

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
