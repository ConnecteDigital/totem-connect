import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCarrinho } from '#/lib/carrinho'
import { CabecalhoTotem } from '#/components/totem/CabecalhoTotem'
import { Botao } from '#/components/totem/Botao'
import { RodapeVoltar } from '#/components/totem/RodapeVoltar'

export const Route = createFileRoute('/totem/identificacao')({ component: Identificacao })

function Identificacao() {
  const { nomeCliente, definirNomeCliente } = useCarrinho()
  const [nome, setNome] = useState(nomeCliente)
  const navigate = useNavigate()

  function continuar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    definirNomeCliente(nome.trim())
    navigate({ to: '/totem/pagamento' })
  }

  return (
    <>
      <CabecalhoTotem />
      <form
        onSubmit={continuar}
        className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-8 py-6 text-center"
      >
        <h1 className="text-5xl font-extrabold leading-tight">
          Como podemos <span className="text-laranja">te chamar?</span>
        </h1>
        <p className="mt-3 text-white/60">Vamos usar esse nome pra chamar seu pedido.</p>

        <input
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Seu nome"
          className="mt-8 w-full rounded-2xl bg-superficie px-6 py-5 text-center text-2xl text-white outline-none ring-1 ring-white/10 focus:ring-laranja"
        />

        <Botao type="submit" bloco className="mt-8" disabled={!nome.trim()}>
          Continuar para o pagamento
        </Botao>
      </form>
      <div className="px-8 pb-8">
        <RodapeVoltar />
      </div>
    </>
  )
}
