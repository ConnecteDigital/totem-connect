import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '#/lib/auth'
import { formatarBRL } from '#/lib/formato'
import { faturamentoPeriodo, type LinhaRelatorio } from '#/lib/painel/pedidosDb'

export const Route = createFileRoute('/_painel/relatorios/')({ component: Relatorios })

type Periodo = 'hoje' | 'semana' | 'mes' | 'custom'

function intervalo(p: Periodo, de: string, ate: string): [string, string] {
  const agora = new Date()
  const inicioDia = new Date(agora)
  inicioDia.setHours(0, 0, 0, 0)

  if (p === 'hoje') return [inicioDia.toISOString(), agora.toISOString()]
  if (p === 'semana') {
    const d = new Date(inicioDia)
    d.setDate(d.getDate() - 6)
    return [d.toISOString(), agora.toISOString()]
  }
  if (p === 'mes') {
    const d = new Date(agora.getFullYear(), agora.getMonth(), 1)
    return [d.toISOString(), agora.toISOString()]
  }
  const dini = de ? new Date(de + 'T00:00:00') : inicioDia
  const dfim = ate ? new Date(ate + 'T23:59:59') : agora
  return [dini.toISOString(), dfim.toISOString()]
}

function Relatorios() {
  const { usuario } = useAuth()
  const estId = usuario?.estabelecimento_id ?? null

  const [periodo, setPeriodo] = useState<Periodo>('semana')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [linhas, setLinhas] = useState<LinhaRelatorio[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  const carregar = useCallback(async () => {
    if (!estId) return
    setCarregando(true)
    setErro(null)
    try {
      const [d, a] = intervalo(periodo, de, ate)
      setLinhas(await faturamentoPeriodo(estId, d, a))
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setCarregando(false)
    }
  }, [estId, periodo, de, ate])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const resumo = useMemo(() => {
    const total = linhas.reduce((s, l) => s + l.valor_total, 0)
    const n = linhas.length
    return { total, n, ticket: n ? total / n : 0 }
  }, [linhas])

  function exportarCSV() {
    const cab = ['numero', 'data', 'cliente', 'consumo', 'entrega', 'status', 'pagamento', 'valor']
    const linhasCsv = linhas.map((l) =>
      [
        l.numero_pedido,
        new Date(l.criado_em).toLocaleString('pt-BR'),
        l.nome_cliente ?? '',
        l.tipo_consumo ?? '',
        l.modo_entrega ?? '',
        l.status,
        l.forma_pagamento ?? '',
        l.valor_total.toFixed(2).replace('.', ','),
      ].join(';'),
    )
    const blob = new Blob(['﻿' + [cab.join(';'), ...linhasCsv].join('\n')], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `faturamento-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!estId) return <p className="text-cinza-texto">Usuário sem estabelecimento vinculado.</p>

  return (
    <div>
      <h1 className="text-xl font-bold">Faturamento</h1>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex gap-1 rounded-lg bg-cinza-claro p-1">
          {(['hoje', 'semana', 'mes', 'custom'] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={
                'rounded-md px-3 py-1.5 text-sm font-medium ' +
                (periodo === p ? 'bg-white shadow-sm' : 'text-cinza-texto')
              }
            >
              {p === 'hoje' ? 'Hoje' : p === 'semana' ? '7 dias' : p === 'mes' ? 'Mês' : 'Período'}
            </button>
          ))}
        </div>
        {periodo === 'custom' && (
          <>
            <input
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="rounded-lg border border-cinza-medio px-2 py-1.5 text-sm"
            />
            <input
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="rounded-lg border border-cinza-medio px-2 py-1.5 text-sm"
            />
          </>
        )}
        <button
          onClick={exportarCSV}
          disabled={!linhas.length}
          className="ml-auto rounded-pill border border-cinza-medio px-4 py-2 text-sm font-medium hover:bg-cinza-claro disabled:opacity-40"
        >
          Exportar CSV
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Cartao titulo="Pedidos" valor={String(resumo.n)} />
        <Cartao titulo="Total vendido" valor={formatarBRL(resumo.total)} />
        <Cartao titulo="Ticket médio" valor={formatarBRL(resumo.ticket)} />
      </div>

      {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}

      <div className="mt-4 overflow-x-auto rounded-xl border border-cinza-medio bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cinza-claro text-left text-cinza-texto">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Consumo</th>
              <th className="px-3 py-2">Pagamento</th>
              <th className="px-3 py-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} className="border-t border-cinza-medio">
                <td className="px-3 py-2 font-medium">#{l.numero_pedido}</td>
                <td className="px-3 py-2">{new Date(l.criado_em).toLocaleString('pt-BR')}</td>
                <td className="px-3 py-2">{l.nome_cliente ?? '—'}</td>
                <td className="px-3 py-2">
                  {l.tipo_consumo === 'comer_aqui' ? 'Comer aqui' : 'Para viagem'}
                  {l.modo_entrega ? ` (${l.modo_entrega})` : ''}
                </td>
                <td className="px-3 py-2">{l.forma_pagamento ?? '—'}</td>
                <td className="px-3 py-2 text-right font-medium">{formatarBRL(l.valor_total)}</td>
              </tr>
            ))}
            {!carregando && linhas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-cinza-texto">
                  Nenhum pedido no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Cartao({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-cinza-medio bg-white p-4">
      <div className="text-sm text-cinza-texto">{titulo}</div>
      <div className="mt-1 text-2xl font-bold">{valor}</div>
    </div>
  )
}
