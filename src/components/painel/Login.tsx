import { useState } from 'react'
import { useAuth } from '#/lib/auth'

export function Login() {
  const { entrar } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function submeter(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    const { erro } = await entrar(email.trim(), senha)
    setErro(erro)
    setEnviando(false)
  }

  return (
    <div className="painel-root grid min-h-screen place-items-center p-6">
      <form
        onSubmit={submeter}
        className="w-full max-w-sm rounded-2xl border border-cinza-medio bg-white p-8 shadow-sm"
      >
        <h1 className="text-xl font-bold">Entrar</h1>
        <p className="mt-1 text-sm text-cinza-texto">PDV · Produtos · Relatórios</p>

        <label className="mt-6 block text-sm font-medium">
          E-mail
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-cinza-medio px-3 py-2 outline-none focus:border-laranja"
          />
        </label>

        <label className="mt-4 block text-sm font-medium">
          Senha
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full rounded-lg border border-cinza-medio px-3 py-2 outline-none focus:border-laranja"
          />
        </label>

        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="mt-6 w-full rounded-pill bg-laranja px-4 py-3 font-bold text-white transition hover:bg-laranja-escuro disabled:opacity-50"
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
