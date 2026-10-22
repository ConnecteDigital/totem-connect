import type { PedidoDb } from '#/lib/painel/pedidosDb'
import { lerConfig } from './config'
import { montarComanda, montarTeste } from './comanda'
import { imprimirNativo, ponteNativa } from './nativo'
import { enviar, suportaWebUSB } from './webusb'

/** Dentro do app de quiosque usa a ponte nativa; no Chrome, WebUSB. */
async function enviarBytes(bytes: Uint8Array): Promise<void> {
  if (ponteNativa()) {
    imprimirNativo(bytes)
    return
  }
  await enviar(bytes)
}

/** Este aparelho consegue imprimir (app nativo ou navegador com WebUSB)? */
export function impressaoDisponivel(): boolean {
  return !!ponteNativa() || suportaWebUSB()
}

/** Imprime a senha do cliente na impressora do totem. Lança erro se falhar. */
export async function imprimirComandaCliente(pedido: PedidoDb): Promise<void> {
  await enviarBytes(montarComanda(pedido, lerConfig()))
}

export async function imprimirTeste(): Promise<void> {
  await enviarBytes(montarTeste(lerConfig()))
}

export { suportaWebUSB, ErroImpressora } from './webusb'
