import { IconeToque } from '#/components/icones'

export function AvisoInatividade({ segundos }: { segundos: number }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 px-8 text-center backdrop-blur-sm">
      <IconeToque width={64} height={64} className="text-laranja" />
      <h2 className="mt-6 text-4xl font-extrabold">Ainda está por aí?</h2>
      <p className="mt-3 text-lg text-white/70">
        Toque na tela para continuar seu pedido.
      </p>
      <p className="mt-6 text-white/40">
        O pedido será reiniciado em <span className="font-bold text-white">{segundos}s</span>
      </p>
    </div>
  )
}
