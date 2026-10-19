import { createFileRoute } from '@tanstack/react-router'
import { criarSupabaseServidor } from '#/lib/supabase/server'
import { estabelecimentoPorToken } from '#/server/pagamentoCore'

const SELECT = `
  id, numero_pedido, nome_cliente, telefone_cliente, tipo_consumo, modo_entrega,
  status, forma_pagamento, valor_total, taxa_entrega, criado_em, pago_em,
  pedido_itens (
    id, produto_nome, quantidade, preco_unitario, observacoes,
    pedido_item_adicionais ( id, adicional_nome, adicional_preco )
  )
`

/**
 * GET /api/impressao/pendentes
 * Header: x-device-token
 * Pedidos recentes já pagos do estabelecimento, com itens — usado pelo agente de impressão
 * que roda no PC ligado à impressora (scripts/impressora/agente.mjs).
 */
export const Route = createFileRoute('/api/impressao/pendentes')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const estId = await estabelecimentoPorToken(request.headers.get('x-device-token'))
          const supa = criarSupabaseServidor()
          const { data, error } = await supa
            .from('pedidos')
            .select(SELECT)
            .eq('estabelecimento_id', estId)
            .in('status', ['pago', 'em_preparo'])
            .order('criado_em', { ascending: false })
            .limit(30)
          if (error) throw error
          return Response.json({ pedidos: data ?? [] })
        } catch (e) {
          return Response.json({ erro: (e as Error).message }, { status: 400 })
        }
      },
    },
  },
})
