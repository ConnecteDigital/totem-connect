import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Hub })

function Hub() {
  return (
    <div className="painel-root flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Totem Connect</h1>
        <p className="mt-1 text-cinza-texto">Ambiente de desenvolvimento — escolha uma área</p>
      </div>
      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-3">
        <HubLink to="/totem" titulo="Totem" desc="Autoatendimento do cliente" />
        <HubLink to="/pdv" titulo="PDV" desc="Balcão — fila e cozinha" />
        <HubLink to="/relatorios" titulo="Relatórios" desc="Faturamento por período" />
      </div>
    </div>
  )
}

function HubLink({ to, titulo, desc }: { to: string; titulo: string; desc: string }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-cinza-medio bg-white p-6 transition hover:border-laranja hover:shadow-md"
    >
      <div className="text-lg font-bold text-preto">{titulo}</div>
      <div className="mt-1 text-sm text-cinza-texto">{desc}</div>
    </Link>
  )
}
