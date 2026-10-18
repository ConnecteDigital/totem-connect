const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/** 29.9 -> "R$ 29,90" */
export function formatarBRL(valor: number): string {
  return brl.format(valor)
}

/**
 * Os adicionais são cadastrados como "+ Bacon". Nas telas/impressões que já
 * colocam o próprio "+", tira o do nome pra não sair "+ + Bacon".
 */
export function nomeAdicional(nome: string): string {
  return nome.replace(/^\s*\+\s*/, '')
}
