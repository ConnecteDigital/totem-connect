import { useCallback, useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { formatarBRL } from '#/lib/formato'
import { confirmarPagamento, listarPagamentosPendentes } from '#/server/pagamento'

export const Route = createFileRoute('/dev/maquininha')({ component: SimuladorMaquininha })

type Pendente = {
  id: string
  numero_pedido: number
  nome_cliente: string | null
  valor_total: number
  forma_pagamento: string | null
  criado_em: string
}

function SimuladorMaquininha() {
  const [lista, setLista] = useState<Pendente[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      setLista((await listarPagamentosPendentes()) as Pendente[])
      setErro(null)
    } catch (e) {
      setErro((e as Error).message)
    }
  }, [])

  useEffect(() => {
    void carregar()
    const t = setInterval(carregar, 2000)
    return () => clearInterval(t)
  }, [carregar])

  async function responder(p: Pendente, resultado: 'aprovado' | 'recusado') {
    setOcupado(p.id)
    try {
      await confirmarPagamento({
        data: {
          pedidoId: p.id,
          resultado,
          transacaoId: resultado === 'aprovado' ? `SIM-${Date.now()}` : null,
          bandeira: resultado === 'aprovado' ? 'SIMULADO' : null,
        },
      })
      await carregar()
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-900 p-6 text-white">
      <h1 className="text-xl font-bold">Simulador da maquininha</h1>
      <p className="mt-1 text-sm text-white/50">
        Substitui o app da Smart 2 enquanto o SmartPOS não está integrado. Só use em teste.
      </p>

      {erro && <p className="mt-4 text-sm text-red-400">{erro}</p>}

      <div className="mt-6 space-y-3">
        {lista.length === 0 && (
          <p className="text-white/40">Nenhum pagamento pendente.</p>
        )}
        {lista.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-neutral-800 p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="font-bold">
                Pedido #{p.numero_pedido} · {formatarBRL(p.valor_total)}
              </div>
              <div className="text-sm text-white/50">
                {p.nome_cliente ?? 'sem nome'} · {p.forma_pagamento ?? '—'} ·{' '}
                {new Date(p.criado_em).toLocaleTimeString('pt-BR')}
              </div>
            </div>
            <button
              disabled={ocupado === p.id}
              onClick={() => responder(p, 'aprovado')}
              className="rounded-pill bg-green-600 px-5 py-2 text-sm font-bold hover:bg-green-500 disabled:opacity-50"
            >
              Aprovar
            </button>
            <button
              disabled={ocupado === p.id}
              onClick={() => responder(p, 'recusado')}
              className="rounded-pill bg-red-600 px-5 py-2 text-sm font-bold hover:bg-red-500 disabled:opacity-50"
            >
              Recusar
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
