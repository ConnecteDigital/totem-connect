import type { PaginaCodigo } from './escpos'

/** Ajustes da impressora do totem, guardados no próprio tablet (localStorage). */
export type ConfigImpressora = {
  /** tabela de caracteres: cp850 (padrão BR com acentos), cp437 ou ascii (sem acento) */
  pagina: PaginaCodigo
  /** caracteres por linha: 48 (80mm, fonte A) é o padrão */
  colunas: number
  /** dispositivo USB pareado */
  vendorId?: number
  productId?: number
  nome?: string
}

export const CONFIG_PADRAO: ConfigImpressora = { pagina: 'cp850', colunas: 48 }

const CHAVE = 'totem.impressora.v1'

export function lerConfig(): ConfigImpressora {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return { ...CONFIG_PADRAO }
    return { ...CONFIG_PADRAO, ...(JSON.parse(bruto) as Partial<ConfigImpressora>) }
  } catch {
    return { ...CONFIG_PADRAO }
  }
}

export function salvarConfig(patch: Partial<ConfigImpressora>): ConfigImpressora {
  const nova = { ...lerConfig(), ...patch }
  try {
    localStorage.setItem(CHAVE, JSON.stringify(nova))
  } catch {
    /* sem storage: segue só com o valor em memória */
  }
  return nova
}
