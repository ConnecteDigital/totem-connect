import { createFileRoute } from '@tanstack/react-router'
import {
  cancelarPagamento,
  confirmarPagamento,
  estabelecimentoPorToken,
  type ResultadoConfirmacao,
} from '#/server/pagamentoCore'

/**
 * POST /api/maquininha/confirmar
 * Header: x-device-token
 * Body: { pedidoId, resultado: 'aprovado'|'recusado'|'cancelado', transacaoId?, bandeira?, formaReal? }
 * 'cancelado' = o cliente tocou em Cancelar na própria maquininha: o pedido é cancelado e o totem volta ao início.
 */
export const Route = createFileRoute('/api/maquininha/confirmar')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const token = request.headers.get('x-device-token')
          const estId = await estabelecimentoPorToken(token)
          const body = (await request.json()) as ResultadoConfirmacao
          if (!body?.pedidoId || !body?.resultado) {
            return Response.json({ erro: 'pedidoId e resultado são obrigatórios' }, { status: 400 })
          }
          const r =
            (body.resultado as string) === 'cancelado'
              ? await cancelarPagamento(estId, body.pedidoId)
              : await confirmarPagamento(estId, body)
          return Response.json(r)
        } catch (e) {
          return Response.json({ erro: (e as Error).message }, { status: 400 })
        }
      },
    },
  },
})
