import { useEffect, useMemo } from 'react'
import { createFileRoute, useLoaderData, useNavigate } from '@tanstack/react-router'
import { categoriaCombos, produtosPorCategoria } from '#/lib/tipos'
import { useCarrinho } from '#/lib/carrinho'
import { formatarBRL } from '#/lib/formato'
import { CabecalhoTotem } from '#/components/totem/CabecalhoTotem'
import { Botao } from '#/components/totem/Botao'
import { RodapeVoltar } from '#/components/totem/RodapeVoltar'
import { IconeMais } from '#/components/icones'

export const Route = createFileRoute('/totem/oferta-combo')({ component: OfertaCombo })

function OfertaCombo() {
  const { categorias, produtos } = useLoaderData({ from: '/totem' })
  const { itens, comboJaOferecido, marcarComboOferecido, adicionar } = useCarrinho()
  const navigate = useNavigate()

  const catCombo = useMemo(() => categoriaCombos(categorias), [categorias])
  const combos = useMemo(
    () => (catCombo ? produtosPorCategoria(produtos, catCombo.id) : []),
    [produtos, catCombo],
  )
  const jaTemCombo = catCombo
    ? itens.some((i) => i.produto.categoriaId === catCombo.id)
    : false

  const pular = comboJaOferecido || itens.length === 0 || combos.length === 0 || jaTemCombo

  useEffect(() => {
    if (pular) navigate({ to: '/totem/revisao', replace: true })
  }, [pular, navigate])

  if (pular) return null

  function continuar() {
    marcarComboOferecido()
    navigate({ to: '/totem/revisao' })
  }

  return (
    <>
      <CabecalhoTotem />
      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col px-8 py-6">
        <h1 className="text-4xl font-extrabold">
          Que tal um <span className="text-laranja">combo?</span>
        </h1>
        <p className="mt-2 text-white/60">Sai mais em conta e você ganha bebida + acompanhamento.</p>

        <div className="mt-6 grid flex-1 grid-cols-2 gap-4 overflow-y-auto pr-1 xl:grid-cols-3">
          {combos.map((c) => (
            <div key={c.id} className="flex flex-col overflow-hidden rounded-card bg-superficie">
              <div className="grid aspect-[4/3] place-items-center overflow-hidden bg-superficie-2 text-5xl">
                {c.fotoUrl ? (
                  <img src={c.fotoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  '🍔'
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="font-semibold">{c.nome}</div>
                <div className="mt-1 line-clamp-2 text-xs text-white/50">{c.descricao}</div>
                <div className="mt-2 text-lg font-bold text-laranja">{formatarBRL(c.preco)}</div>
                <button
                  onClick={() => {
                    adicionar({ produto: c, quantidade: 1, personalizacao: null })
                    continuar()
                  }}
                  className="mt-3 flex items-center justify-center gap-2 rounded-pill bg-laranja px-4 py-3 font-bold text-white transition hover:bg-laranja-escuro"
                >
                  Quero esse combo
                  <IconeMais width={18} height={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <RodapeVoltar />
          <Botao variante="secundario" bloco onClick={continuar}>
            Continuar sem combo
          </Botao>
        </div>
      </div>
    </>
  )
}
