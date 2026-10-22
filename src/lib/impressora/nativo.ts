/**
 * Ponte nativa de impressão: existe só dentro do app de quiosque do tablet (totem-tablet/),
 * versão 0.2.0 ou mais nova. O WebView não tem WebUSB, então o app imprime pelo USB do Android.
 */
type PonteImpressora = {
  imprimir(base64: string): string
  statusImpressora(): string
  pedirPermissaoImpressora(): boolean
}

export function ponteNativa(): PonteImpressora | undefined {
  if (typeof window === 'undefined') return undefined
  const p = (window as unknown as { TotemNativo?: Partial<PonteImpressora> }).TotemNativo
  return p && typeof p.imprimir === 'function' ? (p as PonteImpressora) : undefined
}

function paraBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin)
}

/** Manda os bytes pela ponte nativa. Lança erro com a mensagem do app se falhar. */
export function imprimirNativo(bytes: Uint8Array): void {
  const ponte = ponteNativa()
  if (!ponte) throw new Error('Ponte de impressão indisponível.')
  const r = ponte.imprimir(paraBase64(bytes))
  if (r !== 'ok') throw new Error(r)
}
