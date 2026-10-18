import { useEffect, useState } from 'react'
import { cn } from '#/lib/cn'
import {
  definirTelaTotem,
  lerEstadoTotem,
  totemOnline,
  type EstadoTotem,
} from '#/lib/painel/totemDb'

/** Barra do PDV: sinal de vida do tablet do totem + botão ligar/desligar a tela. */
export function ControleTotem() {
  const [estado, setEstado] = useState<EstadoTotem | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let vivo = true
    const ler = async () => {
      try {
        const e = await lerEstadoTotem()
        if (vivo) {
          setEstado(e)
          setErro(false)
        }
      } catch {
        if (vivo) setErro(true)
      }
    }
    void ler()
    const t = setInterval(ler, 5000)
    return () => {
      vivo = false
      clearInterval(t)
    }
  }, [])

  if (!estado) return null

  const online = totemOnline(estado)
  const desejada = estado.tela_desejada
  const aguardando = online && estado.tela_atual !== null && estado.tela_atual !== desejada

  async function alternar() {
    const proximo = desejada === 'ligada' ? 'desligada' : 'ligada'
    if (proximo === 'desligada' && !confirm('Desligar a tela do totem?')) return
    setEnviando(true)
    try {
      await definirTelaTotem(proximo)
      setEstado((e) => (e ? { ...e, tela_desejada: proximo } : e))
    } catch {
      setErro(true)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span
        className="flex items-center gap-1.5 text-cinza-texto"
        title={online ? 'Tablet do totem conectado' : 'Tablet do totem sem sinal'}
      >
        <span className={cn('h-2.5 w-2.5 rounded-full', online ? 'bg-green-500' : 'bg-red-500')} />
        Totem {online ? 'online' : 'offline'}
        {online && estado.bateria_pct !== null && (
          <span>
            · {estado.bateria_pct}%{estado.carregando ? ' ⚡' : ''}
          </span>
        )}
      </span>
      <button
        onClick={alternar}
        disabled={enviando}
        className={cn(
          'rounded-lg px-3 py-1.5 font-medium transition disabled:opacity-50',
          desejada === 'ligada'
            ? 'bg-cinza-claro text-preto hover:bg-cinza-medio'
            : 'bg-laranja text-white',
        )}
      >
        {aguardando
          ? 'Aguardando…'
          : desejada === 'ligada'
            ? 'Desligar tela do totem'
            : 'Ligar tela do totem'}
      </button>
      {erro && <span className="text-red-600">sem conexão</span>}
    </div>
  )
}
