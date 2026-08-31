const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/** 29.9 -> "R$ 29,90" */
export function formatarBRL(valor: number): string {
  return brl.format(valor)
}
