import { criarSupabaseServidor } from '#/lib/supabase/server'

/**
 * Lógica de pagamento compartilhada entre as server functions (web: totem,
 * simulador) e as rotas de API da maquininha (app Kotlin da Smart 2).
 * Já recebe o estabelecimento resolvido.
 */

export type ResultadoConfirmacao = {
  pedidoId: string
  resultado: 'aprovado' | 'recusado'
  transacaoId?: string | null
  bandeira?: string | null
  formaReal?: 'pix' | 'cartao_credito' | 'cartao_debito' | null
}

export async function listarPendentes(estabelecimentoId: string) {
  const supa = criarSupabaseServidor()
  const { data, error } = await supa
    .from('pedidos')
    .select(
      `id, numero_pedido, nome_cliente, valor_total, forma_pagamento, criado_em,
       pedido_itens ( produto_nome, quantidade,
         pedido_item_adicionais ( adicional_nome ) )`,
    )
    .eq('estabelecimento_id', estabelecimentoId)
    .eq('status', 'aguardando_pagamento')
    .order('criado_em', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function statusPedido(estabelecimentoId: string, id: string) {
  const supa = criarSupabaseServidor()
  const { data, error } = await supa
    .from('pedidos')
    .select('status, numero_pedido, pagamentos ( status )')
    .eq('id', id)
    .eq('estabelecimento_id', estabelecimentoId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Pedido não encontrado.')
  const pgs = (data.pagamentos ?? []) as Array<{ status: string }>
  return {
    status: data.status,
    pagamento: (pgs[pgs.length - 1]?.status ?? null) as
      | 'pendente'
      | 'aprovado'
      | 'recusado'
      | null,
    numeroPedido: data.numero_pedido,
  }
}

export async function confirmarPagamento(
  estabelecimentoId: string,
  args: ResultadoConfirmacao,
) {
  const supa = criarSupabaseServidor()
  const agora = new Date().toISOString()

  const { data: pedido, error } = await supa
    .from('pedidos')
    .select('status')
    .eq('id', args.pedidoId)
    .eq('estabelecimento_id', estabelecimentoId)
    .maybeSingle()
  if (error) throw error
  if (!pedido) throw new Error('Pedido não encontrado.')
  if (pedido.status !== 'aguardando_pagamento') {
    return { ok: true, status: pedido.status } // idempotente
  }

  const aprovado = args.resultado === 'aprovado'
  const patchPag: Record<string, unknown> = {
    status: aprovado ? 'aprovado' : 'recusado',
    respondido_em: agora,
    transacao_id_maquininha: args.transacaoId ?? null,
    bandeira: args.bandeira ?? null,
  }
  if (args.formaReal) patchPag.forma_pagamento = args.formaReal
  const e2 = await supa.from('pagamentos').update(patchPag).eq('pedido_id', args.pedidoId)
  if (e2.error) throw e2.error

  if (aprovado) {
    const patch: Record<string, unknown> = { status: 'em_preparo', pago_em: agora }
    if (args.formaReal) patch.forma_pagamento = args.formaReal
    const e3 = await supa.from('pedidos').update(patch).eq('id', args.pedidoId)
    if (e3.error) throw e3.error
  }
  return { ok: true, status: aprovado ? 'em_preparo' : 'aguardando_pagamento' }
}

export async function cancelarPagamento(estabelecimentoId: string, pedidoId: string) {
  const supa = criarSupabaseServidor()
  const agora = new Date().toISOString()

  const { data: pedido, error } = await supa
    .from('pedidos')
    .select('status')
    .eq('id', pedidoId)
    .eq('estabelecimento_id', estabelecimentoId)
    .maybeSingle()
  if (error) throw error
  if (!pedido) throw new Error('Pedido não encontrado.')
  if (pedido.status !== 'aguardando_pagamento') return { ok: true, status: pedido.status }

  await supa
    .from('pagamentos')
    .update({ status: 'recusado', respondido_em: agora })
    .eq('pedido_id', pedidoId)
  await supa
    .from('pedidos')
    .update({ status: 'cancelado', cancelado_em: agora })
    .eq('id', pedidoId)
  return { ok: true, status: 'cancelado' }
}

/** Valida o token de dispositivo (header x-device-token) e devolve o estabelecimento. */
export async function estabelecimentoPorToken(token: string | null): Promise<string> {
  if (!token) throw new Error('device token ausente')
  const supa = criarSupabaseServidor()
  const { data, error } = await supa
    .from('dispositivos')
    .select('estabelecimento_id')
    .eq('token', token)
    .eq('ativo', true)
    .maybeSingle()
  if (error) throw error
  if (!data?.estabelecimento_id) throw new Error('device token inválido')
  return data.estabelecimento_id
}
