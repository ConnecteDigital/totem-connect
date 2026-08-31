import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { enderecoVazio, useCarrinho, type Endereco } from '#/lib/carrinho'
import { CabecalhoTotem } from '#/components/totem/CabecalhoTotem'
import { Botao } from '#/components/totem/Botao'
import { RodapeVoltar } from '#/components/totem/RodapeVoltar'

export const Route = createFileRoute('/totem/endereco')({ component: EnderecoTela })

function EnderecoTela() {
  const { endereco, telefone, definirEndereco, definirTelefone } = useCarrinho()
  const navigate = useNavigate()

  const [form, setForm] = useState<Endereco>(endereco ?? enderecoVazio)
  const [tel, setTel] = useState(telefone)
  const [buscandoCep, setBuscandoCep] = useState(false)

  function set<K extends keyof Endereco>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function buscarCep() {
    const cep = form.cep.replace(/\D/g, '')
    if (cep.length !== 8) return
    setBuscandoCep(true)
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const d = await r.json()
      if (!d.erro) {
        setForm((f) => ({
          ...f,
          logradouro: d.logradouro || f.logradouro,
          bairro: d.bairro || f.bairro,
          cidade: d.localidade || f.cidade,
        }))
      }
    } catch {
      /* sem internet / CEP inválido — cliente preenche na mão */
    } finally {
      setBuscandoCep(false)
    }
  }

  function continuar(e: React.FormEvent) {
    e.preventDefault()
    definirEndereco(form)
    definirTelefone(tel)
    navigate({ to: '/totem/cardapio' })
  }

  return (
    <>
      <CabecalhoTotem />
      <form onSubmit={continuar} className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-8 py-6">
        <h1 className="text-4xl font-extrabold">
          Seu <span className="text-laranja">endereço</span>
        </h1>
        <p className="mt-2 text-white/60">Pra gente levar seu pedido até você.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Campo rotulo="CEP" className="sm:col-span-1">
            <input
              value={form.cep}
              onChange={(e) => set('cep', e.target.value)}
              onBlur={buscarCep}
              inputMode="numeric"
              placeholder="00000-000"
              className={inputCls}
            />
            {buscandoCep && <span className="text-xs text-white/50">buscando…</span>}
          </Campo>
          <Campo rotulo="Telefone" className="sm:col-span-1">
            <input
              value={tel}
              onChange={(e) => setTel(e.target.value)}
              inputMode="tel"
              placeholder="(00) 00000-0000"
              className={inputCls}
              required
            />
          </Campo>
          <Campo rotulo="Rua / Avenida" className="sm:col-span-2">
            <input value={form.logradouro} onChange={(e) => set('logradouro', e.target.value)} className={inputCls} required />
          </Campo>
          <Campo rotulo="Número">
            <input value={form.numero} onChange={(e) => set('numero', e.target.value)} className={inputCls} required />
          </Campo>
          <Campo rotulo="Complemento">
            <input value={form.complemento} onChange={(e) => set('complemento', e.target.value)} className={inputCls} placeholder="apto, bloco…" />
          </Campo>
          <Campo rotulo="Bairro">
            <input value={form.bairro} onChange={(e) => set('bairro', e.target.value)} className={inputCls} required />
          </Campo>
          <Campo rotulo="Cidade">
            <input value={form.cidade} onChange={(e) => set('cidade', e.target.value)} className={inputCls} required />
          </Campo>
          <Campo rotulo="Ponto de referência" className="sm:col-span-2">
            <input value={form.referencia} onChange={(e) => set('referencia', e.target.value)} className={inputCls} placeholder="opcional" />
          </Campo>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <RodapeVoltar />
          <Botao type="submit" bloco iconeDireita={<span aria-hidden>→</span>}>
            Continuar para o cardápio
          </Botao>
        </div>
      </form>
    </>
  )
}

const inputCls =
  'mt-1 w-full rounded-xl bg-superficie px-4 py-4 text-lg text-white outline-none ring-1 ring-white/10 focus:ring-laranja'

function Campo({
  rotulo,
  className,
  children,
}: {
  rotulo: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={'block text-sm font-medium text-white/70 ' + (className ?? '')}>
      {rotulo}
      {children}
    </label>
  )
}
