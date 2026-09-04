import { useMemo, useState } from 'react'
import { createFileRoute, useLoaderData, useNavigate } from '@tanstack/react-router'
import { useCarrinho } from '#/lib/carrinho'
import { buscarProdutos, produtosPorCategoria, type Produto } from '#/lib/tipos'
import { formatarBRL } from '#/lib/formato'
import { CabecalhoTotem } from '#/components/totem/CabecalhoTotem'
import { CarrinhoLateral } from '#/components/totem/CarrinhoLateral'
import { RailCategorias } from '#/components/totem/RailCategorias'
import { CampoBusca } from '#/components/totem/CampoBusca'
import { FaixaPromo } from '#/components/totem/FaixaPromo'
import { RodapeVoltar } from '#/components/totem/RodapeVoltar'
import { IconeMais } from '#/components/icones'

export const Route = createFileRoute('/totem/cardapio')({ component: Cardapio })

function Cardapio() {
  const { categorias, produtos } = useLoaderData({ from: '/totem' })
  const { adicionar } = useCarrinho()
  const navigate = useNavigate()
  const [catAtiva, setCatAtiva] = useState(categorias[0]?.id ?? '')
  const [busca, setBusca] = useState('')

  const lista = useMemo<Produto[]>(
    () =>
      busca.trim()
        ? buscarProdutos(produtos, busca)
        : produtosPorCategoria(produtos, catAtiva),
    [produtos, busca, catAtiva],
  )

  return (
    <>
      <CabecalhoTotem />

      <div className="flex min-h-0 flex-1 gap-8 px-8 py-6">
        {/* coluna esquerda + centro */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-extrabold">Cardápio</h1>
              <p className="mt-1 text-white/60">Escolha o que mais combina com você</p>
            </div>
            <div className="w-[420px] max-w-[45%]">
              <CampoBusca valor={busca} aoMudar={setBusca} />
            </div>
          </div>

          <div className="mt-6 flex min-h-0 flex-1 gap-6">
            <RailCategorias
              categorias={categorias}
              ativa={catAtiva}
              aoSelecionar={(id) => {
                setBusca('')
                setCatAtiva(id)
              }}
            />

            <div className="min-w-0 flex-1 overflow-y-auto pr-1">
              {lista.length === 0 ? (
                <p className="py-16 text-center text-white/50">Nenhum produto encontrado.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                  {lista.map((p) => (
                    <CardProduto
                      key={p.id}
                      produto={p}
                      aoAdicionar={() => {
                        if (p.adicionais.length || p.personalizacoes.length) {
                          navigate({ to: '/totem/produto/$id', params: { id: p.id } })
                        } else {
                          adicionar({ produto: p, quantidade: 1, personalizacao: null })
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <FaixaPromo
              titulo="Monte seu combo e economize!"
              descricao="Confira nossas opções na próxima etapa."
            />
          </div>
        </div>

        <CarrinhoLateral />
      </div>

      <div className="px-8 pb-8">
        <RodapeVoltar />
      </div>
    </>
  )
}

function CardProduto({
  produto,
  aoAdicionar,
}: {
  produto: Produto
  aoAdicionar: () => void
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-card bg-superficie">
      <div className="grid aspect-[4/3] place-items-center overflow-hidden bg-superficie-2 text-5xl">
        {produto.fotoUrl ? (
          <img src={produto.fotoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          '🍔'
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="font-semibold">{produto.nome}</div>
        <div className="mt-1 line-clamp-2 text-xs text-white/50">{produto.descricao}</div>
        <div className="mt-2 text-lg font-bold text-laranja">
          {formatarBRL(produto.preco)}
        </div>
        <button
          onClick={aoAdicionar}
          className="mt-3 flex items-center justify-center gap-2 rounded-pill bg-laranja px-4 py-3 font-bold text-white transition hover:bg-laranja-escuro"
        >
          Adicionar
          <IconeMais width={18} height={18} />
        </button>
      </div>
    </div>
  )
}
