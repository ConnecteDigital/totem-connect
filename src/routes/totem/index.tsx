import { useEffect } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useCarrinho } from '#/lib/carrinho'
import { LogoConnect } from '#/components/totem/CabecalhoTotem'
import { IconeToque } from '#/components/icones'

export const Route = createFileRoute('/totem/')({ component: TelaInicial })

const NOME_ESTABELECIMENTO = 'Hamburgueria Piloto'

function TelaInicial() {
  const { limpar } = useCarrinho()

  // sessão nova a cada vez que volta pra tela ociosa
  useEffect(() => {
    limpar()
  }, [limpar])

  return (
    <Link to="/totem/onde-consumir" className="flex h-full flex-col">
      {/* logo da Connect — pequena, discreta, só marca-d'água */}
      <div className="px-10 pt-7">
        <LogoConnect tamanho={26} />
      </div>

      {/* meio — tudo centralizado */}
      <div className="flex flex-1 flex-col items-center justify-center px-10 text-center">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-laranja" />
          <span className="text-lg font-bold uppercase tracking-widest text-white/90">
            {NOME_ESTABELECIMENTO}
          </span>
        </div>

        <h1 className="mt-6 text-7xl font-extrabold leading-[1.05] tracking-tight">
          TOQUE PARA
          <br />
          <span className="text-laranja">COMEÇAR</span>
        </h1>
        <div className="mt-5 h-1 w-24 rounded bg-laranja" />
        <p className="mt-6 max-w-md text-xl text-white/70">
          Faça seu pedido de forma <strong className="text-white">rápida e prática!</strong>
        </p>
      </div>

      {/* CTA colado na parte inferior, só cantos de cima arredondados */}
      <div className="flex items-center justify-center gap-4 rounded-t-[2.5rem] bg-laranja py-9 text-3xl font-extrabold text-white shadow-[0_-16px_40px_-12px_rgba(255,106,0,0.6)]">
        <IconeToque width={38} height={38} />
        TOQUE PARA COMEÇAR
      </div>
    </Link>
  )
}
