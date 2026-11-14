"use client";

import { WhatsAppIcon } from "@/components/icons/SocialIcons";
import { entrarNoClube } from "@/lib/clube-lead";

// Botão principal da página do Clube. O clique dispara o "Lead" do Pixel da Meta e vai
// para /clube/entrar, que redireciona para o grupo. É esse "Lead" que a campanha otimiza.
export function EntrarNoClube({ className }: { className?: string }) {
  return (
    <a
      href="/clube/entrar"
      onClick={(e) => entrarNoClube(e, "pagina-clube")}
      className={`clube-cta inline-flex h-16 w-full items-center justify-center gap-3 rounded-ad-pill bg-amarelo px-8 font-sans text-base font-semibold uppercase tracking-wide text-amarelo-on sm:w-auto ${className ?? ""}`}
    >
      <WhatsAppIcon className="h-6 w-6" />
      Entrar no grupo grátis
    </a>
  );
}
