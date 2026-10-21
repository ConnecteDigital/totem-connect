// Testa a integração com a Cielo Smart (Order Manager) ponta a ponta no SANDBOX:
// cria pedido -> libera -> consulta -> simula pagamento -> consulta -> fecha.
//
//   node scripts/cielo/testar-sandbox.mjs           usa as chaves do .env.local (CIELO_*)
//   node scripts/cielo/testar-sandbox.mjs --simulado  não chama a Cielo: confere só as requisições
//
// As credenciais NUNCA são impressas.
import { resolve } from 'node:path'
import { createServer } from 'vite'

const raiz = resolve(import.meta.dirname, '..', '..')
const simulado = process.argv.includes('--simulado')

if (simulado) {
  process.env.CIELO_CLIENT_ID = 'cid-teste'
  process.env.CIELO_ACCESS_TOKEN = 'token-teste'
  process.env.CIELO_MERCHANT_ID = 'merchant-teste'
  process.env.CIELO_AMBIENTE = 'sandbox'
  const pedidos = new Map()
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url)
    const corpo = init.body ? JSON.parse(init.body) : null
    console.log(`  ${init.method} ${u.pathname}${u.search}`, corpo ? JSON.stringify(corpo) : '')
    const h = init.headers ?? {}
    if (!h['client-id'] || !h['access-token'] || !h['merchant-id']) throw new Error('faltam headers')
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s })
    if (init.method === 'POST' && u.pathname.endsWith('/orders')) {
      pedidos.set('ped-1', { id: 'ped-1', status: 'DRAFT', transactions: [], price: corpo.price })
      return json({ id: 'ped-1' }, 201)
    }
    if (init.method === 'PUT') {
      pedidos.get('ped-1').status = u.searchParams.get('operation') === 'PLACE' ? 'ENTERED' : 'CLOSED'
      return json({})
    }
    if (init.method === 'POST' && u.pathname.endsWith('/transactions')) {
      pedidos.get('ped-1').transactions.push(corpo)
      return json({ id: 't-1' })
    }
    return json(pedidos.get('ped-1'))
  }
} else {
  process.loadEnvFile(resolve(raiz, '.env.local'))
  const faltam = ['CIELO_CLIENT_ID', 'CIELO_ACCESS_TOKEN', 'CIELO_MERCHANT_ID'].filter(
    (k) => !process.env[k],
  )
  if (faltam.length) {
    console.error('Faltam no .env.local: ' + faltam.join(', '))
    process.exit(1)
  }
  process.env.CIELO_AMBIENTE = 'sandbox' // este script só roda no sandbox
}

const vite = await createServer({
  root: raiz,
  configFile: false,
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
  resolve: { alias: { '#': resolve(raiz, 'src') } },
})

try {
  const c = await vite.ssrLoadModule('/src/server/cielo.ts')
  const total = 1990 + 2 * 500

  console.log('1) criar pedido')
  const id = await c.criarPedidoCielo({
    numero: 'TESTE-1',
    referencia: 'PEDIDO #TESTE',
    itens: [
      { sku: 'sku-1', name: 'X-Bacon (teste)', unit_price: 1990, quantity: 1 },
      { sku: 'sku-2', name: 'Refrigerante (teste)', unit_price: 500, quantity: 2 },
    ],
    totalCentavos: total,
  })
  console.log('   ok, id =', id)

  console.log('2) liberar na maquininha (PLACE)')
  await c.liberarPedidoCielo(id)

  console.log('3) consultar (ainda não pago)')
  let o = await c.consultarPedidoCielo(id)
  console.log('   status:', o.status, '| pago?', c.resultadoDoPedido(o).pago)

  console.log('4) simular pagamento (só sandbox)')
  await c.simularPagamentoCielo(id, total)

  console.log('5) consultar (deve estar pago)')
  o = await c.consultarPedidoCielo(id)
  const r = c.resultadoDoPedido(o)
  console.log('   status:', o.status, '| pago?', r.pago, '| NSU:', r.nsu)

  console.log('6) fechar o pedido')
  await c.fecharPedidoCielo(id)

  console.log(r.pago ? '\nTUDO CERTO.' : '\nATENÇÃO: o pagamento simulado não apareceu como pago.')
  process.exitCode = r.pago ? 0 : 2
} catch (e) {
  console.error('\nERRO:', e.message)
  process.exitCode = 1
} finally {
  await vite.close()
}
