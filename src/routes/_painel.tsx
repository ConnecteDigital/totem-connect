import { Outlet, createFileRoute } from '@tanstack/react-router'
import { LayoutPainel } from '#/components/painel/LayoutPainel'

export const Route = createFileRoute('/_painel')({ component: PainelLayout })

function PainelLayout() {
  return (
    <LayoutPainel>
      <Outlet />
    </LayoutPainel>
  )
}
