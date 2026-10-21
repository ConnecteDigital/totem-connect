import { randomUUID } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { criarSupabaseServidor } from '#/lib/supabase/server'
import { pagamentoProvedor } from '#/lib/config'
import { resolverEstabelecimentoTotem } from '#/server/_comum'
import { codigoPagamentoCielo, criarPedidoCielo, liberarPedidoCielo } from '#/server/cielo'

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

export type CriarPedidoResultado = {
  pedidoId: string
  numeroPedido: number
  /** true = totem deve esperar a maquininha concluir; false = já aprovado (mock) */
  aguardandoPagamento: boolean
  /** true = o cliente precisa escolher o pedido na lista da maquininha (Cielo) */
  escolherNaMaquininha: boolean
}

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

    const provedor = pagamentoProvedor()
    const mock = provedor === 'mock'
    const agora = new Date().toISOString()
    const end = data.modoEntrega === 'entrega' ? data.endereco : null

    // ids gerados aqui pra montar tudo antes e inserir em lote (sem depender de ordem de retorno)
    const pedidoId = randomUUID()

    const linhasItens = data.itens.map((it) => {
      const p = produtos.get(it.produtoId)!
      return {
        id: randomUUID(),
        pedido_id: pedidoId,
        produto_id: it.produtoId,
        produto_nome: p.nome,
        quantidade: it.quantidade,
        preco_unitario: Number(p.preco),
        observacoes: montarObservacoes(it.personalizacao, it.observacoes),
      }
    })

    const linhasAdicionais = data.itens.flatMap((it, idx) =>
      it.adicionalIds.map((aid) => {
        const a = adicionais.get(aid)!
        return {
          pedido_item_id: linhasItens[idx].id,
          produto_adicional_id: aid,
          adicional_nome: a.nome,
          adicional_preco: Number(a.preco),
        }
      }),
    )

    const pedidoRes = await supa.from('pedidos').insert({
      id: pedidoId,
      estabelecimento_id: estabelecimentoId,
      numero_pedido: numeroPedido,
      tipo_consumo: data.tipoConsumo,
      modo_entrega: data.tipoConsumo === 'para_viagem' ? data.modoEntrega : null,
      // mock: já vai pra cozinha. real: espera a maquininha confirmar.
      status: mock ? 'em_preparo' : 'aguardando_pagamento',
      forma_pagamento: data.formaPagamento,
      valor_total: valorTotal,
      nome_cliente: data.nomeCliente || null,
      telefone_cliente: data.telefone || null,
      taxa_entrega: 0,
      pago_em: mock ? agora : null,
      entrega_cep: end?.cep || null,
      entrega_logradouro: end?.logradouro || null,
      entrega_numero: end?.numero || null,
      entrega_complemento: end?.complemento || null,
      entrega_bairro: end?.bairro || null,
      entrega_cidade: end?.cidade || null,
      entrega_referencia: end?.referencia || null,
    })
    if (pedidoRes.error) throw pedidoRes.error

    const itensRes = await supa.from('pedido_itens').insert(linhasItens)
    if (itensRes.error) throw itensRes.error

    if (linhasAdicionais.length) {
      const adicRowRes = await supa.from('pedido_item_adicionais').insert(linhasAdicionais)
      if (adicRowRes.error) throw adicRowRes.error
    }

    await supa.from('pagamentos').insert({
      pedido_id: pedidoId,
      forma_pagamento: data.formaPagamento,
      valor: valorTotal,
      status: mock ? 'aprovado' : 'pendente',
      respondido_em: mock ? agora : null,
    })

    if (provedor === 'cielo') {
      try {
        // um item da Cielo por linha do pedido (preço unitário já com os adicionais), em centavos
        const itensCielo = linhasItens.map((li, idx) => {
          const somaAdic = data.itens[idx].adicionalIds.reduce(
            (s, aid) => s + Number(adicionais.get(aid)!.preco),
            0,
          )
          return {
            sku: li.produto_id,
            name: li.produto_nome.slice(0, 60),
            unit_price: Math.round((li.preco_unitario + somaAdic) * 100),
            quantity: li.quantidade,
          }
        })
        const totalCentavos = itensCielo.reduce((s, i) => s + i.unit_price * i.quantity, 0)
        const cieloId = await criarPedidoCielo({
          numero: String(numeroPedido),
          // aparece na lista de pedidos da maquininha: o cliente acha o dele pela senha/nome
          referencia: `SENHA #${numeroPedido}${data.nomeCliente ? ' - ' + data.nomeCliente.slice(0, 30) : ''}`,
          itens: itensCielo,
          totalCentavos,
          paymentCode: codigoPagamentoCielo(data.formaPagamento),
        })
        const upd = await supa
          .from('pagamentos')
          .update({ provedor: 'cielo', provedor_pedido_id: cieloId })
          .eq('pedido_id', pedidoId)
        if (upd.error) throw upd.error
        await liberarPedidoCielo(cieloId) // passa a aparecer na maquininha
      } catch (e) {
        // não deixa pedido "pendente" pra sempre se a maquininha nem recebeu a cobrança
        // eslint-disable-next-line no-console
        console.error('[cielo] falha ao criar/liberar o pedido:', e)
        await supa
          .from('pagamentos')
          .update({ status: 'recusado', respondido_em: agora })
          .eq('pedido_id', pedidoId)
        await supa
          .from('pedidos')
          .update({ status: 'cancelado', cancelado_em: agora })
          .eq('id', pedidoId)
        throw new Error('Não foi possível iniciar o pagamento na maquininha. Chame o atendente.')
      }
    }

    return {
      pedidoId,
      numeroPedido,
      aguardandoPagamento: !mock,
      escolherNaMaquininha: provedor === 'cielo',
    }
  })
