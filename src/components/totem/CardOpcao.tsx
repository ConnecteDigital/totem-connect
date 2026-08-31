import type { ReactNode } from 'react'
import { BotaoCircular } from './BotaoCircular'

export function CardOpcao({
  icone,
  titulo,
  descricao,
  aoEscolher,
}: {
  icone: ReactNode
  titulo: string
  descricao: string
  aoEscolher: () => void
}) {
  return (
    <button
      onClick={aoEscolher}
      className="flex flex-1 flex-col items-center gap-4 rounded-card bg-cinza-claro px-8 py-10 text-preto transition hover:ring-4 hover:ring-laranja/40"
    >
      <div className="text-laranja">{icone}</div>
      <div className="text-2xl font-bold">{titulo}</div>
      <div className="text-cinza-texto">{descricao}</div>
      <BotaoCircular rotulo={titulo} className="mt-2" tabIndex={-1} />
    </button>
  )
}
