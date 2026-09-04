import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

const base = (props: P) => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

export const IconeToque = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 11V6a2 2 0 0 1 4 0v5" />
    <path d="M13 11V4a2 2 0 0 1 4 0v7" />
    <path d="M17 11V7a2 2 0 0 1 4 0v8a6 6 0 0 1-6 6h-2a7 7 0 0 1-6-4l-2.5-4.5a2 2 0 0 1 3.5-2L9 12" />
  </svg>
)

export const IconeCarrinho = (p: P) => (
  <svg {...base(p)}>
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="18" cy="20" r="1.5" />
    <path d="M2 3h3l2.4 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L23 7H6" />
  </svg>
)

export const IconeMais = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconeMenos = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
)

export const IconeLixeira = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
  </svg>
)

export const IconeSeta = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)

export const IconeCartao = (p: P) => (
  <svg {...base(p)}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
)

export const IconePix = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2l10 10-10 10L2 12 12 2z" />
  </svg>
)

export const IconeSacola = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 8h12l1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L6 8z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
)

export const IconeBanqueta = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 10h16M6 10l-2 11M18 10l2 11M9 10V4h6v6M9 15h6" />
  </svg>
)

export const IconeBusca = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
)

export const IconeChevron = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

export const IconeCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

export const IconeAjuda = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
)

export const IconeGlobo = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
  </svg>
)

export const IconeHamburguer = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 10a8 8 0 0 1 16 0M3 14h18M5 18h14" />
  </svg>
)

export const IconeBebida = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 3h12l-1.5 17a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1L6 3zM5 8h14" />
  </svg>
)

export const IconePorcao = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 9h14l-1 10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 9zM8 9V6M12 9V5M16 9V6" />
  </svg>
)

export const IconeSobremesa = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 16h16l-2 4H6l-2-4zM7 16a5 5 0 0 1 10 0M12 7v4M10 9h4" />
  </svg>
)

export const IconeCasa = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 11.5 12 4l8 7.5" />
    <path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9" />
  </svg>
)

export const IconeCombo = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 8a6 6 0 0 1 12 0M2 11h14M4 14h10M20 21V9M20 9c0-2 1-4 1-4s1 2 1 4a1 1 0 0 1-2 0z" />
  </svg>
)
