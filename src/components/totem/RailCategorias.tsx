import type { ComponentType, SVGProps } from 'react'
import { cn } from '#/lib/cn'
import type { Categoria } from '#/mock/cardapio'
import {
  IconeCombo,
  IconeHamburguer,
  IconePorcao,
  IconeBebida,
  IconeSobremesa,
} from '#/components/icones'

const icones: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  'cat-combos': IconeCombo,
  'cat-hamburgueres': IconeHamburguer,
  'cat-porcoes': IconePorcao,
  'cat-bebidas': IconeBebida,
  'cat-sobremesas': IconeSobremesa,
}

export function RailCategorias({
  categorias,
  ativa,
  aoSelecionar,
}: {
  categorias: Categoria[]
  ativa: string
  aoSelecionar: (id: string) => void
}) {
  return (
    <nav className="flex w-40 shrink-0 flex-col gap-3">
      {categorias.map((c) => {
        const Icone = icones[c.id] ?? IconeCombo
        const selecionada = c.id === ativa
        return (
          <button
            key={c.id}
            onClick={() => aoSelecionar(c.id)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-center text-sm font-semibold transition',
              selecionada
                ? 'bg-laranja text-white'
                : 'border border-white/10 text-white/70 hover:border-white/30 hover:text-white',
            )}
          >
            <Icone width={26} height={26} />
            {c.nome}
          </button>
        )
      })}
    </nav>
  )
}
