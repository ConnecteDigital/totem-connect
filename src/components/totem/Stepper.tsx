import { cn } from '#/lib/cn'
import { IconeMais, IconeMenos } from '#/components/icones'

type Props = {
  valor: number
  aoMudar: (delta: number) => void
  min?: number
  className?: string
  tema?: 'escuro' | 'claro'
}

export function Stepper({ valor, aoMudar, min = 1, className, tema = 'escuro' }: Props) {
  const botao =
    tema === 'escuro'
      ? 'border-white/20 text-white hover:bg-white/10'
      : 'border-cinza-medio text-preto hover:bg-cinza-claro'

  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <button
        aria-label="Diminuir"
        onClick={() => aoMudar(-1)}
        disabled={valor <= min}
        className={cn(
          'grid h-11 w-11 place-items-center rounded-full border transition disabled:opacity-30',
          botao,
        )}
      >
        <IconeMenos width={20} height={20} />
      </button>
      <span className="min-w-8 text-center text-lg font-bold tabular-nums">{valor}</span>
      <button
        aria-label="Aumentar"
        onClick={() => aoMudar(1)}
        className={cn(
          'grid h-11 w-11 place-items-center rounded-full border transition',
          botao,
        )}
      >
        <IconeMais width={20} height={20} />
      </button>
    </div>
  )
}
