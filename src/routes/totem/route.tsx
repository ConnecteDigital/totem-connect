import { Outlet, createFileRoute, useLocation, useNavigate } from '@tanstack/react-router'
import { CarrinhoProvider, useCarrinho } from '#/lib/carrinho'
import { useInatividade } from '#/lib/useInatividade'
import { AvisoInatividade } from '#/components/totem/AvisoInatividade'
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
      <TotemShell />
    </CarrinhoProvider>
  )
}

function TotemShell() {
  const { limpar } = useCarrinho()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // não monitora na tela ociosa nem na confirmação (que tem retorno próprio)
  const monitorar =
    pathname !== '/totem' && pathname !== '/totem/pedido-realizado'

  const { avisando, segundos } = useInatividade({
    ativo: monitorar,
    aoExpirar: () => {
      limpar()
      navigate({ to: '/totem' })
    },
  })

  return (
    <div className="totem-root flex flex-col">
      <Outlet />
      {avisando && <AvisoInatividade segundos={segundos} />}
    </div>
  )
}
