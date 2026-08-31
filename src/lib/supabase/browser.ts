import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase do navegador — usado pelo PDV e Relatórios.
 * Usa a publishable/anon key e respeita RLS. Sessão persiste no localStorage.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não definidas — telas com login não vão funcionar.',
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
