import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '#/lib/supabase/browser'

export type UsuarioApp = {
  id: string
  estabelecimento_id: string | null
  papel: 'owner' | 'connect_admin'
}

type AuthCtx = {
  sessao: Session | null
  usuario: UsuarioApp | null
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<{ erro: string | null }>
  sair: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [usuario, setUsuario] = useState<UsuarioApp | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return
      setSessao(data.session)
      setCarregando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSessao(s)
    })
    return () => {
      ativo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!sessao?.user) {
      setUsuario(null)
      return
    }
    supabase
      .from('usuarios')
      .select('id, estabelecimento_id, papel')
      .eq('id', sessao.user.id)
      .maybeSingle()
      .then(({ data }) => setUsuario((data as UsuarioApp) ?? null))
  }, [sessao?.user?.id])

  const valor: AuthCtx = {
    sessao,
    usuario,
    carregando,
    entrar: async (email, senha) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })
      return { erro: error?.message ?? null }
    },
    sair: async () => {
      await supabase.auth.signOut()
    },
  }

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return c
}
