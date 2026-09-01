import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolve o estabelecimento do totem pelo TOTEM_DEVICE_TOKEN (tabela dispositivos).
 * Cai pro VITE_ESTABELECIMENTO_ID se não houver token cadastrado.
 */
export async function resolverEstabelecimentoTotem(
  supa: SupabaseClient,
): Promise<string> {
  const token = process.env.TOTEM_DEVICE_TOKEN
  let id = process.env.VITE_ESTABELECIMENTO_ID ?? ''

  if (token) {
    const { data } = await supa
      .from('dispositivos')
      .select('estabelecimento_id')
      .eq('token', token)
      .eq('tipo', 'totem')
      .eq('ativo', true)
      .maybeSingle()
    if (data?.estabelecimento_id) id = data.estabelecimento_id
  }

  if (!id) throw new Error('Totem não vinculado a um estabelecimento (TOTEM_DEVICE_TOKEN).')
  return id
}
