// Agente de impressão (modo PC): fica de olho nos pedidos novos do Supabase e imprime a comanda
// do cliente na impressora térmica ligada neste PC (fila do Windows, impressão crua ESC/POS).
//
//   node scripts/impressora/agente.mjs [NomeDaImpressora=Totem]
//
// Busca os pedidos pelo servidor no ar (token do totem — nenhuma chave secreta nesta máquina).
import { execFile } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createServer } from 'vite'

const raiz = resolve(import.meta.dirname, '..', '..')

const impressora = process.argv[2] ?? 'Totem'
const base = process.env.BASE_URL ?? 'https://totem-connect-puce.vercel.app'
const token = process.env.DEVICE_TOKEN ?? 'tok_totem_piloto_TROQUE_ISTO'

const vite = await createServer({
  root: raiz,
  configFile: false,
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
  resolve: { alias: { '#': resolve(raiz, 'src') } },
})
const { montarComanda } = await vite.ssrLoadModule('/src/lib/impressora/comanda.ts')
const cfg = { pagina: 'cp850', colunas: 48 }
const pasta = mkdtempSync(join(tmpdir(), 'totem-print-'))

function imprimirBytes(bytes, nome) {
  const arquivo = join(pasta, nome)
  writeFileSync(arquivo, bytes)
  return new Promise((ok, falha) => {
    execFile(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        resolve(raiz, 'scripts/impressora/raw-print.ps1'),
        '-Impressora',
        impressora,
        '-Arquivo',
        arquivo,
      ],
      (err, out, errOut) => (err ? falha(new Error(errOut || err.message)) : ok(out.trim())),
    )
  })
}

async function buscarPedidos() {
  const r = await fetch(base + '/api/impressao/pendentes', { headers: { 'x-device-token': token } })
  if (!r.ok) throw new Error('servidor respondeu ' + r.status)
  return (await r.json()).pedidos ?? []
}

const jaImpressos = new Set()

// ao iniciar, marca os pedidos que já existem pra não imprimir o passado
for (const p of await buscarPedidos()) jaImpressos.add(p.id)
console.log(`Agente ligado. Impressora: "${impressora}". Aguardando pedidos novos…`)

let ocupado = false
setInterval(async () => {
  if (ocupado) return
  ocupado = true
  try {
    const novos = (await buscarPedidos())
      .filter((p) => !jaImpressos.has(p.id))
      // o pedido pode aparecer um instante antes dos itens serem gravados
      .filter((p) => p.pedido_itens.length > 0)
      .reverse()
    for (const p of novos) {
      jaImpressos.add(p.id)
      const msg = await imprimirBytes(montarComanda(p, cfg), `pedido-${p.numero_pedido}.bin`)
      console.log(`#${p.numero_pedido} (${p.nome_cliente ?? 'sem nome'}) -> ${msg}`)
    }
  } catch (e) {
    console.error('erro:', e.message)
  } finally {
    ocupado = false
  }
}, 2000)
