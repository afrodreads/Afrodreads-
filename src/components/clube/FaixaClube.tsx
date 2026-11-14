"use client";

import { useEffect, useState } from "react";
import { entrarNoClube } from "@/lib/clube-lead";

// Frases curtas: precisam caber inteiras numa tela de 360 px.
const FRASES = ["Participe do Clube Afro Dreads", "Ofertas com desconto real", "É grátis, direto no WhatsApp"];
const N = FRASES.length;
// Cada troca gira o rolo uma volta inteira e mais uma frase, como uma roleta.
const VOLTAS = 1;
const PASSO = N * VOLTAS + 1;
// A lista repetida precisa cobrir o maior índice antes de voltar ao começo.
const ROLO = Array.from({ length: N * (VOLTAS + 2) }, (_, i) => FRASES[i % N]);
const TROCA_MS = 3200;
const GIRO_MS = 900;

// Faixa do Clube logo abaixo do cabeçalho da home. Clicar leva direto ao grupo.
export function FaixaClube() {
  const [pos, setPos] = useState(0);
  const [girando, setGirando] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setGirando(true);
      // Parte sempre do primeiro bloco: mesmo se o navegador atrasar o "volta ao começo"
      // (aba em segundo plano), o rolo nunca passa do fim da lista.
      setPos((p) => (p % N) + PASSO);
    }, TROCA_MS);
    return () => window.clearInterval(id);
  }, []);

  // Depois de parar, volta o rolo para o primeiro bloco sem animação (mesma frase na tela).
  // Com "menos movimento" no sistema, o CSS tira a transição e a frase só troca.
  useEffect(() => {
    if (!girando) return;
    const id = window.setTimeout(() => {
      setGirando(false);
      setPos((p) => p % N);
    }, GIRO_MS);
    return () => window.clearTimeout(id);
  }, [girando]);

  const atual = FRASES[pos % N];

  return (
    <a
      href="/clube/entrar"
      onClick={(e) => entrarNoClube(e, "faixa-home")}
      aria-label={`${atual}. Entrar no grupo grátis do Clube Afro Dreads no WhatsApp`}
      className="faixa-clube group flex h-11 items-center gap-2 rounded-ad-pill border border-amarelo/40 bg-surface-raised px-2 pr-4 font-sans text-sm transition-colors hover:border-amarelo sm:h-12 sm:text-base"
    >
      <span className="shrink-0 rounded-ad-pill bg-amarelo px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amarelo-on sm:text-[11px]">
        Clube
      </span>
      <span className="relative h-6 min-w-0 flex-1 overflow-hidden" aria-hidden="true">
        <span
          className={`faixa-rolo absolute inset-x-0 top-0 flex flex-col ${girando ? "faixa-girando" : ""}`}
          style={{
            transform: `translateY(${-pos * 1.5}rem)`,
            transition: girando ? `transform ${GIRO_MS}ms cubic-bezier(.2,.75,.25,1.12)` : "none",
          }}
        >
          {ROLO.map((f, i) => (
            <span key={i} className="block h-6 truncate font-semibold leading-6 text-ink">
              {f}
            </span>
          ))}
        </span>
      </span>
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0 text-amarelo transition-transform group-hover:translate-x-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </a>
  );
}
