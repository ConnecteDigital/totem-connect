import { createServerFn } from '@tanstack/react-start'
import { criarSupabaseServidor } from '#/lib/supabase/server'
import { resolverEstabelecimentoTotem } from '#/server/_comum'
import type { CardapioTotem } from '#/lib/tipos'

/**
 * Cardápio para o Totem — roda no servidor (service role, ignora RLS).
 * Descobre o estabelecimento pelo TOTEM_DEVICE_TOKEN (tabela dispositivos).
 */
export const getCardapioTotem = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CardapioTotem> => {
    const supa = criarSupabaseServidor()
    const estabelecimentoId = await resolverEstabelecimentoTotem(supa)

    const [cat, prod] = await Promise.all([
      supa
        .from('categorias')
        .select('id, nome, ordem')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('ordem'),
      supa
        .from('produtos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('disponivel', true)
        .order('ordem'),
    ])
    if (cat.error) throw cat.error
    if (prod.error) throw prod.error

    const produtos = prod.data ?? []
    const ids = produtos.map((p) => p.id)
    let adicionais: Array<{ id: string; produto_id: string; nome: string; preco: number }> = []
    if (ids.length) {
      const a = await supa.from('produto_adicionais').select('*').in('produto_id', ids)
      if (a.error) throw a.error
      adicionais = a.data ?? []
    }

    return {
      categorias: (cat.data ?? []).map((c) => ({
        id: c.id,
        nome: c.nome,
        ordem: c.ordem,
      })),
      produtos: produtos.map((p) => ({
        id: p.id,
        categoriaId: p.categoria_id ?? '',
        nome: p.nome,
        descricao: p.descricao ?? '',
        preco: Number(p.preco),
        fotoUrl: p.foto_url,
        disponivel: p.disponivel,
        personalizacoes: (p.personalizacoes as string[] | null) ?? [],
        adicionais: adicionais
          .filter((x) => x.produto_id === p.id)
          .map((x) => ({ id: x.id, nome: x.nome, preco: Number(x.preco) })),
      })),
    }
  },
)
