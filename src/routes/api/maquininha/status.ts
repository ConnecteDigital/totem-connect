import { createFileRoute } from '@tanstack/react-router'
import { estabelecimentoPorToken, statusPedido } from '#/server/pagamentoCore'

/**
 * GET /api/maquininha/status?pedidoId=...
 * Header: x-device-token
 * O app da maquininha consulta durante a cobrança: se o cliente cancelou no totem
 * (status deixou de ser 'aguardando_pagamento'), o app aborta a operação no terminal.
 */
export const Route = createFileRoute('/api/maquininha/status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const token = request.headers.get('x-device-token')
          const estId = await estabelecimentoPorToken(token)
          const pedidoId = new URL(request.url).searchParams.get('pedidoId')
          if (!pedidoId) {
            return Response.json({ erro: 'pedidoId é obrigatório' }, { status: 400 })
          }
          const r = await statusPedido(estId, pedidoId)
          return Response.json({ status: r.status })
        } catch (e) {
          return Response.json({ erro: (e as Error).message }, { status: 400 })
        }
      },
    },
  },
})
