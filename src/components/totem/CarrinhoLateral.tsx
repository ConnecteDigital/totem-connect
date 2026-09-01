import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '#/lib/cn'
import { formatarBRL } from '#/lib/formato'
import { subtotalItem, useCarrinho } from '#/lib/carrinho'
import { Botao } from './Botao'
import { Stepper } from './Stepper'
import { IconeCarrinho, IconeChevron, IconeLixeira } from '#/components/icones'

export function CarrinhoLateral({ className }: { className?: string }) {
  const { itens, totalItens, valorTotal, mudarQuantidade, remover } = useCarrinho()
  const [aberto, setAberto] = useState(true)
  const navigate = useNavigate()
  const vazio = itens.length === 0

  return (
    <aside
      className={cn(
        'flex w-[340px] shrink-0 flex-col rounded-card bg-superficie p-5',
        className,
      )}
    >
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center justify-between"
      >
        <span className="flex items-center gap-3">
          <span className="relative">
            <IconeCarrinho width={26} height={26} className="text-laranja" />
            {totalItens > 0 && (
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-laranja px-1 text-xs font-bold text-white">
                {totalItens}
              </span>
            )}
          </span>
          <span className="text-lg font-bold">Meu pedido</span>
        </span>
        <IconeChevron
          width={20}
          height={20}
          className={cn('transition', aberto ? 'rotate-180' : '')}
        />
      </button>

      {aberto && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          {vazio ? (
            <p className="py-10 text-center text-sm text-white/50">
              Seu carrinho está vazio.
              <br />
              Escolha um item no cardápio.
            </p>
          ) : (
            <ul className="flex-1 space-y-4 overflow-y-auto pr-1">
              {itens.map((item) => (
                <li key={item.linhaId} className="border-b border-white/10 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">{item.produto.nome}</div>
                      {item.personalizacao && item.personalizacao !== 'Padrão' && (
                        <div className="text-xs text-white/50">{item.personalizacao}</div>
                      )}
                      {item.adicionais.map((a) => (
                        <div key={a.id} className="text-xs text-white/50">
                          {a.nome}
                        </div>
                      ))}
                    </div>
                    <div className="whitespace-nowrap font-bold text-laranja">
                      {formatarBRL(subtotalItem(item))}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Stepper
                      valor={item.quantidade}
                      aoMudar={(d) => mudarQuantidade(item.linhaId, d)}
                    />
                    <button
                      aria-label="Remover item"
                      onClick={() => remover(item.linhaId)}
                      className="grid h-11 w-11 place-items-center rounded-full text-white/50 hover:bg-white/5 hover:text-white"
                    >
                      <IconeLixeira width={20} height={20} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between text-lg">
              <span className="font-semibold">Total</span>
              <span className="font-bold">{formatarBRL(valorTotal)}</span>
            </div>
            <Botao
              bloco
              className="mt-4"
              disabled={vazio}
              onClick={() => navigate({ to: '/totem/oferta-combo' })}
              iconeDireita={<span aria-hidden>→</span>}
            >
              Ver pedido
            </Botao>
          </div>
        </div>
      )}
    </aside>
  )
}
