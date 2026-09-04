import { Link } from '@tanstack/react-router'
import { IconeGlobo, IconeChevron } from '#/components/icones'

/** Logo Connect no canto + seletor de idioma. Da 2ª tela em diante. */
export function CabecalhoTotem({ compacto = false }: { compacto?: boolean }) {
  return (
    <header className="flex items-center justify-between px-8 pt-6">
      <Link to="/totem" className="flex items-center gap-2">
        <LogoConnect />
        {!compacto && (
          <span className="text-lg font-bold leading-none">
            Connect <span className="font-medium text-laranja">Digital</span>
          </span>
        )}
      </Link>

      <button className="flex items-center gap-2 rounded-pill border border-white/20 px-4 py-2 text-sm">
        <IconeGlobo width={18} height={18} />
        Português
        <IconeChevron width={16} height={16} />
      </button>
    </header>
  )
}

/** Mesmo traço do ícone da PWA (public/icons/icon.svg), sem o fundo. */
export function LogoConnect({ tamanho = 28 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 512 512" fill="none" aria-hidden>
      <path
        d="M360 150a128 128 0 1 0 0 212"
        stroke="#FF6A00"
        strokeWidth="46"
        strokeLinecap="round"
      />
      <path
        d="M300 205a70 70 0 1 0 0 102"
        stroke="#FF6A00"
        strokeWidth="46"
        strokeLinecap="round"
      />
    </svg>
  )
}
