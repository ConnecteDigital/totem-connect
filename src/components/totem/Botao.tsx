import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '#/lib/cn'

type Variante = 'primario' | 'secundario' | 'terciario'
type Tamanho = 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
  tamanho?: Tamanho
  bloco?: boolean
  iconeDireita?: ReactNode
  iconeEsquerda?: ReactNode
}

const variantes: Record<Variante, string> = {
  primario:
    'bg-laranja text-white hover:bg-laranja-escuro active:bg-laranja-escuro shadow-[0_8px_24px_-8px_rgba(255,106,0,0.6)]',
  secundario:
    'bg-transparent text-white border border-white/25 hover:border-white/50',
  terciario: 'bg-transparent text-white/80 hover:text-white',
}

const tamanhos: Record<Tamanho, string> = {
  md: 'min-h-[56px] px-6 text-lg',
  lg: 'min-h-toque px-8 text-xl',
}

export function Botao({
  variante = 'primario',
  tamanho = 'md',
  bloco = false,
  iconeDireita,
  iconeEsquerda,
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-3 rounded-pill font-bold transition',
        'disabled:cursor-not-allowed disabled:opacity-40',
        variantes[variante],
        tamanhos[tamanho],
        bloco && 'w-full',
        className,
      )}
      {...rest}
    >
      {iconeEsquerda}
      {children}
      {iconeDireita}
    </button>
  )
}
