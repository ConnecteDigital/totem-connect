/**
 * Cliente da API Order Manager da Cielo Smart (integração remota). SÓ server-side.
 *
 * Fluxo: criar pedido (DRAFT) -> liberar (PLACE, aparece na maquininha) -> consultar até
 * pagar -> fechar (CLOSE). Docs: https://docs.cielo.com.br/cielo-smart (Ambientes, Criar um
 * pedido, Alterar status).
 *
 * Variáveis de ambiente (nunca no código):
 *   CIELO_CLIENT_ID, CIELO_ACCESS_TOKEN, CIELO_MERCHANT_ID
 *   CIELO_AMBIENTE = 'sandbox' (padrão) | 'producao'
 */

const BASES = {
  sandbox: 'https://api.cielo.com.br/sandbox-lio/order-management/v1',
  producao: 'https://api.cielo.com.br/order-management/v1',
}

export function cieloSandbox(): boolean {
  return process.env.CIELO_AMBIENTE !== 'producao'
}

export function cieloConfigurada(): boolean {
  return !!(
    process.env.CIELO_CLIENT_ID &&
    process.env.CIELO_ACCESS_TOKEN &&
    process.env.CIELO_MERCHANT_ID
  )
}

async function chamar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const { CIELO_CLIENT_ID, CIELO_ACCESS_TOKEN, CIELO_MERCHANT_ID } = process.env
  if (!CIELO_CLIENT_ID || !CIELO_ACCESS_TOKEN || !CIELO_MERCHANT_ID) {
    throw new Error('Cielo não configurada (CIELO_CLIENT_ID / CIELO_ACCESS_TOKEN / CIELO_MERCHANT_ID).')
  }
  const base = cieloSandbox() ? BASES.sandbox : BASES.producao
  const r = await fetch(base + caminho, {
    method: metodo,
    headers: {
      'client-id': CIELO_CLIENT_ID,
      'access-token': CIELO_ACCESS_TOKEN,
      'merchant-id': CIELO_MERCHANT_ID,
      'content-type': 'application/json',
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    signal: AbortSignal.timeout(15_000),
  })
  const texto = await r.text()
  if (!r.ok) {
    // a mensagem NÃO inclui credenciais, só a rota e o que a Cielo respondeu
    throw new Error(`Cielo ${metodo} ${caminho} -> ${r.status}: ${texto.slice(0, 300)}`)
  }
  return (texto ? JSON.parse(texto) : {}) as T
}

export type ItemCielo = {
  sku: string
  name: string
  /** centavos */
  unit_price: number
  quantity: number
}

type TransacaoCielo = {
  id?: string
  status?: string
  transaction_type?: string
  authorization_code?: string
  number?: string
  amount?: number | string
  terminal_number?: string
}

export type PedidoCielo = {
  id: string
  status?: string
  price?: number | string
  transactions?: TransacaoCielo[]
}

/** Cria o pedido (DRAFT). Valores em centavos; a soma dos itens deve bater com o total. */
export async function criarPedidoCielo(args: {
  numero: string
  referencia: string
  itens: ItemCielo[]
  totalCentavos: number
  /** Forma de pagamento já escolhida (pula a escolha na maquininha). Ver codigoPagamentoCielo. */
  paymentCode?: string
}): Promise<string> {
  const soma = args.itens.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  if (soma !== args.totalCentavos) {
    throw new Error(`Itens (${soma}) não batem com o total (${args.totalCentavos}).`)
  }
  const r = await chamar<{ id: string }>('POST', '/orders', {
    number: args.numero,
    reference: args.referencia,
    status: 'DRAFT',
    items: args.itens.map((i) => ({ ...i, unit_of_measure: 'EACH' })),
    transactions: [],
    price: args.totalCentavos,
    ...(args.paymentCode ? { payment_code: args.paymentCode } : {}),
  })
  if (!r.id) throw new Error('Cielo não devolveu o id do pedido.')
  return r.id
}

/**
 * Forma de pagamento do totem -> valor aceito em payment_code (docs.cielo.com.br, "Valores aceitos
 * no campo paymentCode"). O totem só vende à vista. Com isso a maquininha pula direto pra
 * "insira ou aproxime o cartão" (só o pagamento total do pedido).
 */
export function codigoPagamentoCielo(forma: string): string | undefined {
  switch (forma) {
    case 'pix':
      return 'PIX'
    case 'cartao_credito':
      return 'CREDITO_AVISTA'
    case 'cartao_debito':
      return 'DEBITO_AVISTA'
    default:
      return undefined
  }
}

/** Libera o pedido pra pagamento: ele passa a aparecer na maquininha. */
export async function liberarPedidoCielo(id: string): Promise<void> {
  await chamar('PUT', `/orders/${id}?operation=PLACE`)
}

export async function consultarPedidoCielo(id: string): Promise<PedidoCielo> {
  return chamar<PedidoCielo>('GET', `/orders/${id}`)
}

/** Fecha o pedido (depois de pago, ou pra tirar da maquininha se o cliente desistiu). */
export async function fecharPedidoCielo(id: string): Promise<void> {
  await chamar('PUT', `/orders/${id}?operation=CLOSE`)
}

/** SÓ SANDBOX: simula um pagamento aprovado (não existe maquininha no sandbox). */
export async function simularPagamentoCielo(id: string, valorCentavos: number): Promise<void> {
  if (!cieloSandbox()) throw new Error('Simulação de pagamento só existe no sandbox.')
  await chamar('POST', `/orders/${id}/transactions`, {
    id: crypto.randomUUID(),
    external_id: id,
    status: 'CONFIRMED',
    terminal_number: 'SANDBOX-0001',
    authorization_code: '123456',
    number: String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0'),
    amount: valorCentavos,
    transaction_type: 'PAYMENT',
    // a documentação mostra estes campos em camelCase no corpo desta chamada
    paymentFields: {
      primaryProductName: 'CREDITO',
      secondaryProductName: 'A VISTA',
      numberOfQuotas: 0,
    },
    card: { brand: 'VISA', mask: '411111******1111' },
  })
}

/** Lê o pedido da Cielo e diz se já foi pago (transação CONFIRMED ou status PAID). */
export function resultadoDoPedido(o: PedidoCielo): {
  pago: boolean
  nsu: string | null
  autorizacao: string | null
} {
  const pagamento = (o.transactions ?? []).find(
    (t) =>
      String(t.transaction_type).toUpperCase() === 'PAYMENT' &&
      String(t.status).toUpperCase() === 'CONFIRMED',
  )
  const pago = !!pagamento || String(o.status).toUpperCase() === 'PAID'
  return {
    pago,
    nsu: pagamento?.number ?? null,
    autorizacao: pagamento?.authorization_code ?? null,
  }
}
