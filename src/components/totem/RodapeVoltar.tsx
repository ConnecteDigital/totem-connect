import { useRouter } from '@tanstack/react-router'
import { cn } from '#/lib/cn'

export function RodapeVoltar({ className }: { className?: string }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.history.back()}
      className={cn(
        'flex items-center gap-2 rounded-pill border border-white/15 px-5 py-3 text-white/80',
        'transition hover:border-white/40 hover:text-white',
        className,
      )}
    >
      <span aria-hidden>‹</span> Voltar
    </button>
  )
}
