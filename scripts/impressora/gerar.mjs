// Gera os bytes ESC/POS da comanda (mesmo código que o totem usa) e grava num arquivo .bin,
// pra mandar pra uma impressora ligada neste PC (ver raw-print.ps1).
//
//   node scripts/impressora/gerar.mjs <teste|comanda|grande> <saida.bin> [colunas=48] [pagina=cp850]
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createServer } from 'vite'

const [modo = 'comanda', saida = 'comanda.bin', colunas = '48', pagina = 'cp850'] = process.argv.slice(2)
const raiz = resolve(import.meta.dirname, '..', '..')

const vite = await createServer({
  root: raiz,
  configFile: false,
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
  resolve: { alias: { '#': resolve(raiz, 'src') } },
})

try {
  const { montarComanda, montarTeste } = await vite.ssrLoadModule('/src/lib/impressora/comanda.ts')
  const cfg = { pagina, colunas: Number(colunas) }

  const pedidoExemplo = {
    id: 'exemplo',
    numero_pedido: 27,
    nome_cliente: 'Gabriel',
    telefone_cliente: null,
    tipo_consumo: 'comer_aqui',
    modo_entrega: null,
    status: 'em_preparo',
    forma_pagamento: 'cartao_credito',
    valor_total: 58.7,
    taxa_entrega: 0,
    criado_em: new Date().toISOString(),
    pago_em: new Date().toISOString(),
    pedido_itens: [
      {
        id: '1',
        produto_nome: 'X-Bacon Duplo',
        quantidade: 1,
        preco_unitario: 32.9,
        observacoes: 'Sem cebola',
        pedido_item_adicionais: [
          { id: 'a', adicional_nome: '+ Bacon extra', adicional_preco: 5 },
          { id: 'b', adicional_nome: '+ Queijo cheddar', adicional_preco: 4 },
        ],
      },
      {
        id: '2',
        produto_nome: 'Batata Frita Grande',
        quantidade: 2,
        preco_unitario: 8.9,
        observacoes: null,
        pedido_item_adicionais: [],
      },
    ],
  }

  const pedidoGrande = {
    ...pedidoExemplo,
    numero_pedido: 148,
    nome_cliente: 'Maria Fernanda',
    tipo_consumo: 'para_viagem',
    modo_entrega: 'retirada',
    forma_pagamento: 'pix',
    valor_total: 266.6,
    pedido_itens: [
      { id: '1', produto_nome: 'Combo Família X-Bacon Duplo com Batata e Refrigerante', quantidade: 2, preco_unitario: 49.9, observacoes: 'Um sem cebola e sem picles; outro bem passado', pedido_item_adicionais: [{ id: 'a', adicional_nome: '+ Bacon extra', adicional_preco: 5 }, { id: 'b', adicional_nome: '+ Queijo cheddar cremoso', adicional_preco: 4 }] },
      { id: '2', produto_nome: 'X-Salada', quantidade: 1, preco_unitario: 24.9, observacoes: null, pedido_item_adicionais: [] },
      { id: '3', produto_nome: 'Hambúrguer Vegano', quantidade: 1, preco_unitario: 29.9, observacoes: 'Sem molho', pedido_item_adicionais: [{ id: 'c', adicional_nome: '+ Ovo', adicional_preco: 3 }] },
      { id: '4', produto_nome: 'Batata Frita Grande', quantidade: 2, preco_unitario: 8.9, observacoes: null, pedido_item_adicionais: [] },
      { id: '5', produto_nome: 'Onion Rings', quantidade: 1, preco_unitario: 14.9, observacoes: null, pedido_item_adicionais: [] },
      { id: '6', produto_nome: 'Refrigerante Lata 350ml', quantidade: 3, preco_unitario: 6.5, observacoes: null, pedido_item_adicionais: [] },
      { id: '7', produto_nome: 'Milkshake de Chocolate', quantidade: 2, preco_unitario: 16.9, observacoes: 'Sem chantilly', pedido_item_adicionais: [{ id: 'd', adicional_nome: '+ Calda de caramelo', adicional_preco: 2.5 }] },
    ],
  }

  const bytes =
    modo === 'teste'
      ? montarTeste(cfg)
      : montarComanda(modo === 'grande' ? pedidoGrande : pedidoExemplo, cfg)
  writeFileSync(resolve(saida), bytes)
  console.log(`${modo}: ${bytes.length} bytes -> ${resolve(saida)}`)
} finally {
  await vite.close()
}
