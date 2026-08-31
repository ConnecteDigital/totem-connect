import { useState } from 'react'
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { produtos, type Adicional } from '#/mock/cardapio'
import { useCarrinho } from '#/lib/carrinho'
import { formatarBRL } from '#/lib/formato'
import { cn } from '#/lib/cn'
import { CabecalhoTotem } from '#/components/totem/CabecalhoTotem'
import { Botao } from '#/components/totem/Botao'
import { Stepper } from '#/components/totem/Stepper'
import { RodapeVoltar } from '#/components/totem/RodapeVoltar'

export const Route = createFileRoute('/totem/produto/$id')({
  component: DetalheProduto,
  loader: ({ params }) => {
    const produto = produtos.find((p) => p.id === params.id)
    if (!produto) throw notFound()
    return { produto }
  },
})

function DetalheProduto() {
  const { produto } = Route.useLoaderData()
  const { adicionar } = useCarrinho()
  const navigate = useNavigate()

  const [quantidade, setQuantidade] = useState(1)
  const [personalizacao, setPersonalizacao] = useState<string | null>(
    produto.personalizacoes[0] ?? null,
  )
  const [selecionados, setSelecionados] = useState<Adicional[]>([])
  const [observacoes, setObservacoes] = useState('')

  const precoUnit =
    produto.preco + selecionados.reduce((s, a) => s + a.preco, 0)

  function toggleAdicional(a: Adicional) {
    setSelecionados((prev) =>
      prev.some((x) => x.id === a.id) ? prev.filter((x) => x.id !== a.id) : [...prev, a],
    )
  }

  function adicionarAoPedido() {
    adicionar({
      produto,
      quantidade,
      personalizacao,
      adicionais: selecionados,
      observacoes: observacoes.trim(),
    })
    navigate({ to: '/totem/cardapio' })
  }

  return (
    <>
      <CabecalhoTotem />
      <div className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-8 py-6 md:grid-cols-2">
        <div className="grid aspect-square place-items-center rounded-card bg-superficie text-[120px]">
          🍔
        </div>

        <div className="flex flex-col">
          <h1 className="text-4xl font-extrabold">{produto.nome}</h1>
          <div className="mt-1 text-2xl font-bold text-laranja">
            {formatarBRL(produto.preco)}
          </div>
          <p className="mt-3 text-white/60">{produto.descricao}</p>

          {produto.personalizacoes.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-semibold text-white/70">Escolha como deseja</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {produto.personalizacoes.map((op) => (
                  <button
                    key={op}
                    onClick={() => setPersonalizacao(op)}
                    className={cn(
                      'rounded-pill px-4 py-2 text-sm font-medium transition',
                      personalizacao === op
                        ? 'bg-laranja text-white'
                        : 'ring-1 ring-white/15 hover:ring-white/40',
                    )}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
          )}

          {produto.adicionais.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-semibold text-white/70">Adicionais</div>
              <div className="mt-2 space-y-2">
                {produto.adicionais.map((a) => {
                  const on = selecionados.some((x) => x.id === a.id)
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleAdicional(a)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition',
                        on ? 'bg-laranja/15 ring-1 ring-laranja' : 'bg-superficie ring-1 ring-white/10',
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            'grid h-5 w-5 place-items-center rounded border',
                            on ? 'border-laranja bg-laranja text-white' : 'border-white/30',
                          )}
                        >
                          {on ? '✓' : ''}
                        </span>
                        {a.nome}
                      </span>
                      <span className="text-white/70">+ {formatarBRL(a.preco)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="text-sm font-semibold text-white/70">Observações</div>
            <input
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="ex: sem cebola"
              className="mt-2 w-full rounded-xl bg-superficie px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-laranja"
            />
          </div>

          <div className="mt-8 flex items-center gap-4">
            <Stepper valor={quantidade} aoMudar={(d) => setQuantidade((q) => Math.max(1, q + d))} />
            <Botao bloco onClick={adicionarAoPedido}>
              Adicionar {formatarBRL(precoUnit * quantidade)}
            </Botao>
          </div>
        </div>
      </div>

      <div className="px-8 pb-8">
        <RodapeVoltar />
      </div>
    </>
  )
}
