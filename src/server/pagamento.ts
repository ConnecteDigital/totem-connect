import { createServerFn } from '@tanstack/react-start'
import { criarSupabaseServidor } from '#/lib/supabase/server'
import { resolverEstabelecimentoTotem } from '#/server/_comum'

export type StatusPagamento = {
  status: string // status do pedido
  pagamento: 'pendente' | 'aprovado' | 'recusado' | null
  numeroPedido: number
}

/** Totem: consulta o andamento do pagamento (polling na tela "aguardando"). */
export const getStatusPedido = createServerFn({ method: 'GET' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<StatusPagamento> => {
    const supa = criarSupabaseServidor()
    const estId = await resolverEstabelecimentoTotem(supa)

    const { data: pedido, error } = await supa
      .from('pedidos')
      .select('status, numero_pedido, pagamentos ( status )')
      .eq('id', data.id)
      .eq('estabelecimento_id', estId)
      .maybeSingle()
    if (error) throw error
    if (!pedido) throw new Error('Pedido não encontrado.')

    const pgs = (pedido.pagamentos ?? []) as Array<{ status: string }>
    const ultimo = pgs[pgs.length - 1]?.status ?? null
    return {
      status: pedido.status,
      pagamento: (ultimo as StatusPagamento['pagamento']) ?? null,
      numeroPedido: pedido.numero_pedido,
    }
  })

/**
 * Concluído pela maquininha (app Smart 2) ou pelo simulador /dev/maquininha.
 * aprovado -> pedido vai pra 'em_preparo'. recusado -> volta a ficar pendente
 * pra outra tentativa (o totem oferece tentar de novo ou cancelar).
 */
export const confirmarPagamento = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      pedidoId: string
      resultado: 'aprovado' | 'recusado'
      transacaoId?: string | null
      bandeira?: string | null
      formaReal?: 'pix' | 'cartao_credito' | 'cartao_debito' | null
    }) => d,
  )
  .handler(async ({ data }) => {
    const supa = criarSupabaseServidor()
    const estId = await resolverEstabelecimentoTotem(supa)
    const agora = new Date().toISOString()

    const { data: pedido, error: e1 } = await supa
      .from('pedidos')
      .select('id, status')
      .eq('id', data.pedidoId)
      .eq('estabelecimento_id', estId)
      .maybeSingle()
    if (e1) throw e1
    if (!pedido) throw new Error('Pedido não encontrado.')
    if (pedido.status !== 'aguardando_pagamento') {
      // idempotente: já foi resolvido
      return { ok: true, status: pedido.status }
    }

    const aprovado = data.resultado === 'aprovado'

    const patchPag: Record<string, unknown> = {
      status: aprovado ? 'aprovado' : 'recusado',
      respondido_em: agora,
      transacao_id_maquininha: data.transacaoId ?? null,
      bandeira: data.bandeira ?? null,
    }
    if (data.formaReal) patchPag.forma_pagamento = data.formaReal

    const { error: e2 } = await supa
      .from('pagamentos')
      .update(patchPag)
      .eq('pedido_id', data.pedidoId)
    if (e2) throw e2

    if (aprovado) {
      const patch: Record<string, unknown> = { status: 'em_preparo', pago_em: agora }
      if (data.formaReal) patch.forma_pagamento = data.formaReal
      const { error: e3 } = await supa.from('pedidos').update(patch).eq('id', data.pedidoId)
      if (e3) throw e3
    }

    return { ok: true, status: aprovado ? 'em_preparo' : 'aguardando_pagamento' }
  })

/** Totem: cliente desistiu ou o tempo esgotou -> cancela o pedido. */
export const cancelarPagamento = createServerFn({ method: 'POST' })
  .validator((d: { pedidoId: string }) => d)
  .handler(async ({ data }) => {
    const supa = criarSupabaseServidor()
    const estId = await resolverEstabelecimentoTotem(supa)
    const agora = new Date().toISOString()

    const { data: pedido, error } = await supa
      .from('pedidos')
      .select('status')
      .eq('id', data.pedidoId)
      .eq('estabelecimento_id', estId)
      .maybeSingle()
    if (error) throw error
    if (!pedido) throw new Error('Pedido não encontrado.')
    if (pedido.status !== 'aguardando_pagamento') return { ok: true, status: pedido.status }

    await supa
      .from('pagamentos')
      .update({ status: 'recusado', respondido_em: agora })
      .eq('pedido_id', data.pedidoId)
    await supa
      .from('pedidos')
      .update({ status: 'cancelado', cancelado_em: agora })
      .eq('id', data.pedidoId)

    return { ok: true, status: 'cancelado' }
  })

/** Simulador /dev/maquininha: lista pagamentos pendentes do estabelecimento. */
export const listarPagamentosPendentes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const supa = criarSupabaseServidor()
    const estId = await resolverEstabelecimentoTotem(supa)

    const { data, error } = await supa
      .from('pedidos')
      .select('id, numero_pedido, nome_cliente, valor_total, forma_pagamento, criado_em')
      .eq('estabelecimento_id', estId)
      .eq('status', 'aguardando_pagamento')
      .order('criado_em', { ascending: true })
    if (error) throw error
    return data ?? []
  },
)
