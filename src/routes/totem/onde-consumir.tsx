import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCarrinho, type TipoConsumo } from '#/lib/carrinho'
import { CabecalhoTotem } from '#/components/totem/CabecalhoTotem'
import { CarrinhoLateral } from '#/components/totem/CarrinhoLateral'
import { CardOpcao } from '#/components/totem/CardOpcao'
import { RodapeVoltar } from '#/components/totem/RodapeVoltar'
import { IconeBanqueta, IconeSacola } from '#/components/icones'

export const Route = createFileRoute('/totem/onde-consumir')({ component: OndeConsumir })

function OndeConsumir() {
  const { definirTipoConsumo } = useCarrinho()
  const navigate = useNavigate()

  function escolher(tipo: TipoConsumo) {
    definirTipoConsumo(tipo)
    navigate({ to: tipo === 'para_viagem' ? '/totem/modo-entrega' : '/totem/cardapio' })
  }

  return (
    <>
      <CabecalhoTotem />

      <div className="flex flex-1 gap-8 px-8 py-6">
        <div className="flex flex-1 flex-col items-center">
          <h1 className="mt-6 text-center text-5xl font-extrabold leading-tight">
            Onde você vai
            <br />
            <span className="text-laranja">consumir?</span>
          </h1>
          <div className="mt-3 h-1 w-24 rounded bg-laranja" />
          <p className="mt-4 text-white/60">Escolha uma opção para continuar 👇</p>

          <div className="mt-10 flex w-full max-w-3xl gap-6">
            <CardOpcao
              icone={<IconeBanqueta width={72} height={72} />}
              titulo="Comer aqui"
              descricao="Quero comer no local"
              aoEscolher={() => escolher('comer_aqui')}
            />
            <CardOpcao
              icone={<IconeSacola width={72} height={72} />}
              titulo="Para viagem"
              descricao="Quero levar meu pedido"
              aoEscolher={() => escolher('para_viagem')}
            />
          </div>
        </div>

        <CarrinhoLateral />
      </div>

      <div className="px-8 pb-8">
        <RodapeVoltar />
      </div>
    </>
  )
}
