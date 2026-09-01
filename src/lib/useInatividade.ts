import { useEffect, useRef, useState } from 'react'

type Opcoes = {
  /** ms até resetar (default 90s) */
  timeoutMs?: number
  /** ms antes do reset em que o aviso aparece (default 20s) */
  avisoMs?: number
  /** desliga o monitor (ex: na tela ociosa) */
  ativo?: boolean
  aoExpirar: () => void
}

/**
 * Monitora inatividade do usuário no totem. Qualquer toque/tecla reinicia a
 * contagem. Perto do fim mostra um aviso; se ninguém interagir, chama aoExpirar.
 * Retorna { avisando, segundos } para renderizar o aviso.
 */
export function useInatividade({
  timeoutMs = 90_000,
  avisoMs = 20_000,
  ativo = true,
  aoExpirar,
}: Opcoes) {
  const [avisando, setAvisando] = useState(false)
  const [segundos, setSegundos] = useState(Math.ceil(avisoMs / 1000))
  const cb = useRef(aoExpirar)
  cb.current = aoExpirar

  useEffect(() => {
    if (!ativo) {
      setAvisando(false)
      return
    }

    let alvo = Date.now() + timeoutMs

    const tick = window.setInterval(() => {
      const restante = alvo - Date.now()
      if (restante <= 0) {
        setAvisando(false)
        cb.current()
        alvo = Date.now() + timeoutMs
        return
      }
      const emAviso = restante <= avisoMs
      setAvisando(emAviso)
      if (emAviso) setSegundos(Math.ceil(restante / 1000))
    }, 250)

    const reset = () => {
      alvo = Date.now() + timeoutMs
      setAvisando(false)
    }
    const eventos = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const
    eventos.forEach((e) => window.addEventListener(e, reset, { passive: true }))

    return () => {
      window.clearInterval(tick)
      eventos.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [ativo, timeoutMs, avisoMs])

  return { avisando, segundos }
}
