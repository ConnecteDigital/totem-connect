import { createServerFn } from '@tanstack/react-start'
import { criarSupabaseServidor } from '#/lib/supabase/server'
import { resolverEstabelecimentoTotem } from '#/server/_comum'

type ItemInput = {
  produtoId: string
  quantidade: number
  personalizacao: string | null
  adicionalIds: string[]
  observacoes: string
}

type EnderecoInput = {
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  referencia: string
} | null

export type CriarPedidoInput = {
  nomeCliente: string
  telefone: string
  tipoConsumo: 'comer_aqui' | 'para_viagem'
  modoEntrega: 'retirada' | 'entrega' | null
  endereco: EnderecoInput
  formaPagamento: 'pix' | 'cartao_credito' | 'cartao_debito'
  itens: ItemInput[]
}

export type CriarPedidoResultado = { pedidoId: string; numeroPedido: number }

function montarObservacoes(personalizacao: string | null, obs: string): string | null {
  const partes = [
    personalizacao && personalizacao.toLowerCase() !== 'padrão' ? personalizacao : null,
    obs.trim() || null,
  ].filter(Boolean)
  return partes.length ? partes.join(' · ') : null
}

/**
 * Cria o pedido no banco a partir do carrinho do totem.
 * O SERVIDOR recalcula os preços (não confia no cliente).
 * Pagamento entra como 'aprovado' mock — trocar quando a maquininha PagBank entrar (Fase 3).
 */
export const criarPedido = createServerFn({ method: 'POST' })
  .validator((d: CriarPedidoInput) => d)
  .handler(async ({ data }): Promise<CriarPedidoResultado> => {
    const supa = criarSupabaseServidor()
    const estabelecimentoId = await resolverEstabelecimentoTotem(supa)

    if (!data.itens.length) throw new Error('Pedido sem itens.')

    const produtoIds = [...new Set(data.itens.map((i) => i.produtoId))]
    const adicionalIds = [...new Set(data.itens.flatMap((i) => i.adicionalIds))]

    const prodRes = await supa
      .from('produtos')
      .select('id, nome, preco, disponivel')
      .eq('estabelecimento_id', estabelecimentoId)
      .in('id', produtoIds)
    if (prodRes.error) throw prodRes.error

    let adicData: Array<{ id: string; nome: string; preco: number; produto_id: string }> = []
    if (adicionalIds.length) {
      const adicRes = await supa
        .from('produto_adicionais')
        .select('id, nome, preco, produto_id')
        .in('id', adicionalIds)
      if (adicRes.error) throw adicRes.error
      adicData = adicRes.data ?? []
    }

    const produtos = new Map((prodRes.data ?? []).map((p) => [p.id, p]))
    const adicionais = new Map(adicData.map((a) => [a.id, a]))

    for (const it of data.itens) {
      const p = produtos.get(it.produtoId)
      if (!p) throw new Error('Produto inválido no pedido.')
      if (!p.disponivel) throw new Error(`"${p.nome}" não está mais disponível.`)
      if (it.quantidade < 1) throw new Error('Quantidade inválida.')
      for (const aid of it.adicionalIds) {
        const a = adicionais.get(aid)
        if (!a || a.produto_id !== it.produtoId) throw new Error('Adicional inválido no pedido.')
      }
    }

    const valorTotal = data.itens.reduce((soma, it) => {
      const p = produtos.get(it.produtoId)!
      const somaAdic = it.adicionalIds.reduce(
        (s, aid) => s + Number(adicionais.get(aid)!.preco),
        0,
      )
      return soma + (Number(p.preco) + somaAdic) * it.quantidade
    }, 0)

    const numRes = await supa.rpc('proximo_numero_pedido', {
      p_estabelecimento_id: estabelecimentoId,
    })
    if (numRes.error) throw numRes.error
    const numeroPedido = numRes.data as number

    const end = data.modoEntrega === 'entrega' ? data.endereco : null

    const pedidoRes = await supa
      .from('pedidos')
      .insert({
        estabelecimento_id: estabelecimentoId,
        numero_pedido: numeroPedido,
        tipo_consumo: data.tipoConsumo,
        modo_entrega: data.tipoConsumo === 'para_viagem' ? data.modoEntrega : null,
        status: 'pago',
        forma_pagamento: data.formaPagamento,
        valor_total: valorTotal,
        nome_cliente: data.nomeCliente || null,
        telefone_cliente: data.telefone || null,
        taxa_entrega: 0,
        pago_em: new Date().toISOString(),
        entrega_cep: end?.cep || null,
        entrega_logradouro: end?.logradouro || null,
        entrega_numero: end?.numero || null,
        entrega_complemento: end?.complemento || null,
        entrega_bairro: end?.bairro || null,
        entrega_cidade: end?.cidade || null,
        entrega_referencia: end?.referencia || null,
      })
      .select('id')
      .single()
    if (pedidoRes.error) throw pedidoRes.error
    const pedidoId = pedidoRes.data.id as string

    for (const it of data.itens) {
      const p = produtos.get(it.produtoId)!
      const itemRes = await supa
        .from('pedido_itens')
        .insert({
          pedido_id: pedidoId,
          produto_id: it.produtoId,
          produto_nome: p.nome,
          quantidade: it.quantidade,
          preco_unitario: Number(p.preco),
          observacoes: montarObservacoes(it.personalizacao, it.observacoes),
        })
        .select('id')
        .single()
      if (itemRes.error) throw itemRes.error

      if (it.adicionalIds.length) {
        const rows = it.adicionalIds.map((aid) => {
          const a = adicionais.get(aid)!
          return {
            pedido_item_id: itemRes.data.id as string,
            produto_adicional_id: aid,
            adicional_nome: a.nome,
            adicional_preco: Number(a.preco),
          }
        })
        const r = await supa.from('pedido_item_adicionais').insert(rows)
        if (r.error) throw r.error
      }
    }

    await supa.from('pagamentos').insert({
      pedido_id: pedidoId,
      forma_pagamento: data.formaPagamento,
      status: 'aprovado',
      respondido_em: new Date().toISOString(),
    })

    return { pedidoId, numeroPedido }
  })
