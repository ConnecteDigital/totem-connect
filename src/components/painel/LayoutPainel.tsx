import type { ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { AuthProvider, useAuth } from '#/lib/auth'
import { Login } from './Login'
import { cn } from '#/lib/cn'

/** Envolve /pdv e /relatorios: provê auth, exige login e desenha a navbar. */
export function LayoutPainel({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Gate>{children}</Gate>
    </AuthProvider>
  )
}

function Gate({ children }: { children: ReactNode }) {
  const { sessao, carregando, sair } = useAuth()
  const loc = useLocation()

  if (carregando) {
    return (
      <div className="painel-root grid min-h-screen place-items-center text-cinza-texto">
        Carregando…
      </div>
    )
  }
  if (!sessao) return <Login />

  const abas = [
    { to: '/pdv', rotulo: 'Fila' },
    { to: '/pdv/produtos', rotulo: 'Produtos' },
    { to: '/relatorios', rotulo: 'Relatórios' },
  ]

  return (
    <div className="painel-root min-h-screen">
      <header className="flex items-center justify-between border-b border-cinza-medio bg-white px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-bold">Totem Connect</span>
          <nav className="flex gap-1">
            {abas.map((a) => {
              const ativa =
                a.to === '/pdv'
                  ? loc.pathname === '/pdv'
                  : loc.pathname.startsWith(a.to)
              return (
                <Link
                  key={a.to}
                  to={a.to}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                    ativa
                      ? 'bg-laranja text-white'
                      : 'text-cinza-texto hover:bg-cinza-claro',
                  )}
                >
                  {a.rotulo}
                </Link>
              )
            })}
          </nav>
        </div>
        <button
          onClick={sair}
          className="text-sm text-cinza-texto hover:text-preto"
        >
          Sair
        </button>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
