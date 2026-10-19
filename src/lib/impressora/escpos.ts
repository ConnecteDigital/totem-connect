/**
 * Gerador de comandos ESC/POS (padrão das impressoras térmicas de cupom).
 * Sem dependências — monta um Uint8Array pronto pra mandar pela USB.
 */

export type PaginaCodigo = 'cp850' | 'cp437' | 'ascii'

/** Número da tabela de caracteres no comando ESC t n (padrão Epson). */
const NUMERO_TABELA: Record<Exclude<PaginaCodigo, 'ascii'>, number> = {
  cp437: 0,
  cp850: 2,
}

/** CP850, bytes 0x80..0xFF em ordem (128 caracteres). */
const CP850_ALTO =
  'ÇüéâäàåçêëèïîìÄÅ' +
  'ÉæÆôöòûùÿÖÜø£Ø×ƒ' +
  'áíóúñÑªº¿®¬½¼¡«»' +
  '░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐' +
  '└┴┬├─┼ãÃ╚╔╩╦╠═╬¤' +
  'ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀' +
  'ÓßÔÒõÕµþÞÚÛÙýÝ¯´' +
  '­±‗¾¶§÷¸°¨·¹³²■ '

const MAPA_CP850: Map<string, number> = new Map(
  [...CP850_ALTO].map((c, i) => [c, 0x80 + i] as const),
)

/** Troca pontuação "bonita" por equivalentes simples que toda tabela tem. */
function normalizarPontuacao(s: string): string {
  return s
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, '*')
    .replace(/…/g, '...')
    .replace(/→/g, '->')
    .replace(/ /g, ' ')
}

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Converte texto unicode nos bytes da tabela escolhida. */
export function codificarTexto(texto: string, pagina: PaginaCodigo): number[] {
  const out: number[] = []
  for (const ch of normalizarPontuacao(texto)) {
    const cod = ch.codePointAt(0)!
    if (cod < 0x80) {
      out.push(cod)
      continue
    }
    if (pagina === 'cp850') {
      const b = MAPA_CP850.get(ch)
      if (b !== undefined) {
        out.push(b)
        continue
      }
    }
    // cp437 só garante o ASCII + alguns; pro resto e pro modo "ascii": tira o acento
    const base = semAcento(ch)
    if (base !== ch && base.length && base.charCodeAt(0) < 0x80) {
      for (const b of base) out.push(b.charCodeAt(0))
    } else if (cod > 0xffff || cod >= 0x2190) {
      // emoji / símbolos: ignora
    } else {
      out.push(0x3f) // '?'
    }
  }
  return out
}

const ESC = 0x1b
const GS = 0x1d
const LF = 0x0a

export class EscPos {
  private buf: number[] = []

  constructor(
    private readonly pagina: PaginaCodigo = 'cp850',
    readonly colunas = 48,
  ) {
    this.init()
  }

  /** ESC @ (reset) + escolhe a tabela de caracteres. */
  init(): this {
    this.buf.push(ESC, 0x40)
    if (this.pagina !== 'ascii') this.buf.push(ESC, 0x74, NUMERO_TABELA[this.pagina])
    return this
  }

  alinhar(modo: 'esquerda' | 'centro' | 'direita'): this {
    this.buf.push(ESC, 0x61, modo === 'esquerda' ? 0 : modo === 'centro' ? 1 : 2)
    return this
  }

  negrito(ligado: boolean): this {
    this.buf.push(ESC, 0x45, ligado ? 1 : 0)
    return this
  }

  /** Tamanho do caractere: 1..8 de largura e altura (GS ! n). */
  tamanho(largura = 1, altura = 1): this {
    const w = Math.min(Math.max(largura, 1), 8) - 1
    const h = Math.min(Math.max(altura, 1), 8) - 1
    this.buf.push(GS, 0x21, (w << 4) | h)
    return this
  }

  /** Escreve texto SEM quebra de linha. */
  texto(t: string): this {
    this.buf.push(...codificarTexto(t, this.pagina))
    return this
  }

  /** Escreve texto e quebra a linha. */
  linha(t = ''): this {
    return this.texto(t).quebrar()
  }

  quebrar(n = 1): this {
    for (let i = 0; i < n; i++) this.buf.push(LF)
    return this
  }

  separador(ch = '-'): this {
    return this.linha(ch.repeat(this.colunas))
  }

  /** Esquerda + direita na mesma linha; quebra a esquerda se for comprida. */
  /** `largura`: colunas disponíveis (use metade das colunas quando o texto estiver em largura 2x). */
  duasColunas(esq: string, dir: string, largura = this.colunas): this {
    const recuo = esq.match(/^\s*/)![0] // mantém o recuo (ex: "   + Bacon")
    const espaco = largura - dir.length - 1 - recuo.length
    const partes = quebrarPalavras(esq.trim(), Math.max(espaco, 8))
    partes.forEach((p, i) => {
      const txt = recuo + p
      if (i === 0) {
        this.linha(txt.padEnd(largura - dir.length, ' ') + dir)
      } else {
        this.linha(txt)
      }
    })
    return this
  }

  /** Avança o papel n linhas (ESC d n). */
  avancar(n: number): this {
    this.buf.push(ESC, 0x64, Math.min(n, 255))
    return this
  }

  /** Avança até a guilhotina e faz corte parcial (GS V 66 0). */
  cortar(): this {
    this.buf.push(GS, 0x56, 0x42, 0x00)
    return this
  }

  bytes(): Uint8Array {
    return Uint8Array.from(this.buf)
  }
}

/** Quebra um texto em linhas de no máximo `largura` caracteres, respeitando palavras. */
export function quebrarPalavras(texto: string, largura: number): string[] {
  const linhas: string[] = []
  let atual = ''
  for (const palavra of texto.split(/\s+/)) {
    if (!palavra) continue
    if (palavra.length > largura) {
      if (atual) linhas.push(atual)
      atual = ''
      for (let i = 0; i < palavra.length; i += largura) {
        linhas.push(palavra.slice(i, i + largura))
      }
      continue
    }
    if (!atual) atual = palavra
    else if ((atual + ' ' + palavra).length <= largura) atual += ' ' + palavra
    else {
      linhas.push(atual)
      atual = palavra
    }
  }
  if (atual) linhas.push(atual)
  return linhas.length ? linhas : ['']
}
