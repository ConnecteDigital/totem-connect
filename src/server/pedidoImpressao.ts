import { createServerFn } from '@tanstack/react-start'
import { criarSupabaseServidor } from '#/lib/supabase/server'
import { resolverEstabelecimentoTotem } from '#/server/_comum'
import type { PedidoDb } from '#/lib/painel/pedidosDb'

const SELECT = `
  id, numero_pedido, nome_cliente, telefone_cliente, tipo_consumo, modo_entrega,
  status, forma_pagamento, valor_total, taxa_entrega, criado_em, pago_em,
  entrega_cep, entrega_logradouro, entrega_numero, entrega_complemento,
  entrega_bairro, entrega_cidade, entrega_referencia,
  pedido_itens (
    id, produto_nome, quantidade, preco_unitario, observacoes,
    pedido_item_adicionais ( id, adicional_nome, adicional_preco )
  )
`

/**
 * Busca um pedido para impressão (comanda / ticket cozinha).
 * Server-side com service role — funciona pro totem (sem login) e pro PDV.
 * Só devolve pedido do estabelecimento do dispositivo.
 */
export const getPedidoImpressao = createServerFn({ method: 'GET' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<PedidoDb | null> => {
    const supa = criarSupabaseServidor()
    const estabelecimentoId = await resolverEstabelecimentoTotem(supa)

    const { data: pedido, error } = await supa
      .from('pedidos')
      .select(SELECT)
      .eq('id', data.id)
      .eq('estabelecimento_id', estabelecimentoId)
      .maybeSingle()
    if (error) throw error
    return (pedido as unknown as PedidoDb) ?? null
  })
