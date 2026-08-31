import { IconeBusca } from '#/components/icones'

export function CampoBusca({
  valor,
  aoMudar,
  placeholder = 'Buscar produtos',
}: {
  valor: string
  aoMudar: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-preto">
      <IconeBusca width={22} height={22} className="text-cinza-texto" />
      <input
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-lg outline-none placeholder:text-cinza-texto"
      />
    </div>
  )
}
