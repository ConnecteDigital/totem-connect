import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Botao } from '#/components/totem/Botao'
import { lerConfig, salvarConfig, type ConfigImpressora } from '#/lib/impressora/config'
import type { PaginaCodigo } from '#/lib/impressora/escpos'
import { imprimirTeste, suportaWebUSB } from '#/lib/impressora/imprimir'
import { ponteNativa } from '#/lib/impressora/nativo'
import {
  descreverDispositivo,
  dispositivoPareado,
  parearImpressora,
} from '#/lib/impressora/webusb'

export const Route = createFileRoute('/totem/impressora')({ component: ConfigImpressora })

type Aviso = { tipo: 'ok' | 'erro'; texto: string } | null

function ConfigImpressora() {
  const navigate = useNavigate()
  const [cfg, setCfg] = useState<ConfigImpressora>(() => lerConfig())
  const [pareado, setPareado] = useState<string | null>(null)
  const [aviso, setAviso] = useState<Aviso>(null)
  const [ocupado, setOcupado] = useState(false)
  const webusb = suportaWebUSB()
  const nativo = ponteNativa()
  const [statusNativo, setStatusNativo] = useState<string>('')
  useEffect(() => {
    if (nativo) setStatusNativo(nativo.statusImpressora())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const atualizarPareado = useCallback(async () => {
    try {
      const d = await dispositivoPareado()
      setPareado(d ? descreverDispositivo(d) : null)
    } catch {
      setPareado(null)
    }
  }, [])

  useEffect(() => {
    void atualizarPareado()
  }, [atualizarPareado])

  function ajustar(patch: Partial<ConfigImpressora>) {
    setCfg(salvarConfig(patch))
  }

  async function parear(todos: boolean) {
    setAviso(null)
    try {
      const d = await parearImpressora(todos)
      setPareado(descreverDispositivo(d))
      setAviso({ tipo: 'ok', texto: 'Impressora pareada. Agora imprima a página de teste.' })
    } catch (e) {
      // NotFoundError = o operador fechou o seletor sem escolher
      const msg = (e as Error).name === 'NotFoundError' ? 'Nenhum dispositivo escolhido.' : (e as Error).message
      setAviso({ tipo: 'erro', texto: msg })
    }
  }

  async function testar() {
    setOcupado(true)
    setAviso(null)
    try {
      await imprimirTeste()
      setAviso({ tipo: 'ok', texto: 'Enviado! Confira se saiu certo (acentos, largura, corte).' })
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message })
    } finally {
      setOcupado(false)
    }
  }

  // Só existe dentro do app de quiosque do tablet (totem-tablet/)
  const [tabletNativo, setTabletNativo] = useState<{ versao: string } | null>(null)
  useEffect(() => {
    const n = (window as unknown as { TotemNativo?: { versao(): string } }).TotemNativo
    if (n) setTabletNativo({ versao: n.versao() })
  }, [])
  const abrirAjustesTablet = () =>
    (window as unknown as { TotemNativo?: { abrirConfig(): void } }).TotemNativo?.abrirConfig()

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-4xl font-extrabold">
          Impressora do <span className="text-laranja">totem</span>
        </h1>
        <p className="mt-2 text-white/60">
          Área do operador. Pareia a impressora USB uma vez; depois o totem imprime a senha sozinho.
        </p>

        <div className="mt-8 space-y-3 rounded-card bg-superficie p-5">
          {nativo ? (
            <Linha rotulo="Impressora (app do tablet)" valor={statusNativo || '—'} ok={statusNativo.includes('permitida')} />
          ) : (
            <>
              <Linha rotulo="WebUSB neste navegador" valor={webusb ? 'Disponível ✓' : 'Indisponível ✗'} ok={webusb} />
              <Linha rotulo="Impressora pareada" valor={pareado ?? 'Nenhuma'} ok={!!pareado} />
            </>
          )}
        </div>

        {nativo ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Botao
              variante="secundario"
              onClick={() => {
                nativo.pedirPermissaoImpressora()
                setStatusNativo(nativo.statusImpressora())
              }}
            >
              Permitir a impressora USB
            </Botao>
          </div>
        ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          <Botao onClick={() => parear(false)} disabled={!webusb}>
            Parear impressora
          </Botao>
          <Botao variante="secundario" onClick={() => parear(true)} disabled={!webusb}>
            Não apareceu? Mostrar todos os USB
          </Botao>
        </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-white/70">
            Tabela de caracteres
            <select
              value={cfg.pagina}
              onChange={(e) => ajustar({ pagina: e.target.value as PaginaCodigo })}
              className="mt-1 w-full rounded-xl bg-superficie px-4 py-4 text-lg text-white outline-none ring-1 ring-white/10"
            >
              <option value="cp850">Português com acentos (CP850)</option>
              <option value="cp437">CP437 (EUA)</option>
              <option value="ascii">Sem acentos (seguro)</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-white/70">
            Caracteres por linha
            <select
              value={cfg.colunas}
              onChange={(e) => ajustar({ colunas: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl bg-superficie px-4 py-4 text-lg text-white outline-none ring-1 ring-white/10"
            >
              <option value={48}>48 (80mm padrão)</option>
              <option value={42}>42 (80mm, margem maior)</option>
              <option value={32}>32 (58mm)</option>
            </select>
          </label>
        </div>

        <div className="mt-6">
          <Botao variante="secundario" onClick={testar} disabled={(!nativo && (!webusb || !pareado)) || ocupado}>
            {ocupado ? 'Imprimindo…' : 'Imprimir página de teste'}
          </Botao>
        </div>

        {aviso && (
          <p className={'mt-5 text-lg ' + (aviso.tipo === 'ok' ? 'text-green-400' : 'text-red-400')}>
            {aviso.texto}
          </p>
        )}

        {tabletNativo && (
          <div className="mt-6">
            <Botao variante="secundario" onClick={abrirAjustesTablet}>
              Ajustes do tablet (app v{tabletNativo.versao})
            </Botao>
          </div>
        )}

        <div className="mt-10">
          <Botao variante="terciario" onClick={() => navigate({ to: '/totem' })}>
            ‹ Voltar ao totem
          </Botao>
        </div>
      </div>
    </div>
  )
}

function Linha({ rotulo, valor, ok }: { rotulo: string; valor: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/60">{rotulo}</span>
      <span className={ok ? 'font-semibold text-white' : 'font-semibold text-white/40'}>{valor}</span>
    </div>
  )
}
