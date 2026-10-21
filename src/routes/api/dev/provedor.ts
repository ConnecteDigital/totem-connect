import { createFileRoute } from '@tanstack/react-router'
import { pagamentoProvedor } from '#/lib/config'
import { cieloConfigurada, cieloSandbox } from '#/server/cielo'
import { estabelecimentoPorToken } from '#/server/pagamentoCore'

/**
 * GET /api/dev/provedor   (header x-device-token)
 * Diagnóstico: qual provedor de pagamento está ativo neste deploy. NUNCA devolve valores
 * de chaves — só se existem.
 */
export const Route = createFileRoute('/api/dev/provedor')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await estabelecimentoPorToken(request.headers.get('x-device-token'))
          return Response.json({
            provedor: pagamentoProvedor(),
            pagamentoProvedorDefinida: !!process.env.PAGAMENTO_PROVEDOR,
            pagamentoMockDefinida: process.env.PAGAMENTO_MOCK ?? null,
            cieloChavesPresentes: cieloConfigurada(),
            cieloAmbiente: cieloSandbox() ? 'sandbox' : 'producao',
          })
        } catch (e) {
          return Response.json({ erro: (e as Error).message }, { status: 400 })
        }
      },
    },
  },
})
