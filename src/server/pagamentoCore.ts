import { criarSupabaseServidor } from '#/lib/supabase/server'
import { pagamentoProvedor } from '#/lib/config'
import {
  consultarPedidoCielo,
  fecharPedidoCielo,
  resultadoDoPedido,
} from '#/server/cielo'

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
  const cielo = pagamentoProvedor() === 'cielo'
  // as colunas do provedor (migração 007) só são lidas quando a Cielo está ligada
  const seletor = cielo
    ? ('status, numero_pedido, pagamentos ( status, provedor, provedor_pedido_id )' as const)
    : ('status, numero_pedido, pagamentos ( status )' as const)
  const { data, error } = await supa
    .from('pedidos')
    .select(seletor)
    .eq('id', id)
    .eq('estabelecimento_id', estabelecimentoId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Pedido não encontrado.')
  const pgs = (data.pagamentos ?? []) as unknown as Array<{
    status: string
    provedor?: string | null
    provedor_pedido_id?: string | null
  }>

  // Cielo: o totem pergunta o status a cada ~2s; aqui perguntamos à Cielo se já foi pago.
  const ultimo = pgs[pgs.length - 1]
  if (
    cielo &&
    data.status === 'aguardando_pagamento' &&
    ultimo?.status === 'pendente' &&
    ultimo.provedor === 'cielo' &&
    ultimo.provedor_pedido_id
  ) {
    try {
      const r = resultadoDoPedido(await consultarPedidoCielo(ultimo.provedor_pedido_id))
      if (r.pago) {
        await confirmarPagamento(estabelecimentoId, {
          pedidoId: id,
          resultado: 'aprovado',
          transacaoId: r.nsu ?? r.autorizacao,
        })
        fecharPedidoCielo(ultimo.provedor_pedido_id).catch(() => {}) // melhor esforço
        return { status: 'em_preparo', pagamento: 'aprovado' as const, numeroPedido: data.numero_pedido }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[cielo] consulta do pedido falhou:', e)
    }
  }

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

  // Cielo: antes de cancelar, vê se o cliente não pagou no meio tempo; senão, tira da maquininha.
  if (pagamentoProvedor() === 'cielo') {
    const { data: pg } = await supa
      .from('pagamentos')
      .select('provedor, provedor_pedido_id')
      .eq('pedido_id', pedidoId)
      .maybeSingle()
    if (pg?.provedor === 'cielo' && pg.provedor_pedido_id) {
      try {
        const r = resultadoDoPedido(await consultarPedidoCielo(pg.provedor_pedido_id))
        if (r.pago) {
          await confirmarPagamento(estabelecimentoId, {
            pedidoId,
            resultado: 'aprovado',
            transacaoId: r.nsu ?? r.autorizacao,
          })
          return { ok: true, status: 'em_preparo' }
        }
        await fecharPedidoCielo(pg.provedor_pedido_id)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[cielo] não consegui fechar o pedido ao cancelar:', e)
      }
    }
  }

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
