import { lerConfig, salvarConfig } from './config'

/**
 * Conexão com a impressora térmica via WebUSB (Chrome no Android, direto do
 * navegador/PWA — sem app nativo). O 1º pareamento exige um toque do operador
 * (tela /totem/impressora); depois disso o Chrome lembra o aparelho e o totem
 * imprime sozinho, sem janela nenhuma.
 */

export type CodigoErro = 'SEM_SUPORTE' | 'SEM_DISPOSITIVO' | 'FALHA'

export class ErroImpressora extends Error {
  constructor(
    readonly codigo: CodigoErro,
    mensagem: string,
  ) {
    super(mensagem)
    this.name = 'ErroImpressora'
  }
}

type Conexao = { device: USBDevice; interfaceNumber: number; endpoint: number }
let conexao: Conexao | null = null

/** Tamanho de cada pacote enviado (impressoras baratas têm buffer pequeno). */
const TAM_PACOTE = 4096

export function suportaWebUSB(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator && !!navigator.usb
}

export function descreverDispositivo(d: USBDevice): string {
  const ids = `${hex(d.vendorId)}:${hex(d.productId)}`
  const nome = [d.manufacturerName, d.productName].filter(Boolean).join(' ')
  return nome ? `${nome} (${ids})` : ids
}

const hex = (n: number) => n.toString(16).padStart(4, '0')

/**
 * Abre o seletor de dispositivos USB do Chrome. `mostrarTodos` lista qualquer
 * USB (útil se a impressora não se identificar como "classe impressora").
 * Precisa ser chamado a partir de um toque do usuário.
 */
export async function parearImpressora(mostrarTodos = false): Promise<USBDevice> {
  if (!suportaWebUSB()) {
    throw new ErroImpressora(
      'SEM_SUPORTE',
      'Este navegador não tem WebUSB. Use o Chrome no Android (e abra o totem em https).',
    )
  }
  const device = await navigator.usb.requestDevice({
    filters: mostrarTodos ? [] : [{ classCode: 0x07 }],
  })
  salvarConfig({
    vendorId: device.vendorId,
    productId: device.productId,
    nome: descreverDispositivo(device),
  })
  await fechar() // força reabrir com o aparelho novo
  return device
}

/** Impressora já autorizada antes (não precisa de toque). */
export async function dispositivoPareado(): Promise<USBDevice | null> {
  if (!suportaWebUSB()) return null
  const todos = await navigator.usb.getDevices()
  if (!todos.length) return null
  const { vendorId, productId } = lerConfig()
  return (
    todos.find((d) => d.vendorId === vendorId && d.productId === productId) ?? todos[0]
  )
}

function acharSaida(device: USBDevice) {
  const cfg = device.configuration
  if (!cfg) return null
  let candidato: { interfaceNumber: number; alternate: number; endpoint: number } | null = null
  for (const itf of cfg.interfaces) {
    for (const alt of itf.alternates) {
      const saida = alt.endpoints.find((e) => e.direction === 'out' && e.type === 'bulk')
      if (!saida) continue
      const achado = {
        interfaceNumber: itf.interfaceNumber,
        alternate: alt.alternateSetting,
        endpoint: saida.endpointNumber,
      }
      if (alt.interfaceClass === 0x07) return achado // classe impressora: melhor opção
      candidato ??= achado
    }
  }
  return candidato
}

async function abrir(device: USBDevice): Promise<Conexao> {
  if (!device.opened) await device.open()
  if (device.configuration === null) await device.selectConfiguration(1)

  const saida = acharSaida(device)
  if (!saida) {
    throw new ErroImpressora(
      'FALHA',
      'Esse dispositivo USB não tem saída de impressão. É mesmo a impressora?',
    )
  }
  const itf = device.configuration?.interfaces.find(
    (i) => i.interfaceNumber === saida.interfaceNumber,
  )
  if (!itf?.claimed) await device.claimInterface(saida.interfaceNumber)
  if (saida.alternate !== 0) {
    await device.selectAlternateInterface(saida.interfaceNumber, saida.alternate)
  }
  return { device, interfaceNumber: saida.interfaceNumber, endpoint: saida.endpoint }
}

async function fechar() {
  const c = conexao
  conexao = null
  if (!c) return
  try {
    await c.device.close()
  } catch {
    /* já estava fechado / desconectado */
  }
}

/** Manda bytes ESC/POS pra impressora. Reconecta sozinho 1x se a conexão caiu. */
export async function enviar(bytes: Uint8Array): Promise<void> {
  if (!suportaWebUSB()) {
    throw new ErroImpressora('SEM_SUPORTE', 'WebUSB indisponível neste navegador.')
  }
  let ultimoErro: unknown
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      if (!conexao) {
        const device = await dispositivoPareado()
        if (!device) {
          throw new ErroImpressora(
            'SEM_DISPOSITIVO',
            'Nenhuma impressora pareada neste tablet. Abra a tela de configuração da impressora.',
          )
        }
        conexao = await abrir(device)
      }
      for (let i = 0; i < bytes.length; i += TAM_PACOTE) {
        const res = await conexao.device.transferOut(
          conexao.endpoint,
          bytes.slice(i, i + TAM_PACOTE),
        )
        if (res.status !== 'ok') throw new Error(`Impressora respondeu "${res.status}".`)
      }
      return
    } catch (e) {
      if (e instanceof ErroImpressora && e.codigo !== 'FALHA') throw e
      ultimoErro = e
      await fechar() // cabo trocado, tablet dormiu...: reabre na próxima volta
    }
  }
  throw ultimoErro instanceof Error
    ? ultimoErro
    : new ErroImpressora('FALHA', 'Falha ao enviar para a impressora.')
}
