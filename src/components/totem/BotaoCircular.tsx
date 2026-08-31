import type { ButtonHTMLAttributes } from 'react'
import { cn } from '#/lib/cn'
import { IconeSeta } from '#/components/icones'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  rotulo: string
}

export function BotaoCircular({ rotulo, className, ...rest }: Props) {
  return (
    <button
      aria-label={rotulo}
      className={cn(
        'grid h-14 w-14 place-items-center rounded-full bg-laranja text-white',
        'transition hover:bg-laranja-escuro active:scale-95',
        className,
      )}
      {...rest}
    >
      <IconeSeta width={26} height={26} />
    </button>
  )
}
