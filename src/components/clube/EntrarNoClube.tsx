"use client";

import type { MouseEvent } from "react";
import { WhatsAppIcon } from "@/components/icons/SocialIcons";

// Botão principal da página do Clube. Dispara o evento "Lead" do Pixel da Meta (quando o
// pixel estiver instalado no site) e só depois vai para /clube/entrar, que redireciona
// para o grupo. É esse "Lead" que a campanha de anúncios otimiza.
export function EntrarNoClube({ className }: { className?: string }) {
  function aoClicar(e: MouseEvent<HTMLAnchorElement>) {
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    if (!fbq) return; // sem pixel: segue o link normalmente
    e.preventDefault();
    fbq("track", "Lead", { content_name: "Clube Afro Dreads" });
    // Pequena espera para o evento sair antes de trocar de página.
    window.setTimeout(() => {
      // /clube/entrar é um route handler que redireciona para fora (WhatsApp), não uma
      // página: navegação completa é o comportamento certo, router.push não serve aqui.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/clube/entrar";
    }, 300);
  }

  return (
    <a
      href="/clube/entrar"
      onClick={aoClicar}
      className={`inline-flex h-16 w-full items-center justify-center gap-3 rounded-ad-pill bg-amarelo px-8 font-sans text-base font-semibold uppercase tracking-wide text-amarelo-on transition-transform hover:-translate-y-0.5 hover:shadow-[0_0_0_4px_theme(colors.amarelo.soft)] sm:w-auto ${className ?? ""}`}
    >
      <WhatsAppIcon className="h-6 w-6" />
      Entrar no grupo grátis
    </a>
  );
}
