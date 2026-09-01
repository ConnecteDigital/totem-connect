/** Tipos do cardápio usados pelo totem (carrinho, telas). */

export type Adicional = {
  id: string
  nome: string
  preco: number
}

export type Produto = {
  id: string
  categoriaId: string
  nome: string
  descricao: string
  preco: number
  fotoUrl: string | null
  disponivel: boolean
  adicionais: Adicional[]
  personalizacoes: string[]
}

export type Categoria = {
  id: string
  nome: string
  ordem: number
}

export type CardapioTotem = {
  categorias: Categoria[]
  produtos: Produto[]
}

export function produtosPorCategoria(
  produtos: Produto[],
  categoriaId: string,
): Produto[] {
  return produtos.filter((x) => x.categoriaId === categoriaId && x.disponivel)
}

export function buscarProdutos(produtos: Produto[], termo: string): Produto[] {
  const t = termo.trim().toLowerCase()
  if (!t) return []
  return produtos.filter(
    (x) =>
      x.disponivel &&
      (x.nome.toLowerCase().includes(t) || x.descricao.toLowerCase().includes(t)),
  )
}
