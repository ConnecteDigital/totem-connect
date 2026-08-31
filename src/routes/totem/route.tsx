import { Outlet, createFileRoute } from '@tanstack/react-router'
import { CarrinhoProvider } from '#/lib/carrinho'

export const Route = createFileRoute('/totem')({ component: LayoutTotem })

function LayoutTotem() {
  return (
    <CarrinhoProvider>
      <div className="totem-root flex flex-col">
        <Outlet />
      </div>
    </CarrinhoProvider>
  )
}
