import type { PedidoDb } from '#/lib/painel/pedidosDb'
import { formatarBRL, nomeAdicional } from '#/lib/formato'
import { CONNECT_DIVULGACAO, NOME_ESTABELECIMENTO } from '#/lib/marca'
import { LOGO_CONNECT } from './logoConnect'
import { EscPos, quebrarPalavras } from './escpos'
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
    .quebrar()
    .linha('SENHA')
    .faixa(`#${p.numero_pedido}`, 4, 4)

  if (p.nome_cliente) {
    const nome = p.nome_cliente.toUpperCase()
    e.alinhar('centro').quebrar().linha('VOCÊ SERÁ CHAMADO POR:')
    e.faixa(nome, nome.length <= cfg.colunas / 2 ? 2 : 1, 2)
  }

  e.quebrar().faixa(rotuloConsumo(p), 1, 2)

  e.alinhar('esquerda').quebrar().linha(dataHora(p.criado_em)).separador()

  for (const it of p.pedido_itens) {
    e.duasColunas(`${it.quantidade}x ${it.produto_nome}`, formatarBRL(it.preco_unitario * it.quantidade))
    for (const a of it.pedido_item_adicionais) {
      e.duasColunas(`   + ${nomeAdicional(a.adicional_nome)}`, formatarBRL(a.adicional_preco * it.quantidade))
    }
    if (it.observacoes) {
      // quebra por palavra, com recuo (nada de cortar "passado" no meio)
      quebrarPalavras(it.observacoes, cfg.colunas - 5).forEach((t, i) =>
        e.linha((i === 0 ? '   * ' : '     ') + t),
      )
    }
  }

  e.separador()
    .negrito(true)
    .tamanho(2, 2)
    .duasColunas('TOTAL', formatarBRL(p.valor_total), cfg.colunas / 2)
    .tamanho(1, 1)
    .negrito(false)

  if (p.forma_pagamento) {
    e.linha(`Pagamento: ${FORMA_PAGAMENTO[p.forma_pagamento] ?? p.forma_pagamento}`)
  }

  e.separador()
    .alinhar('centro')
    .linha('Obrigado!')
    .linha('Guarde este comprovante.')

  if (cfg.divulgacao !== false) divulgacaoConnect(e)

  e.quebrar(4).cortar()

  return e.bytes()
}

/** Rodapé de divulgação: logo da Connect + QR code pro Instagram. */
function divulgacaoConnect(e: EscPos) {
  const logo = Uint8Array.from(atob(LOGO_CONNECT.base64), (c) => c.charCodeAt(0))
  e.quebrar()
    .alinhar('centro')
    .imagem(logo, LOGO_CONNECT.bytesPorLinha, LOGO_CONNECT.altura)
    .negrito(true)
    .linha(`Projeto criado pela ${CONNECT_DIVULGACAO.nome}`)
    .negrito(false)
    .linha('Quer um totem assim no seu negócio?')
    .quebrar()
    .qr(CONNECT_DIVULGACAO.instagramUrl, 5)
    .linha(`Siga a gente: ${CONNECT_DIVULGACAO.instagramRotulo}`)
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
