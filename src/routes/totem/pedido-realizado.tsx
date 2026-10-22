import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCarrinho } from '#/lib/carrinho'
import { imprimirComandaCliente, impressaoDisponivel } from '#/lib/impressora/imprimir'
import { getPedidoImpressao } from '#/server/pedidoImpressao'
import { Botao } from '#/components/totem/Botao'
import { IconeCheck } from '#/components/icones'

const VOLTAR_EM_S = 12

export const Route = createFileRoute('/totem/pedido-realizado')({
  component: PedidoRealizado,
  validateSearch: (s: Record<string, unknown>) => ({
    numero: Number(s.numero) || 0,
    id: typeof s.id === 'string' ? s.id : '',
  }),
})

type EstadoImpressao = 'imprimindo' | 'ok' | 'falhou'

function PedidoRealizado() {
  const { numero, id } = Route.useSearch()
  const { limpar } = useCarrinho()
  const navigate = useNavigate()
  const [impressao, setImpressao] = useState<EstadoImpressao>(id ? 'imprimindo' : 'ok')
  const jaImprimiu = useRef(false)

  useEffect(() => {
    limpar()
    const t = setTimeout(() => navigate({ to: '/totem' }), VOLTAR_EM_S * 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Imprime a senha na impressora do totem (USB). Uma vez só por pedido.
  useEffect(() => {
    if (!id || jaImprimiu.current) return
    jaImprimiu.current = true
    // Aparelho sem como imprimir (nem ponte nativa do app, nem WebUSB): a impressão não é feita
    // por aqui (ex.: agente no PC), então não tenta nem mostra aviso de falha.
    if (!impressaoDisponivel()) {
      setImpressao('ok')
      return
    }
    ;(async () => {
      try {
        const pedido = await getPedidoImpressao({ data: { id } })
        if (!pedido) throw new Error('Pedido não encontrado.')
        await imprimirComandaCliente(pedido)
        setImpressao('ok')
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[impressora] falha ao imprimir a senha:', e)
        setImpressao('falhou')
      }
    })()
  }, [id])

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="grid h-24 w-24 place-items-center rounded-full bg-green-500 text-white">
        <IconeCheck width={52} height={52} />
      </div>
      <h1 className="mt-6 text-6xl font-extrabold">
        Pedido {numero ? `#${numero}` : 'realizado'}
      </h1>
      <p className="mt-3 text-2xl text-white/80">Pagamento aprovado!</p>

      {impressao === 'imprimindo' && (
        <p className="mt-6 max-w-md text-white/60">Imprimindo sua senha…</p>
      )}
      {impressao === 'ok' && (
        <p className="mt-6 max-w-md text-white/60">
          Retire sua senha abaixo e acompanhe o painel. Vamos te chamar quando estiver pronto.
        </p>
      )}
      {impressao === 'falhou' && (
        <p className="mt-6 max-w-md text-amber-300">
          Não conseguimos imprimir sua senha. Guarde o número{' '}
          <strong>{numero ? `#${numero}` : 'do pedido'}</strong> e acompanhe o painel — ou chame
          o atendente.
        </p>
      )}

      <Botao className="mt-10" onClick={() => navigate({ to: '/totem' })}>
        Fazer novo pedido
      </Botao>
      <p className="mt-4 text-sm text-white/30">
        Voltando à tela inicial em {VOLTAR_EM_S}s…
      </p>
    </div>
  )
}
