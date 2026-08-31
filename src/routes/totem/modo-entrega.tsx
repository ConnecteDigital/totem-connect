import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCarrinho, type ModoEntrega } from '#/lib/carrinho'
import { CabecalhoTotem } from '#/components/totem/CabecalhoTotem'
import { CardOpcao } from '#/components/totem/CardOpcao'
import { CarrinhoLateral } from '#/components/totem/CarrinhoLateral'
import { RodapeVoltar } from '#/components/totem/RodapeVoltar'
import { IconeSacola, IconeSeta } from '#/components/icones'

export const Route = createFileRoute('/totem/modo-entrega')({ component: ModoEntregaTela })

function ModoEntregaTela() {
  const { definirModoEntrega } = useCarrinho()
  const navigate = useNavigate()

  function escolher(m: ModoEntrega) {
    definirModoEntrega(m)
    navigate({ to: m === 'entrega' ? '/totem/endereco' : '/totem/cardapio' })
  }

  return (
    <>
      <CabecalhoTotem />
      <div className="flex flex-1 gap-8 px-8 py-6">
        <div className="flex flex-1 flex-col items-center">
          <h1 className="mt-6 text-center text-5xl font-extrabold leading-tight">
            Como quer <span className="text-laranja">receber?</span>
          </h1>
          <div className="mt-3 h-1 w-24 rounded bg-laranja" />

          <div className="mt-10 flex w-full max-w-3xl gap-6">
            <CardOpcao
              icone={<IconeSacola width={72} height={72} />}
              titulo="Retirar no balcão"
              descricao="Vou buscar quando ficar pronto"
              aoEscolher={() => escolher('retirada')}
            />
            <CardOpcao
              icone={<IconeSeta width={72} height={72} />}
              titulo="Receber em casa"
              descricao="Entrega no meu endereço"
              aoEscolher={() => escolher('entrega')}
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
