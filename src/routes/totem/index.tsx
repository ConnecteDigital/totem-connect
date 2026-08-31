import { useEffect } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useCarrinho } from '#/lib/carrinho'
import { LogoConnect } from '#/components/totem/CabecalhoTotem'
import { IconeToque, IconeAjuda, IconeGlobo, IconeChevron } from '#/components/icones'

export const Route = createFileRoute('/totem/')({ component: TelaInicial })

function TelaInicial() {
  const { limpar } = useCarrinho()

  // sessão nova a cada vez que volta pra tela ociosa
  useEffect(() => {
    limpar()
  }, [limpar])

  return (
    <Link to="/totem/onde-consumir" className="flex min-h-screen flex-col">
      {/* topo */}
      <div className="flex items-center justify-between px-10 pt-8">
        <div className="flex items-center gap-3">
          <LogoConnect tamanho={34} />
          <div className="leading-tight">
            <div className="text-xl font-bold">Hamburgueria Piloto</div>
            <div className="text-xs text-white/50">por Connect Digital</div>
          </div>
        </div>
        <span className="flex items-center gap-2 rounded-pill border border-white/20 px-4 py-2 text-sm">
          <IconeGlobo width={18} height={18} />
          Português
          <IconeChevron width={16} height={16} />
        </span>
      </div>

      {/* meio */}
      <div className="grid flex-1 items-center gap-6 px-10 md:grid-cols-2">
        <div>
          <h1 className="text-6xl font-extrabold leading-[1.05] tracking-tight">
            TOQUE PARA
            <br />
            <span className="text-laranja">COMEÇAR</span>
          </h1>
          <div className="mt-4 h-1 w-24 rounded bg-laranja" />
          <p className="mt-6 max-w-sm text-xl text-white/70">
            Faça seu pedido de forma <strong className="text-white">rápida e prática!</strong>
          </p>
        </div>

        <div className="grid aspect-[4/3] w-full place-items-center rounded-card bg-superficie text-[120px]">
          {/* trocar por imagem real do produto */}
          🍔
        </div>
      </div>

      {/* faixa inferior — CTA grande */}
      <div className="px-10 pb-10">
        <div className="flex w-full items-center justify-center gap-4 rounded-pill bg-laranja px-10 py-7 text-2xl font-extrabold text-white shadow-[0_16px_40px_-12px_rgba(255,106,0,0.7)]">
          <IconeToque width={34} height={34} />
          TOQUE PARA COMEÇAR
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-white/50">
          <IconeAjuda width={18} height={18} />
          Precisa de ajuda? Fale com nossa equipe.
        </div>
      </div>
    </Link>
  )
}
