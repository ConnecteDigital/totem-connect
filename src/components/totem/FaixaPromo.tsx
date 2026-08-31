import type { ReactNode } from 'react'

export function FaixaPromo({
  titulo,
  descricao,
  acao,
}: {
  titulo: string
  descricao: string
  acao?: ReactNode
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-superficie px-5 py-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-laranja/15 text-laranja">
        %
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold">{titulo}</div>
        <div className="truncate text-sm text-white/60">{descricao}</div>
      </div>
      {acao}
    </div>
  )
}
