import { useCallback, useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '#/lib/auth'
import { formatarBRL } from '#/lib/formato'
import { cn } from '#/lib/cn'
import {
  PROXIMO_STATUS,
  ROTULO_STATUS,
  assinarPedidos,
  listarEntreguesHoje,
  listarFila,
  mudarStatus,
  type PedidoDb,
  type StatusPedido,
} from '#/lib/painel/pedidosDb'

export const Route = createFileRoute('/_painel/pdv/')({ component: Fila })

const COLUNAS_ATIVAS: StatusPedido[] = ['em_preparo', 'pronto']

function Fila() {
  const { usuario } = useAuth()
  const estId = usuario?.estabelecimento_id ?? null
  const [ativos, setAtivos] = useState<PedidoDb[]>([])
  const [entregues, setEntregues] = useState<PedidoDb[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [aberto, setAberto] = useState<PedidoDb | null>(null)
  const [aoVivo, setAoVivo] = useState(false)

  const carregar = useCallback(async () => {
    if (!estId) return
    try {
      const [a, e] = await Promise.all([listarFila(estId), listarEntreguesHoje(estId)])
      setAtivos(a)
      setEntregues(e)
      setErro(null)
    } catch (e) {
      setErro((e as Error).message)
    }
  }, [estId])

  useEffect(() => {
    if (!estId) return
    void carregar()
    // Realtime + polling de segurança (caso o socket caia)
    const desassinar = assinarPedidos(
      estId,
      () => void carregar(),
      (conectado) => setAoVivo(conectado),
    )
    const t = setInterval(carregar, 15000)
    return () => {
      desassinar()
      clearInterval(t)
    }
  }, [estId, carregar])

  if (!estId)
    return <p className="text-cinza-texto">Usuário sem estabelecimento vinculado.</p>
  if (erro) return <p className="text-red-600">Erro: {erro}</p>

  async function avancar(p: PedidoDb) {
    const prox = PROXIMO_STATUS[p.status]
    if (!prox) return
    await mudarStatus(p.id, prox)
    setAberto(null)
    void carregar()
  }
  async function cancelar(p: PedidoDb) {
    if (!confirm(`Cancelar o pedido #${p.numero_pedido}? Sai do faturamento.`)) return
    await mudarStatus(p.id, 'cancelado')
    setAberto(null)
    void carregar()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Fila de pedidos</h1>
        <span className="flex items-center gap-2 text-sm text-cinza-texto">
          <span
            className={cn(
              'inline-block h-2 w-2 rounded-full',
              aoVivo ? 'bg-green-500' : 'bg-cinza-medio',
            )}
          />
          {ativos.length} ativo{ativos.length === 1 ? '' : 's'} ·{' '}
          {aoVivo ? 'ao vivo' : 'atualizando'}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {COLUNAS_ATIVAS.map((col) => {
          const lista = ativos.filter((p) =>
            col === 'em_preparo'
              ? p.status === 'em_preparo' || p.status === 'pago'
              : p.status === col,
          )
          return (
            <Coluna key={col} titulo={ROTULO_STATUS[col]} n={lista.length}>
              {lista.map((p) => (
                <CardPedido key={p.id} pedido={p} onClick={() => setAberto(p)} />
              ))}
            </Coluna>
          )
        })}
        <Coluna titulo="Entregue (hoje)" n={entregues.length} tom="muted">
          {entregues.map((p) => (
            <CardPedido key={p.id} pedido={p} onClick={() => setAberto(p)} muted />
          ))}
        </Coluna>
      </div>

      {aberto && (
        <DetalhePedido
          pedido={aberto}
          aoFechar={() => setAberto(null)}
          aoAvancar={() => avancar(aberto)}
          aoCancelar={() => cancelar(aberto)}
        />
      )}
    </div>
  )
}

function Coluna({
  titulo,
  n,
  tom,
  children,
}: {
  titulo: string
  n: number
  tom?: 'muted'
  children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-xl p-3', tom === 'muted' ? 'bg-cinza-claro/60' : 'bg-cinza-claro')}>
      <h2 className="mb-3 flex items-center justify-between text-sm font-bold uppercase tracking-wide text-cinza-texto">
        {titulo}
        <span className="rounded-full bg-white px-2 py-0.5 text-xs">{n}</span>
      </h2>
      <div className="space-y-2">
        {children}
        {n === 0 && <p className="py-4 text-center text-xs text-cinza-texto">—</p>}
      </div>
    </div>
  )
}

function CardPedido({
  pedido: p,
  onClick,
  muted,
}: {
  pedido: PedidoDb
  onClick: () => void
  muted?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border bg-white p-3 text-left transition hover:border-laranja',
        muted ? 'border-cinza-medio opacity-70' : 'border-cinza-medio',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-bold">#{p.numero_pedido}</span>
        <span className="text-xs text-cinza-texto">
          {new Date(p.criado_em).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <div className="text-sm font-medium">{p.nome_cliente ?? 'Sem nome'}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        <Tag>{p.tipo_consumo === 'comer_aqui' ? 'Comer aqui' : 'Para viagem'}</Tag>
        {p.modo_entrega && <Tag>{p.modo_entrega === 'entrega' ? 'Entrega' : 'Retirada'}</Tag>}
      </div>
      <div className="mt-1 text-xs text-cinza-texto">
        {p.pedido_itens.reduce((s, i) => s + i.quantidade, 0)} itens ·{' '}
        {formatarBRL(p.valor_total)}
      </div>
    </button>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-cinza-claro px-1.5 py-0.5 text-[11px] font-medium text-cinza-texto ring-1 ring-cinza-medio">
      {children}
    </span>
  )
}

function DetalhePedido({
  pedido,
  aoFechar,
  aoAvancar,
  aoCancelar,
}: {
  pedido: PedidoDb
  aoFechar: () => void
  aoAvancar: () => void
  aoCancelar: () => void
}) {
  const prox = PROXIMO_STATUS[pedido.status]
  const finalizado = pedido.status === 'entregue' || pedido.status === 'cancelado'
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={aoFechar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Pedido #{pedido.numero_pedido}</h2>
          <span className="text-sm text-cinza-texto">{ROTULO_STATUS[pedido.status]}</span>
        </div>
        <p className="mt-1 text-sm">
          {pedido.nome_cliente ?? 'Sem nome'} ·{' '}
          {pedido.tipo_consumo === 'comer_aqui' ? 'Comer aqui' : 'Para viagem'}
          {pedido.modo_entrega ? ` · ${pedido.modo_entrega}` : ''}
        </p>

        {pedido.modo_entrega === 'entrega' && (
          <div className="mt-2 rounded-lg bg-cinza-claro p-3 text-sm">
            <div className="font-medium">Entrega</div>
            <div>
              {pedido.entrega_logradouro}, {pedido.entrega_numero}
              {pedido.entrega_complemento ? ` — ${pedido.entrega_complemento}` : ''}
            </div>
            <div>
              {pedido.entrega_bairro} · {pedido.entrega_cidade} · {pedido.entrega_cep}
            </div>
            {pedido.entrega_referencia && <div>Ref: {pedido.entrega_referencia}</div>}
            {pedido.telefone_cliente && <div>Tel: {pedido.telefone_cliente}</div>}
          </div>
        )}

        <ul className="mt-4 space-y-2">
          {pedido.pedido_itens.map((it) => (
            <li key={it.id} className="border-b border-cinza-medio pb-2 text-sm">
              <div className="flex justify-between font-medium">
                <span>
                  {it.quantidade}× {it.produto_nome}
                </span>
                <span>{formatarBRL(it.preco_unitario * it.quantidade)}</span>
              </div>
              {it.pedido_item_adicionais.map((a) => (
                <div key={a.id} className="pl-4 text-xs text-cinza-texto">
                  + {a.adicional_nome}
                </div>
              ))}
              {it.observacoes && (
                <div className="pl-4 text-xs italic text-cinza-texto">obs: {it.observacoes}</div>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-3 flex justify-between font-bold">
          <span>Total</span>
          <span>{formatarBRL(pedido.valor_total)}</span>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={`/imprimir/cozinha/${pedido.id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-pill border border-cinza-medio px-4 py-2 text-sm font-medium hover:bg-cinza-claro"
          >
            Imprimir cozinha
          </a>
          <a
            href={`/imprimir/comanda/${pedido.id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-pill border border-cinza-medio px-4 py-2 text-sm font-medium hover:bg-cinza-claro"
          >
            Imprimir comanda
          </a>
          {!finalizado && (
            <button
              onClick={aoCancelar}
              className="rounded-pill px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Cancelar
            </button>
          )}
          {prox && (
            <button
              onClick={aoAvancar}
              className="ml-auto rounded-pill bg-laranja px-5 py-2 text-sm font-bold text-white hover:bg-laranja-escuro"
            >
              Marcar como {ROTULO_STATUS[prox]}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
