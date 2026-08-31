import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCarrinho } from '#/lib/carrinho'
import { Botao } from '#/components/totem/Botao'
import { IconeCheck } from '#/components/icones'

export const Route = createFileRoute('/totem/pedido-realizado')({ component: PedidoRealizado })

function PedidoRealizado() {
  const { limpar, nomeCliente } = useCarrinho()
  const navigate = useNavigate()
  const [numero] = useState(() => 100 + Math.floor(Math.random() * 900))
  const [nome] = useState(nomeCliente)
  const [falhaImpressao, setFalhaImpressao] = useState(false)

  useEffect(() => {
    // MOCK impressão local da senha do cliente
    const t = setTimeout(() => navigate({ to: '/totem' }), 12000)
    return () => clearTimeout(t)
  }, [navigate])

  function encerrar() {
    limpar()
    navigate({ to: '/totem' })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="grid h-24 w-24 place-items-center rounded-full bg-green-500 text-white">
        <IconeCheck width={52} height={52} />
      </div>
      <h1 className="mt-6 text-5xl font-extrabold">Pedido #{numero}</h1>
      {nome && <p className="mt-1 text-xl text-white/70">{nome}</p>}
      <p className="mt-2 text-2xl text-white/80">Pagamento aprovado!</p>
      <p className="mt-6 text-white/60">Retire seu comprovante abaixo.</p>

      <div className="mt-10 flex gap-4">
        {falhaImpressao ? (
          <Botao onClick={() => setFalhaImpressao(false)}>Imprimir senha novamente</Botao>
        ) : (
          <Botao variante="secundario" onClick={() => setFalhaImpressao(true)}>
            Simular falha de impressão
          </Botao>
        )}
        <Botao onClick={encerrar}>Concluir</Botao>
      </div>
    </div>
  )
}
