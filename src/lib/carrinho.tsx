import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Adicional, Produto } from '#/mock/cardapio'

export type TipoConsumo = 'comer_aqui' | 'para_viagem'
export type ModoEntrega = 'retirada' | 'entrega'

export type Endereco = {
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  referencia: string
}

export const enderecoVazio: Endereco = {
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  referencia: '',
}

export type ItemCarrinho = {
  /** id único da linha do carrinho (não é o id do produto) */
  linhaId: string
  produto: Produto
  quantidade: number
  personalizacao: string | null
  adicionais: Adicional[]
  observacoes: string
}

export function subtotalItem(item: ItemCarrinho): number {
  const add = item.adicionais.reduce((s, a) => s + a.preco, 0)
  return (item.produto.preco + add) * item.quantidade
}

type ArgsAdicionar = {
  produto: Produto
  quantidade: number
  personalizacao?: string | null
  adicionais?: Adicional[]
  observacoes?: string
}

type CarrinhoContexto = {
  itens: ItemCarrinho[]
  tipoConsumo: TipoConsumo | null
  modoEntrega: ModoEntrega | null
  endereco: Endereco | null
  telefone: string
  nomeCliente: string
  totalItens: number
  valorTotal: number
  definirTipoConsumo: (t: TipoConsumo) => void
  definirModoEntrega: (m: ModoEntrega) => void
  definirEndereco: (e: Endereco) => void
  definirTelefone: (t: string) => void
  definirNomeCliente: (n: string) => void
  adicionar: (args: ArgsAdicionar) => void
  mudarQuantidade: (linhaId: string, delta: number) => void
  remover: (linhaId: string) => void
  limpar: () => void
}

const Ctx = createContext<CarrinhoContexto | null>(null)

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([])
  const [tipoConsumo, setTipoConsumo] = useState<TipoConsumo | null>(null)
  const [modoEntrega, setModoEntrega] = useState<ModoEntrega | null>(null)
  const [endereco, setEndereco] = useState<Endereco | null>(null)
  const [telefone, setTelefone] = useState('')
  const [nomeCliente, setNomeCliente] = useState('')

  const valor = useMemo<CarrinhoContexto>(
    () => ({
      itens,
      tipoConsumo,
      modoEntrega,
      endereco,
      telefone,
      nomeCliente,
      totalItens: itens.reduce((s, i) => s + i.quantidade, 0),
      valorTotal: itens.reduce((s, i) => s + subtotalItem(i), 0),
      definirTipoConsumo: (t) => setTipoConsumo(t),
      definirModoEntrega: (m) => setModoEntrega(m),
      definirEndereco: (e) => setEndereco(e),
      definirTelefone: (t) => setTelefone(t),
      definirNomeCliente: (n) => setNomeCliente(n),
      adicionar: ({
        produto,
        quantidade,
        personalizacao = null,
        adicionais = [],
        observacoes = '',
      }: ArgsAdicionar) => {
        setItens((prev) => [
          ...prev,
          {
            linhaId: crypto.randomUUID(),
            produto,
            quantidade,
            personalizacao,
            adicionais,
            observacoes,
          },
        ])
      },
      mudarQuantidade: (linhaId, delta) => {
        setItens((prev) =>
          prev
            .map((i) =>
              i.linhaId === linhaId ? { ...i, quantidade: i.quantidade + delta } : i,
            )
            .filter((i) => i.quantidade > 0),
        )
      },
      remover: (linhaId) => setItens((prev) => prev.filter((i) => i.linhaId !== linhaId)),
      limpar: () => {
        setItens([])
        setTipoConsumo(null)
        setModoEntrega(null)
        setEndereco(null)
        setTelefone('')
        setNomeCliente('')
      },
    }),
    [itens, tipoConsumo, modoEntrega, endereco, telefone, nomeCliente],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useCarrinho(): CarrinhoContexto {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCarrinho precisa estar dentro de <CarrinhoProvider>')
  return c
}
