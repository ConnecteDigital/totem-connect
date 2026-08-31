import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { subtotalItem, useCarrinho } from '#/lib/carrinho'
import { formatarBRL } from '#/lib/formato'
import { CabecalhoTotem } from '#/components/totem/CabecalhoTotem'
import { Botao } from '#/components/totem/Botao'
import { Stepper } from '#/components/totem/Stepper'
import { RodapeVoltar } from '#/components/totem/RodapeVoltar'
import { IconeLixeira } from '#/components/icones'

export const Route = createFileRoute('/totem/revisao')({ component: Revisao })

function Revisao() {
  const { itens, valorTotal, mudarQuantidade, remover } = useCarrinho()
  const navigate = useNavigate()

  return (
    <>
      <CabecalhoTotem />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-8 py-6">
        <h1 className="text-4xl font-extrabold">Revisão do pedido</h1>

        <ul className="mt-6 flex-1 space-y-4 overflow-y-auto">
          {itens.length === 0 && (
            <p className="py-16 text-center text-white/50">Seu carrinho está vazio.</p>
          )}
          {itens.map((item) => (
            <li
              key={item.linhaId}
              className="flex items-center gap-4 rounded-2xl bg-superficie p-4"
            >
              <div className="grid h-14 w-14 place-items-center rounded-xl bg-superficie-2 text-2xl">
                🍔
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{item.produto.nome}</div>
                {item.adicionais.map((a) => (
                  <div key={a.id} className="text-xs text-white/50">
                    {a.nome}
                  </div>
                ))}
              </div>
              <Stepper
                valor={item.quantidade}
                aoMudar={(d) => mudarQuantidade(item.linhaId, d)}
              />
              <div className="w-24 text-right font-bold text-laranja">
                {formatarBRL(subtotalItem(item))}
              </div>
              <button
                aria-label="Remover"
                onClick={() => remover(item.linhaId)}
                className="grid h-11 w-11 place-items-center rounded-full text-white/50 hover:bg-white/5 hover:text-white"
              >
                <IconeLixeira width={20} height={20} />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-2xl">
          <span className="font-semibold">Total</span>
          <span className="font-extrabold">{formatarBRL(valorTotal)}</span>
        </div>

        <div className="mt-6 flex gap-4">
          <Botao variante="secundario" onClick={() => navigate({ to: '/totem/cardapio' })}>
            + Adicionar mais itens
          </Botao>
          <Botao
            bloco
            disabled={itens.length === 0}
            onClick={() => navigate({ to: '/totem/identificacao' })}
          >
            Finalizar pedido
          </Botao>
        </div>
      </div>
      <div className="px-8 pb-8">
        <RodapeVoltar />
      </div>
    </>
  )
}
