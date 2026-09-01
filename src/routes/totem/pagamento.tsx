import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { cn } from '#/lib/cn'
import { useCarrinho } from '#/lib/carrinho'
import { formatarBRL } from '#/lib/formato'
import { criarPedido, type CriarPedidoInput } from '#/server/criarPedido'
import { CabecalhoTotem } from '#/components/totem/CabecalhoTotem'
import { RodapeVoltar } from '#/components/totem/RodapeVoltar'
import { IconeCartao, IconePix } from '#/components/icones'

export const Route = createFileRoute('/totem/pagamento')({ component: Pagamento })

type Forma = 'cartao' | 'pix'

function Pagamento() {
  const carrinho = useCarrinho()
  const [forma, setForma] = useState<Forma | null>(null)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const navigate = useNavigate()

  async function pagar() {
    if (!forma || processando) return
    setProcessando(true)
    setErro(null)

    // MOCK: aqui entra a bridge nativa da maquininha (Fase 3).
    // Hoje o "pagamento" é aprovado direto e o pedido já nasce como 'pago'.
    const payload: CriarPedidoInput = {
      nomeCliente: carrinho.nomeCliente,
      telefone: carrinho.telefone,
      tipoConsumo: carrinho.tipoConsumo ?? 'comer_aqui',
      modoEntrega: carrinho.modoEntrega,
      endereco: carrinho.endereco,
      formaPagamento: forma === 'pix' ? 'pix' : 'cartao_credito',
      itens: carrinho.itens.map((i) => ({
        produtoId: i.produto.id,
        quantidade: i.quantidade,
        personalizacao: i.personalizacao,
        adicionalIds: i.adicionais.map((a) => a.id),
        observacoes: i.observacoes,
      })),
    }

    try {
      const res = await criarPedido({ data: payload })
      if (res.aguardandoPagamento) {
        navigate({
          to: '/totem/aguardando-pagamento',
          search: {
            id: res.pedidoId,
            numero: res.numeroPedido,
            valor: carrinho.valorTotal,
          },
        })
      } else {
        navigate({
          to: '/totem/pedido-realizado',
          search: { numero: res.numeroPedido },
        })
      }
    } catch (e) {
      setErro((e as Error).message || 'Não foi possível concluir o pedido.')
      setProcessando(false)
    }
  }

  return (
    <>
      <CabecalhoTotem />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-8 py-10">
        <h1 className="text-4xl font-extrabold">Como deseja pagar?</h1>
        <p className="mt-2 text-white/60">Total a pagar: {formatarBRL(carrinho.valorTotal)}</p>

        <div className="mt-10 flex w-full gap-5">
          <OpcaoPagamento
            ativo={forma === 'cartao'}
            aoClicar={() => setForma('cartao')}
            icone={<IconeCartao width={44} height={44} />}
            titulo="Cartão"
            sub="Crédito ou débito"
          />
          <OpcaoPagamento
            ativo={forma === 'pix'}
            aoClicar={() => setForma('pix')}
            icone={<IconePix width={44} height={44} />}
            titulo="Pix"
            sub="QR Code na maquininha"
          />
        </div>

        <p className="mt-8 text-center text-white/60">
          Siga na maquininha ao lado para concluir o pagamento.
        </p>

        {erro && <p className="mt-4 text-center text-sm text-red-400">{erro}</p>}

        <button
          onClick={pagar}
          disabled={!forma || processando}
          className="mt-8 w-full rounded-pill bg-laranja px-8 py-6 text-xl font-extrabold text-white transition hover:bg-laranja-escuro disabled:opacity-40"
        >
          {processando ? 'Processando…' : `Pagar ${formatarBRL(carrinho.valorTotal)}`}
        </button>
      </div>
      <div className="px-8 pb-8">
        <RodapeVoltar />
      </div>
    </>
  )
}

function OpcaoPagamento({
  ativo,
  aoClicar,
  icone,
  titulo,
  sub,
}: {
  ativo: boolean
  aoClicar: () => void
  icone: React.ReactNode
  titulo: string
  sub: string
}) {
  return (
    <button
      onClick={aoClicar}
      className={cn(
        'flex flex-1 flex-col items-center gap-3 rounded-card border-2 p-8 transition',
        ativo ? 'border-laranja bg-laranja/10' : 'border-white/15 hover:border-white/35',
      )}
    >
      <span className="text-laranja">{icone}</span>
      <span className="text-xl font-bold">{titulo}</span>
      <span className="text-sm text-white/50">{sub}</span>
    </button>
  )
}
