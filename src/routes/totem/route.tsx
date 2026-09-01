import { Outlet, createFileRoute } from '@tanstack/react-router'
import { CarrinhoProvider } from '#/lib/carrinho'
import { getCardapioTotem } from '#/server/cardapioTotem'

export const Route = createFileRoute('/totem')({
  component: LayoutTotem,
  loader: () => getCardapioTotem(),
  pendingComponent: () => (
    <div className="totem-root grid min-h-screen place-items-center text-white/50">
      Carregando cardápio…
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="totem-root grid min-h-screen place-items-center px-8 text-center text-white/70">
      <div>
        <p className="text-xl font-bold text-white">Não foi possível carregar o cardápio</p>
        <p className="mt-2 text-sm">{error.message}</p>
      </div>
    </div>
  ),
})

function LayoutTotem() {
  return (
    <CarrinhoProvider>
      <div className="totem-root flex flex-col">
        <Outlet />
      </div>
    </CarrinhoProvider>
  )
}
