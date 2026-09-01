import type { ComponentType, SVGProps } from 'react'
import { cn } from '#/lib/cn'
import type { Categoria } from '#/lib/tipos'
import {
  IconeCombo,
  IconeHamburguer,
  IconePorcao,
  IconeBebida,
  IconeSobremesa,
} from '#/components/icones'

type IconeSvg = ComponentType<SVGProps<SVGSVGElement>>

function iconeDaCategoria(nome: string): IconeSvg {
  const n = nome.toLowerCase()
  if (n.includes('combo')) return IconeCombo
  if (n.includes('burg') || n.includes('lanch') || n.includes('sandu')) return IconeHamburguer
  if (n.includes('porç') || n.includes('porc') || n.includes('acompanh')) return IconePorcao
  if (n.includes('bebid') || n.includes('drink') || n.includes('suco')) return IconeBebida
  if (n.includes('sobrem') || n.includes('doce') || n.includes('sorvet')) return IconeSobremesa
  return IconeCombo
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
        const Icone = iconeDaCategoria(c.nome)
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
