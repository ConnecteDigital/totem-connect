import { useEffect, useRef } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCarrinho } from "#/lib/carrinho";
import { LogoConnect } from "#/components/totem/CabecalhoTotem";
import { IconeToque } from "#/components/icones";
import { NOME_ESTABELECIMENTO } from "#/lib/marca";

export const Route = createFileRoute("/totem/")({ component: TelaInicial });

function TelaInicial() {
  const { limpar } = useCarrinho();
  const navigate = useNavigate();
  const toques = useRef<number[]>([]);

  // Acesso do operador: 5 toques seguidos na logo abrem a config da impressora.
  function toqueNaLogo() {
    const agora = Date.now();
    toques.current = [...toques.current.filter((t) => agora - t < 4000), agora];
    if (toques.current.length >= 5) {
      toques.current = [];
      navigate({ to: "/totem/impressora" });
    }
  }

  // sessão nova a cada vez que volta pra tela ociosa
  useEffect(() => {
    limpar();
  }, [limpar]);

  return (
    <div className="relative h-full">
      {/* a tela toda inicia o pedido... */}
      <Link
        to="/totem/onde-consumir"
        className="absolute inset-0 flex flex-col"
      >
        {/* espaço da faixa da logo (a logo fica FORA do link, logo abaixo) */}
        <div className="h-20" />

        {/* meio — tudo centralizado */}
        <div className="flex flex-1 flex-col items-center justify-center px-10 text-center">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-laranja" />
            <span className="text-lg font-bold uppercase tracking-widest text-white/90">
              {NOME_ESTABELECIMENTO}
            </span>
          </div>

          <h1 className="mt-6 text-7xl font-extrabold leading-[1.05] tracking-tight">
            TOQUE PARA
            <br />
            <span className="text-laranja">COMEÇAR</span>
          </h1>
          <div className="mt-5 h-1 w-24 rounded bg-laranja" />
          <p className="mt-6 max-w-md text-xl text-white/70">
            Faça seu pedido de forma{" "}
            <strong className="text-white">rápida e prática!</strong>
          </p>
        </div>

        {/* CTA colado na parte inferior, só cantos de cima arredondados */}
        <div className="flex items-center justify-center gap-4 rounded-t-[2.5rem] bg-laranja py-9 text-3xl font-extrabold text-white shadow-[0_-16px_40px_-12px_rgba(255,106,0,0.6)]">
          <IconeToque width={38} height={38} />
          TOQUE PARA COMEÇAR
        </div>
      </Link>

      {/* ...menos esta área: logo da Connect, discreta. 5 toques seguidos = acesso do operador.
          Fica fora do <Link> e com área de toque grande (96px) pra não errar com o dedo. */}
      <button
        type="button"
        aria-label="Logo"
        onClick={toqueNaLogo}
        className="absolute left-0 top-0 z-10 flex h-24 w-40 items-center px-7"
      >
        <LogoConnect tamanho={26} />
      </button>
    </div>
  );
}
