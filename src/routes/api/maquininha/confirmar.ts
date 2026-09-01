import { createFileRoute } from '@tanstack/react-router'
import {
  confirmarPagamento,
  estabelecimentoPorToken,
  type ResultadoConfirmacao,
} from '#/server/pagamentoCore'

/**
 * POST /api/maquininha/confirmar
 * Header: x-device-token
 * Body: { pedidoId, resultado: 'aprovado'|'recusado', transacaoId?, bandeira?, formaReal? }
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
          const r = await confirmarPagamento(estId, body)
          return Response.json(r)
        } catch (e) {
          return Response.json({ erro: (e as Error).message }, { status: 400 })
        }
      },
    },
  },
})
