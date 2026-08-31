import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '#/lib/auth'
import { formatarBRL } from '#/lib/formato'
import { cn } from '#/lib/cn'
import {
  carregarCardapio,
  definirDisponivel,
  enviarFotoProduto,
  excluirCategoria,
  excluirProduto,
  salvarAdicionais,
  salvarCategoria,
  salvarProduto,
  type AdicionalDb,
  type Cardapio,
  type ProdutoDb,
} from '#/lib/painel/cardapioDb'

export const Route = createFileRoute('/_painel/pdv/produtos')({ component: Produtos })

function Produtos() {
  const { usuario } = useAuth()
  const estId = usuario?.estabelecimento_id ?? null

  const [dados, setDados] = useState<Cardapio | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [catSelecionada, setCatSelecionada] = useState<string | null>(null)
  const [editando, setEditando] = useState<ProdutoDb | 'novo' | null>(null)

  const recarregar = useCallback(async () => {
    if (!estId) return
    try {
      const c = await carregarCardapio(estId)
      setDados(c)
      setCatSelecionada((atual) => atual ?? c.categorias[0]?.id ?? null)
    } catch (e) {
      setErro((e as Error).message)
    }
  }, [estId])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  if (!estId) {
    return (
      <p className="text-cinza-texto">
        Seu usuário não está vinculado a um estabelecimento. Rode o <code>insert into usuarios</code> do README.
      </p>
    )
  }
  if (erro) return <p className="text-red-600">Erro: {erro}</p>
  if (!dados) return <p className="text-cinza-texto">Carregando cardápio…</p>

  const produtosDaCat = dados.produtos.filter((p) => p.categoria_id === catSelecionada)

  return (
    <div className="flex gap-6">
      <ColunaCategorias
        cardapio={dados}
        selecionada={catSelecionada}
        aoSelecionar={setCatSelecionada}
        estId={estId}
        aoMudar={recarregar}
      />

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Produtos</h1>
          <button
            onClick={() => setEditando('novo')}
            disabled={!catSelecionada}
            className="rounded-pill bg-laranja px-4 py-2 text-sm font-bold text-white hover:bg-laranja-escuro disabled:opacity-40"
          >
            + Novo produto
          </button>
        </div>

        {produtosDaCat.length === 0 ? (
          <p className="text-cinza-texto">Nenhum produto nesta categoria.</p>
        ) : (
          <ul className="space-y-2">
            {produtosDaCat.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-4 rounded-xl border border-cinza-medio bg-white p-3"
              >
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-cinza-claro text-xl">
                  {p.foto_url ? (
                    <img src={p.foto_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    '🍔'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{p.nome}</div>
                  <div className="truncate text-sm text-cinza-texto">{p.descricao}</div>
                </div>
                <div className="w-24 text-right font-bold">{formatarBRL(p.preco)}</div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={p.disponivel}
                    onChange={async (e) => {
                      await definirDisponivel(p.id, e.target.checked)
                      void recarregar()
                    }}
                  />
                  Disponível
                </label>
                <button
                  onClick={() => setEditando(p)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-cinza-texto hover:bg-cinza-claro"
                >
                  Editar
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`Excluir "${p.nome}"?`)) return
                    await excluirProduto(p.id)
                    void recarregar()
                  }}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editando && (
        <FormProduto
          cardapio={dados}
          estId={estId}
          categoriaPadrao={catSelecionada}
          produto={editando === 'novo' ? null : editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={async () => {
            setEditando(null)
            await recarregar()
          }}
        />
      )}
    </div>
  )
}

function ColunaCategorias({
  cardapio,
  selecionada,
  aoSelecionar,
  estId,
  aoMudar,
}: {
  cardapio: Cardapio
  selecionada: string | null
  aoSelecionar: (id: string) => void
  estId: string
  aoMudar: () => Promise<void>
}) {
  const [nova, setNova] = useState('')

  return (
    <div className="w-56 shrink-0">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-cinza-texto">
        Categorias
      </h2>
      <ul className="space-y-1">
        {cardapio.categorias.map((c) => (
          <li key={c.id} className="group flex items-center">
            <button
              onClick={() => aoSelecionar(c.id)}
              className={cn(
                'flex-1 rounded-lg px-3 py-2 text-left text-sm font-medium transition',
                c.id === selecionada
                  ? 'bg-laranja text-white'
                  : 'hover:bg-cinza-claro',
              )}
            >
              {c.nome}
            </button>
            <button
              title="Renomear"
              onClick={async () => {
                const nome = prompt('Novo nome da categoria', c.nome)?.trim()
                if (!nome) return
                await salvarCategoria({ id: c.id, estabelecimento_id: estId, nome, ordem: c.ordem })
                await aoMudar()
              }}
              className="px-1.5 text-xs text-cinza-texto opacity-0 group-hover:opacity-100"
            >
              ✎
            </button>
            <button
              title="Excluir"
              onClick={async () => {
                if (!confirm(`Excluir categoria "${c.nome}"? Os produtos ficam sem categoria.`)) return
                await excluirCategoria(c.id)
                await aoMudar()
              }}
              className="px-1.5 text-xs text-red-600 opacity-0 group-hover:opacity-100"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <form
        className="mt-3 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          const nome = nova.trim()
          if (!nome) return
          await salvarCategoria({
            estabelecimento_id: estId,
            nome,
            ordem: cardapio.categorias.length,
          })
          setNova('')
          await aoMudar()
        }}
      >
        <input
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          placeholder="Nova categoria"
          className="min-w-0 flex-1 rounded-lg border border-cinza-medio px-2 py-1.5 text-sm outline-none focus:border-laranja"
        />
        <button className="rounded-lg bg-preto px-3 text-sm font-bold text-white">+</button>
      </form>
    </div>
  )
}

function FormProduto({
  cardapio,
  estId,
  categoriaPadrao,
  produto,
  aoFechar,
  aoSalvar,
}: {
  cardapio: Cardapio
  estId: string
  categoriaPadrao: string | null
  produto: ProdutoDb | null
  aoFechar: () => void
  aoSalvar: () => Promise<void>
}) {
  const adicionaisIniciais = useMemo<Array<{ nome: string; preco: number }>>(
    () =>
      produto
        ? cardapio.adicionais
            .filter((a: AdicionalDb) => a.produto_id === produto.id)
            .map((a) => ({ nome: a.nome, preco: a.preco }))
        : [],
    [cardapio.adicionais, produto],
  )

  const [nome, setNome] = useState(produto?.nome ?? '')
  const [descricao, setDescricao] = useState(produto?.descricao ?? '')
  const [preco, setPreco] = useState(produto ? String(produto.preco) : '')
  const [categoriaId, setCategoriaId] = useState(produto?.categoria_id ?? categoriaPadrao ?? '')
  const [disponivel, setDisponivel] = useState(produto?.disponivel ?? true)
  const [fotoUrl, setFotoUrl] = useState<string | null>(produto?.foto_url ?? null)
  const [adicionais, setAdicionais] = useState(adicionaisIniciais)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function submeter(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      const id = await salvarProduto({
        id: produto?.id,
        estabelecimento_id: estId,
        categoria_id: categoriaId || null,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        preco: Number(preco.replace(',', '.')) || 0,
        foto_url: fotoUrl,
        disponivel,
        ordem: produto?.ordem ?? 0,
      })
      await salvarAdicionais(
        id,
        adicionais.filter((a) => a.nome.trim()).map((a) => ({ nome: a.nome.trim(), preco: a.preco })),
      )
      await aoSalvar()
    } catch (e) {
      setErro((e as Error).message)
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={aoFechar}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submeter}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6"
      >
        <h2 className="text-lg font-bold">{produto ? 'Editar produto' : 'Novo produto'}</h2>

        <label className="mt-4 block text-sm font-medium">
          Nome
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full rounded-lg border border-cinza-medio px-3 py-2 outline-none focus:border-laranja"
          />
        </label>

        <label className="mt-3 block text-sm font-medium">
          Descrição
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-cinza-medio px-3 py-2 outline-none focus:border-laranja"
          />
        </label>

        <div className="mt-3 flex gap-3">
          <label className="block flex-1 text-sm font-medium">
            Preço (R$)
            <input
              required
              inputMode="decimal"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              placeholder="0,00"
              className="mt-1 w-full rounded-lg border border-cinza-medio px-3 py-2 outline-none focus:border-laranja"
            />
          </label>
          <label className="block flex-1 text-sm font-medium">
            Categoria
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-cinza-medio px-3 py-2 outline-none focus:border-laranja"
            >
              <option value="">— sem categoria —</option>
              {cardapio.categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3">
          <span className="text-sm font-medium">Foto</span>
          <div className="mt-1 flex items-center gap-3">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-lg bg-cinza-claro text-xl">
              {fotoUrl ? (
                <img src={fotoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                '🍔'
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                setErro(null)
                try {
                  const url = await enviarFotoProduto(estId, f)
                  setFotoUrl(url)
                } catch (err) {
                  setErro('Falha no upload da foto: ' + (err as Error).message)
                }
              }}
              className="text-sm"
            />
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={disponivel}
            onChange={(e) => setDisponivel(e.target.checked)}
          />
          Disponível no totem
        </label>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Adicionais</span>
            <button
              type="button"
              onClick={() => setAdicionais((a) => [...a, { nome: '', preco: 0 }])}
              className="text-sm font-medium text-laranja"
            >
              + Adicionar
            </button>
          </div>
          <div className="space-y-2">
            {adicionais.map((a, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={a.nome}
                  onChange={(e) =>
                    setAdicionais((lista) =>
                      lista.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)),
                    )
                  }
                  placeholder="+ Bacon"
                  className="flex-1 rounded-lg border border-cinza-medio px-2 py-1.5 text-sm outline-none focus:border-laranja"
                />
                <input
                  inputMode="decimal"
                  value={String(a.preco)}
                  onChange={(e) =>
                    setAdicionais((lista) =>
                      lista.map((x, j) =>
                        j === i
                          ? { ...x, preco: Number(e.target.value.replace(',', '.')) || 0 }
                          : x,
                      ),
                    )
                  }
                  className="w-24 rounded-lg border border-cinza-medio px-2 py-1.5 text-sm outline-none focus:border-laranja"
                />
                <button
                  type="button"
                  onClick={() => setAdicionais((lista) => lista.filter((_, j) => j !== i))}
                  className="px-2 text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-pill px-4 py-2 text-sm font-medium text-cinza-texto hover:bg-cinza-claro"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="rounded-pill bg-laranja px-5 py-2 text-sm font-bold text-white hover:bg-laranja-escuro disabled:opacity-50"
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}
