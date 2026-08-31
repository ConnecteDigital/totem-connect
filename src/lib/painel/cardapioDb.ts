import { supabase } from '#/lib/supabase/browser'

export type CategoriaDb = {
  id: string
  estabelecimento_id: string
  nome: string
  ordem: number
}

export type ProdutoDb = {
  id: string
  estabelecimento_id: string
  categoria_id: string | null
  nome: string
  descricao: string | null
  preco: number
  foto_url: string | null
  disponivel: boolean
  ordem: number
}

export type AdicionalDb = {
  id: string
  produto_id: string
  nome: string
  preco: number
}

export type Cardapio = {
  categorias: CategoriaDb[]
  produtos: ProdutoDb[]
  adicionais: AdicionalDb[]
}

export async function carregarCardapio(estabelecimentoId: string): Promise<Cardapio> {
  const [cat, prod] = await Promise.all([
    supabase
      .from('categorias')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .order('ordem'),
    supabase
      .from('produtos')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .order('ordem'),
  ])
  if (cat.error) throw cat.error
  if (prod.error) throw prod.error

  const ids = (prod.data ?? []).map((p) => p.id)
  let adicionais: AdicionalDb[] = []
  if (ids.length) {
    const add = await supabase.from('produto_adicionais').select('*').in('produto_id', ids)
    if (add.error) throw add.error
    adicionais = add.data ?? []
  }

  return {
    categorias: cat.data ?? [],
    produtos: prod.data ?? [],
    adicionais,
  }
}

export async function salvarCategoria(input: {
  id?: string
  estabelecimento_id: string
  nome: string
  ordem: number
}) {
  if (input.id) {
    const { error } = await supabase
      .from('categorias')
      .update({ nome: input.nome, ordem: input.ordem })
      .eq('id', input.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('categorias').insert({
      estabelecimento_id: input.estabelecimento_id,
      nome: input.nome,
      ordem: input.ordem,
    })
    if (error) throw error
  }
}

export async function excluirCategoria(id: string) {
  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) throw error
}

export async function salvarProduto(input: {
  id?: string
  estabelecimento_id: string
  categoria_id: string | null
  nome: string
  descricao: string | null
  preco: number
  foto_url: string | null
  disponivel: boolean
  ordem: number
}): Promise<string> {
  if (input.id) {
    const { error } = await supabase
      .from('produtos')
      .update({
        categoria_id: input.categoria_id,
        nome: input.nome,
        descricao: input.descricao,
        preco: input.preco,
        foto_url: input.foto_url,
        disponivel: input.disponivel,
        ordem: input.ordem,
      })
      .eq('id', input.id)
    if (error) throw error
    return input.id
  }
  const { data, error } = await supabase
    .from('produtos')
    .insert({
      estabelecimento_id: input.estabelecimento_id,
      categoria_id: input.categoria_id,
      nome: input.nome,
      descricao: input.descricao,
      preco: input.preco,
      foto_url: input.foto_url,
      disponivel: input.disponivel,
      ordem: input.ordem,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function excluirProduto(id: string) {
  const { error } = await supabase.from('produtos').delete().eq('id', id)
  if (error) throw error
}

export async function definirDisponivel(id: string, disponivel: boolean) {
  const { error } = await supabase.from('produtos').update({ disponivel }).eq('id', id)
  if (error) throw error
}

/** Substitui todos os adicionais de um produto pela lista informada. */
export async function salvarAdicionais(
  produtoId: string,
  lista: Array<{ nome: string; preco: number }>,
) {
  const del = await supabase.from('produto_adicionais').delete().eq('produto_id', produtoId)
  if (del.error) throw del.error
  if (lista.length) {
    const { error } = await supabase
      .from('produto_adicionais')
      .insert(lista.map((a) => ({ produto_id: produtoId, nome: a.nome, preco: a.preco })))
    if (error) throw error
  }
}

export async function enviarFotoProduto(
  estabelecimentoId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const caminho = `${estabelecimentoId}/${crypto.randomUUID()}.${ext}`
  const up = await supabase.storage.from('produtos').upload(caminho, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (up.error) throw up.error
  const { data } = supabase.storage.from('produtos').getPublicUrl(caminho)
  return data.publicUrl
}
