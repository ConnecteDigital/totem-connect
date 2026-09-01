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
