/**
 * Config de servidor. Só use em código server-only (server functions).
 */

/**
 * Pagamento em modo simulado. Quando true (default), o "pagar" no totem é
 * aprovado na hora. Quando false, o pedido fica 'aguardando_pagamento' e quem
 * conclui é o app da maquininha (Smart 2) / o simulador em /dev/maquininha.
 */
export function pagamentoMock(): boolean {
  return process.env.PAGAMENTO_MOCK !== 'false'
}

export type ProvedorPagamento = 'mock' | 'maquininha' | 'cielo'

/**
 * Quem cobra o pagamento:
 *  - 'mock'       aprova na hora (demonstração)
 *  - 'maquininha' app Kotlin da Smart 2 (PagBank) busca e conclui os pendentes
 *  - 'cielo'      Cielo Smart via Order Manager (o servidor cria o pedido pela API)
 * PAGAMENTO_PROVEDOR manda; sem ela vale o PAGAMENTO_MOCK de antes (compatível).
 */
export function pagamentoProvedor(): ProvedorPagamento {
  const p = process.env.PAGAMENTO_PROVEDOR
  if (p === 'mock' || p === 'maquininha' || p === 'cielo') return p
  return pagamentoMock() ? 'mock' : 'maquininha'
}
