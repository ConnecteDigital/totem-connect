// Converte o logo da Connect (mesmo traço de public/icons/icon.svg) num bitmap de 1 bit para a
// impressora térmica e grava src/lib/impressora/logoConnect.ts.
//
//   node scripts/impressora/gerar-logo.mjs [tamanho=96]   (múltiplo de 8)
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const tam = Math.round(Number(process.argv[2] ?? 96) / 8) * 8
const raiz = resolve(import.meta.dirname, '..', '..')

// mesmo desenho do LogoConnect (src/components/totem/CabecalhoTotem.tsx), em preto
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#fff"/>
  <path d="M360 150a128 128 0 1 0 0 212" fill="none" stroke="#000" stroke-width="46" stroke-linecap="round"/>
  <path d="M300 205a70 70 0 1 0 0 102" fill="none" stroke="#000" stroke-width="46" stroke-linecap="round"/>
</svg>`

const { data } = await sharp(Buffer.from(svg))
  .resize(tam, tam)
  .flatten({ background: '#ffffff' })
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true })

const bytesPorLinha = tam / 8
const bits = new Uint8Array(bytesPorLinha * tam)
for (let y = 0; y < tam; y++) {
  for (let x = 0; x < tam; x++) {
    if (data[y * tam + x] < 140) bits[y * bytesPorLinha + (x >> 3)] |= 0x80 >> (x & 7)
  }
}

const saida = `// GERADO por scripts/impressora/gerar-logo.mjs — não editar à mão.
// Logo da Connect em bitmap de 1 bit (${tam}x${tam}) para a impressora térmica (GS v 0).
export const LOGO_CONNECT = {
  bytesPorLinha: ${bytesPorLinha},
  altura: ${tam},
  base64: '${Buffer.from(bits).toString('base64')}',
}
`
writeFileSync(resolve(raiz, 'src/lib/impressora/logoConnect.ts'), saida)
console.log(`logo ${tam}x${tam} -> src/lib/impressora/logoConnect.ts (${bits.length} bytes)`)
