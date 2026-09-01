import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { formatarBRL } from '#/lib/formato'
import { cancelarPagamento, getStatusPedido } from '#/server/pagamento'
import { CabecalhoTotem } from '#/components/totem/CabecalhoTotem'
import { Botao } from '#/components/totem/Botao'
import { IconeCartao } from '#/components/icones'

const TIMEOUT_S = 150

export const Route = createFileRoute('/totem/aguardando-pagamento')({
  component: Aguardando,
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === 'string' ? s.id : '',
    numero: Number(s.numero) || 0,
    valor: Number(s.valor) || 0,
  }),
})

function Aguardando() {
  const { id, numero, valor } = Route.useSearch()
  const navigate = useNavigate()
  const [restante, setRestante] = useState(TIMEOUT_S)
  const [recusado, setRecusado] = useState(false)
  const [encerrando, setEncerrando] = useState(false)
  const feito = useRef(false)

  useEffect(() => {
    if (!id) {
      navigate({ to: '/totem' })
      return
    }
    let vivo = true

    const poll = window.setInterval(async () => {
      if (!vivo || feito.current) return
      try {
        const s = await getStatusPedido({ data: { id } })
        if (s.status === 'em_preparo' || s.status === 'pronto') {
          feito.current = true
          navigate({ to: '/totem/pedido-realizado', search: { numero, id } })
        } else if (s.status === 'cancelado') {
          feito.current = true
          navigate({ to: '/totem' })
        } else if (s.pagamento === 'recusado') {
          setRecusado(true)
        } else {
          setRecusado(false)
        }
      } catch {
        /* rede instável — tenta de novo no próximo tick */
      }
    }, 2000)

    const conta = window.setInterval(() => {
      setRestante((r) => {
        if (r <= 1) {
          window.clearInterval(conta)
          void encerrar()
          return 0
        }
        return r - 1
      })
    }, 1000)

    return () => {
      vivo = false
      window.clearInterval(poll)
      window.clearInterval(conta)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function encerrar() {
    if (feito.current || encerrando) return
    setEncerrando(true)
    feito.current = true
    try {
      await cancelarPagamento({ data: { pedidoId: id } })
    } catch {
      /* ignora */
    }
    navigate({ to: '/totem' })
  }

  return (
    <>
      <CabecalhoTotem />
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-8 py-6 text-center">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-superficie text-laranja">
          <IconeCartao width={52} height={52} />
        </div>

        {recusado ? (
          <>
            <h1 className="mt-6 text-4xl font-extrabold">Pagamento recusado</h1>
            <p className="mt-3 text-white/70">
              Tente novamente na maquininha ou escolha outra forma de pagamento.
            </p>
            <p className="mt-2 text-white/40">Aguardando nova tentativa…</p>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-4xl font-extrabold">Pague na maquininha</h1>
            <p className="mt-3 text-xl text-white/80">
              Pedido #{numero} · {formatarBRL(valor)}
            </p>
            <p className="mt-2 text-white/60">
              Siga as instruções na maquininha ao lado. Aproxime, insira o cartão ou
              escaneie o QR Code do Pix.
            </p>
          </>
        )}

        <div className="mt-8 h-2 w-full max-w-sm overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-laranja transition-[width] duration-1000 ease-linear"
            style={{ width: `${(restante / TIMEOUT_S) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-white/40">Expira em {restante}s</p>

        <Botao variante="secundario" className="mt-8" disabled={encerrando} onClick={encerrar}>
          Cancelar pagamento
        </Botao>
      </div>
    </>
  )
}
