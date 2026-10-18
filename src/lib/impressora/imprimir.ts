import type { PedidoDb } from '#/lib/painel/pedidosDb'
import { lerConfig } from './config'
import { montarComanda, montarTeste } from './comanda'
import { enviar } from './webusb'

/** Imprime a senha do cliente na impressora do totem. Lança erro se falhar. */
export async function imprimirComandaCliente(pedido: PedidoDb): Promise<void> {
  await enviar(montarComanda(pedido, lerConfig()))
}

export async function imprimirTeste(): Promise<void> {
  await enviar(montarTeste(lerConfig()))
}

export { suportaWebUSB, ErroImpressora } from './webusb'
