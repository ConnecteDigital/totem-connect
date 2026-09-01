import { createFileRoute } from '@tanstack/react-router'
import { estabelecimentoPorToken, listarPendentes } from '#/server/pagamentoCore'

/**
 * GET /api/maquininha/pendentes
 * Header: x-device-token
 * Usado pelo app Kotlin da Smart 2 (e é o que o Realtime substitui depois).
 */
export const Route = createFileRoute('/api/maquininha/pendentes')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const token = request.headers.get('x-device-token')
          const estId = await estabelecimentoPorToken(token)
          const pendentes = await listarPendentes(estId)
          return Response.json({ pendentes })
        } catch (e) {
          return Response.json({ erro: (e as Error).message }, { status: 400 })
        }
      },
    },
  },
})
