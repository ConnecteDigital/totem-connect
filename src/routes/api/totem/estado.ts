import { createFileRoute } from '@tanstack/react-router'
import { criarSupabaseServidor } from '#/lib/supabase/server'

/**
 * POST /api/totem/estado
 * Header: x-device-token (dispositivo tipo 'totem')
 * Body:   { bateria?: number, carregando?: boolean, tela?: 'ligada'|'desligada', versao?: string }
 *
 * Chamado pelo app de quiosque do tablet a cada ~10s: registra o sinal de vida
 * e devolve o estado de tela que o PDV pediu.
 */
export const Route = createFileRoute('/api/totem/estado')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const token = request.headers.get('x-device-token')
          if (!token) throw new Error('device token ausente')

          const corpo = (await request.json().catch(() => ({}))) as {
            bateria?: number
            carregando?: boolean
            tela?: string
            versao?: string
          }

          const supa = criarSupabaseServidor()
          const { data, error } = await supa
            .from('dispositivos')
            .update({
              ultimo_sinal_em: new Date().toISOString(),
              bateria_pct: Number.isFinite(corpo.bateria) ? Math.round(corpo.bateria!) : null,
              carregando: typeof corpo.carregando === 'boolean' ? corpo.carregando : null,
              tela_atual:
                corpo.tela === 'ligada' || corpo.tela === 'desligada' ? corpo.tela : null,
              versao_app: corpo.versao?.slice(0, 40) ?? null,
            })
            .eq('token', token)
            .eq('tipo', 'totem')
            .eq('ativo', true)
            .select('tela_desejada')
            .maybeSingle()
          if (error) throw error
          if (!data) throw new Error('device token inválido')

          return Response.json({ telaDesejada: data.tela_desejada })
        } catch (e) {
          return Response.json({ erro: (e as Error).message }, { status: 400 })
        }
      },
    },
  },
})
