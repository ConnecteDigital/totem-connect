import type { PedidoDb } from '#/lib/painel/pedidosDb'
import { formatarBRL, nomeAdicional } from '#/lib/formato'
import { NOME_ESTABELECIMENTO } from '#/lib/marca'
import { EscPos } from './escpos'
import type { ConfigImpressora } from './config'

const FORMA_PAGAMENTO: Record<string, string> = {
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
}

function rotuloConsumo(p: PedidoDb): string {
  if (p.tipo_consumo === 'comer_aqui') return 'COMER AQUI'
  if (p.modo_entrega === 'entrega') return 'PARA VIAGEM - ENTREGA'
  return 'PARA VIAGEM - RETIRADA'
}

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Senha/comprovante do cliente — sai na impressora do totem, já cortada. */
export function montarComanda(p: PedidoDb, cfg: ConfigImpressora): Uint8Array {
  const e = new EscPos(cfg.pagina, cfg.colunas)

  e.alinhar('centro')
    .negrito(true)
    .tamanho(1, 2)
    .linha(NOME_ESTABELECIMENTO)
    .tamanho(1, 1)
    .negrito(false)
    .linha('Comprovante do pedido')
    .separador()
    .linha('SENHA')
    .negrito(true)
    .tamanho(4, 4)
    .linha(`#${p.numero_pedido}`)
    .tamanho(1, 1)

  if (p.nome_cliente) e.tamanho(1, 2).linha(p.nome_cliente).tamanho(1, 1)
  e.negrito(false).separador()

  e.alinhar('esquerda').linha(rotuloConsumo(p)).linha(dataHora(p.criado_em)).separador()

  for (const it of p.pedido_itens) {
    e.duasColunas(`${it.quantidade}x ${it.produto_nome}`, formatarBRL(it.preco_unitario * it.quantidade))
    for (const a of it.pedido_item_adicionais) {
      e.duasColunas(`   + ${nomeAdicional(a.adicional_nome)}`, formatarBRL(a.adicional_preco * it.quantidade))
    }
    if (it.observacoes) e.linha(`   * ${it.observacoes}`)
  }

  e.separador()
    .negrito(true)
    .tamanho(1, 2)
    .duasColunas('TOTAL', formatarBRL(p.valor_total))
    .tamanho(1, 1)
    .negrito(false)

  if (p.forma_pagamento) {
    e.linha(`Pagamento: ${FORMA_PAGAMENTO[p.forma_pagamento] ?? p.forma_pagamento}`)
  }

  e.separador()
    .alinhar('centro')
    .linha('Obrigado!')
    .linha('Acompanhe seu pedido no painel.')
    .quebrar(2)
    .cortar()

  return e.bytes()
}

/** Página de teste: confere acentos, largura da linha e o corte. */
export function montarTeste(cfg: ConfigImpressora): Uint8Array {
  const e = new EscPos(cfg.pagina, cfg.colunas)
  e.alinhar('centro')
    .negrito(true)
    .tamanho(2, 2)
    .linha('TESTE')
    .tamanho(1, 1)
    .negrito(false)
    .linha(NOME_ESTABELECIMENTO)
    .linha(new Date().toLocaleString('pt-BR'))
    .separador()
    .alinhar('esquerda')
    .linha('Acentos: ção ã õ é ê á à í ó ô ú ü Ç Á É')
    .linha('Moeda:   R$ 1.234,56')
    .linha('Largura (deve caber exata numa linha):')
    .linha('1234567890'.repeat(5).slice(0, cfg.colunas))
    .duasColunas('1x Item de exemplo', formatarBRL(19.9))
    .duasColunas('   + Adicional', formatarBRL(4))
    .separador()
    .alinhar('centro')
    .linha(`Tabela: ${cfg.pagina.toUpperCase()}  Colunas: ${cfg.colunas}`)
    .quebrar(2)
    .cortar()
  return e.bytes()
}
