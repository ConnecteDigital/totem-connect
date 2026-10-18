import { supabase } from '#/lib/supabase/browser'

export type EstadoTotem = {
  nome: string | null
  tela_desejada: 'ligada' | 'desligada'
  tela_atual: 'ligada' | 'desligada' | null
  ultimo_sinal_em: string | null
  bateria_pct: number | null
  carregando: boolean | null
}

/** Sem sinal há mais que isso = tablet offline. */
export const OFFLINE_APOS_S = 45

export async function lerEstadoTotem(): Promise<EstadoTotem | null> {
  const { data, error } = await supabase.rpc('estado_totem')
  if (error) throw error
  return ((data as EstadoTotem[] | null) ?? [])[0] ?? null
}

export async function definirTelaTotem(estado: 'ligada' | 'desligada') {
  const { error } = await supabase.rpc('definir_tela_totem', { p_estado: estado })
  if (error) throw error
}

export function totemOnline(e: EstadoTotem | null, agora = Date.now()) {
  if (!e?.ultimo_sinal_em) return false
  return agora - new Date(e.ultimo_sinal_em).getTime() < OFFLINE_APOS_S * 1000
}
