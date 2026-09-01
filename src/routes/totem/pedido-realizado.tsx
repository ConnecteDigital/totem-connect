import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCarrinho } from '#/lib/carrinho'
import { Botao } from '#/components/totem/Botao'
import { IconeCheck } from '#/components/icones'

export const Route = createFileRoute('/totem/pedido-realizado')({
  component: PedidoRealizado,
  validateSearch: (s: Record<string, unknown>) => ({
    numero: Number(s.numero) || 0,
    id: typeof s.id === 'string' ? s.id : '',
  }),
})

function PedidoRealizado() {
  const { numero, id } = Route.useSearch()
  const { limpar } = useCarrinho()
  const navigate = useNavigate()

  // dispara a impressão da comanda do cliente e limpa o carrinho
  useEffect(() => {
    limpar()
    if (id) {
      const w = window.open(`/imprimir/comanda/${id}`, '_blank')
      // se o pop-up for bloqueado, o botão abaixo continua disponível
      void w
    }
    const t = setTimeout(() => navigate({ to: '/totem' }), 15000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="grid h-24 w-24 place-items-center rounded-full bg-green-500 text-white">
        <IconeCheck width={52} height={52} />
      </div>
      <h1 className="mt-6 text-5xl font-extrabold">
        Pedido {numero ? `#${numero}` : 'realizado'}
      </h1>
      <p className="mt-2 text-2xl text-white/80">Pagamento aprovado!</p>
      <p className="mt-6 text-white/60">Retire seu comprovante abaixo.</p>

      <div className="mt-10 flex gap-4">
        {id && (
          <Botao
            variante="secundario"
            onClick={() => window.open(`/imprimir/comanda/${id}`, '_blank')}
          >
            Imprimir senha novamente
          </Botao>
        )}
        <Botao onClick={() => navigate({ to: '/totem' })}>Concluir</Botao>
      </div>
    </div>
  )
}
