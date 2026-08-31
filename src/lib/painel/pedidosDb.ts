import { supabase } from '#/lib/supabase/browser'

export type StatusPedido =
  | 'aguardando_pagamento'
  | 'pago'
  | 'em_preparo'
  | 'pronto'
  | 'entregue'
  | 'cancelado'

export type PedidoItemDb = {
  id: string
  produto_nome: string
  quantidade: number
  preco_unitario: number
  observacoes: string | null
  pedido_item_adicionais: Array<{
    id: string
    adicional_nome: string
    adicional_preco: number
  }>
}

export type PedidoDb = {
  id: string
  numero_pedido: number
  nome_cliente: string | null
  telefone_cliente: string | null
  tipo_consumo: 'comer_aqui' | 'para_viagem' | null
  modo_entrega: 'retirada' | 'entrega' | null
  status: StatusPedido
  forma_pagamento: string | null
  valor_total: number
  taxa_entrega: number
  criado_em: string
  pago_em: string | null
  entrega_cep: string | null
  entrega_logradouro: string | null
  entrega_numero: string | null
  entrega_complemento: string | null
  entrega_bairro: string | null
  entrega_cidade: string | null
  entrega_referencia: string | null
  pedido_itens: PedidoItemDb[]
}

const SELECT_PEDIDO = `
  id, numero_pedido, nome_cliente, telefone_cliente, tipo_consumo, modo_entrega,
  status, forma_pagamento, valor_total, taxa_entrega, criado_em, pago_em,
  entrega_cep, entrega_logradouro, entrega_numero, entrega_complemento,
  entrega_bairro, entrega_cidade, entrega_referencia,
  pedido_itens (
    id, produto_nome, quantidade, preco_unitario, observacoes,
    pedido_item_adicionais ( id, adicional_nome, adicional_preco )
  )
`

/** Fila do PDV: pedidos ativos (não abandonados, não finalizados/cancelados). */
export async function listarFila(estabelecimentoId: string): Promise<PedidoDb[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select(SELECT_PEDIDO)
    .eq('estabelecimento_id', estabelecimentoId)
    .in('status', ['pago', 'em_preparo', 'pronto'])
    .order('numero_pedido', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as PedidoDb[]
}

export async function buscarPedido(id: string): Promise<PedidoDb | null> {
  const { data, error } = await supabase
    .from('pedidos')
    .select(SELECT_PEDIDO)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as unknown as PedidoDb) ?? null
}

export async function mudarStatus(id: string, status: StatusPedido) {
  const patch: Record<string, unknown> = { status }
  if (status === 'cancelado') patch.cancelado_em = new Date().toISOString()
  const { error } = await supabase.from('pedidos').update(patch).eq('id', id)
  if (error) throw error
}

export const PROXIMO_STATUS: Partial<Record<StatusPedido, StatusPedido>> = {
  pago: 'em_preparo',
  em_preparo: 'pronto',
  pronto: 'entregue',
}

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  aguardando_pagamento: 'Aguardando pagamento',
  pago: 'Novo',
  em_preparo: 'Em preparo',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

// ---- Relatórios ----

export type LinhaRelatorio = {
  id: string
  numero_pedido: number
  nome_cliente: string | null
  tipo_consumo: string | null
  modo_entrega: string | null
  status: string
  forma_pagamento: string | null
  valor_total: number
  criado_em: string
}

export async function faturamentoPeriodo(
  estabelecimentoId: string,
  deISO: string,
  ateISO: string,
): Promise<LinhaRelatorio[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select(
      'id, numero_pedido, nome_cliente, tipo_consumo, modo_entrega, status, forma_pagamento, valor_total, criado_em',
    )
    .eq('estabelecimento_id', estabelecimentoId)
    .in('status', ['pago', 'em_preparo', 'pronto', 'entregue'])
    .gte('criado_em', deISO)
    .lte('criado_em', ateISO)
    .order('criado_em', { ascending: false })
  if (error) throw error
  return (data ?? []) as LinhaRelatorio[]
}
