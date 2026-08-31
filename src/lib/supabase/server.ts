import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase do SERVIDOR — só pode ser importado em código server-only
 * (server functions do TanStack Start). Usa a service_role key: IGNORA RLS.
 * Nunca importar isto em componente/código que vai pro navegador.
 */
export function criarSupabaseServidor() {
  const url =
    process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  if (!url || !serviceKey) {
    throw new Error(
      '[supabase] VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não definidas no ambiente do servidor.',
    )
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
