import { createFileRoute } from '@tanstack/react-router'
import { estabelecimentoPorToken, listarPendentes } from '#/server/pagamentoCore'

const ESPERA_MAX_S = 20
const INTERVALO_MS = 1500

/**
 * GET /api/maquininha/pendentes[?aguardar=20]
 * Header: x-device-token
 * Usado pelo app Kotlin da Smart 2. Com `aguardar` (long-poll) a resposta só volta quando
 * há pedido pendente ou quando o tempo acaba: poucas requisições = pouco consumo de dados
 * no terminal (a PagBank monitora isso na homologação) e o pedido chega na hora.
 */
export const Route = createFileRoute('/api/maquininha/pendentes')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const token = request.headers.get('x-device-token')
          const estId = await estabelecimentoPorToken(token)
          const pedido = Number(new URL(request.url).searchParams.get('aguardar') ?? 0)
          const espera = Math.min(Math.max(pedido || 0, 0), ESPERA_MAX_S) * 1000
          const fim = Date.now() + espera
          let pendentes = await listarPendentes(estId)
          while (pendentes.length === 0 && Date.now() + INTERVALO_MS < fim) {
            await new Promise((r) => setTimeout(r, INTERVALO_MS))
            pendentes = await listarPendentes(estId)
          }
          return Response.json({ pendentes })
        } catch (e) {
          return Response.json({ erro: (e as Error).message }, { status: 400 })
        }
      },
    },
  },
})
