import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCarrinho } from '#/lib/carrinho'
import { Botao } from '#/components/totem/Botao'
import { IconeCheck } from '#/components/icones'

const VOLTAR_EM_S = 8

export const Route = createFileRoute('/totem/pedido-realizado')({
  component: PedidoRealizado,
  validateSearch: (s: Record<string, unknown>) => ({
    numero: Number(s.numero) || 0,
  }),
})

function PedidoRealizado() {
  const { numero } = Route.useSearch()
  const { limpar } = useCarrinho()
  const navigate = useNavigate()

  useEffect(() => {
    limpar()
    const t = setTimeout(() => navigate({ to: '/totem' }), VOLTAR_EM_S * 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="grid h-24 w-24 place-items-center rounded-full bg-green-500 text-white">
        <IconeCheck width={52} height={52} />
      </div>
      <h1 className="mt-6 text-6xl font-extrabold">
        Pedido {numero ? `#${numero}` : 'realizado'}
      </h1>
      <p className="mt-3 text-2xl text-white/80">Pagamento aprovado!</p>
      <p className="mt-6 max-w-md text-white/60">
        Retire sua senha na maquininha e acompanhe o painel. Vamos te chamar quando
        estiver pronto.
      </p>

      <Botao className="mt-10" onClick={() => navigate({ to: '/totem' })}>
        Fazer novo pedido
      </Botao>
      <p className="mt-4 text-sm text-white/30">
        Voltando à tela inicial em {VOLTAR_EM_S}s…
      </p>
    </div>
  )
}
