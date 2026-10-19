// Gera os bytes ESC/POS da comanda (mesmo código que o totem usa) e grava num arquivo .bin,
// pra mandar pra uma impressora ligada neste PC (ver raw-print.ps1).
//
//   node scripts/impressora/gerar.mjs <teste|comanda> <saida.bin> [colunas=48] [pagina=cp850]
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

  const bytes = modo === 'teste' ? montarTeste(cfg) : montarComanda(pedidoExemplo, cfg)
  writeFileSync(resolve(saida), bytes)
  console.log(`${modo}: ${bytes.length} bytes -> ${resolve(saida)}`)
} finally {
  await vite.close()
}
