import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { buscarPedido, type PedidoDb } from '#/lib/painel/pedidosDb'
import { ComandaCliente } from '#/components/impressao/Folhas'

export const Route = createFileRoute('/imprimir/comanda/$id')({ component: Pagina })

function Pagina() {
  const { id } = Route.useParams()
  const [pedido, setPedido] = useState<PedidoDb | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    buscarPedido(id)
      .then((p) => {
        setPedido(p)
        if (p) setTimeout(() => window.print(), 300)
      })
      .catch((e) => setErro((e as Error).message))
  }, [id])

  if (erro) return <p style={{ padding: 16 }}>Erro: {erro}</p>
  if (!pedido) return <p style={{ padding: 16 }}>Carregando…</p>

  return (
    <div style={{ background: '#fff', minHeight: '100vh', paddingTop: 12 }}>
      <div className="no-print" style={{ textAlign: 'center', marginBottom: 12 }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: '8px 20px',
            borderRadius: 999,
            background: '#FF6A00',
            color: '#fff',
            fontWeight: 700,
            border: 0,
          }}
        >
          Imprimir comanda
        </button>
      </div>
      <ComandaCliente pedido={pedido} />
    </div>
  )
}
