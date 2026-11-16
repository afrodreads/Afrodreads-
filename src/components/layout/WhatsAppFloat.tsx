"use client";

import { usePathname } from "next/navigation";
import { WhatsAppIcon } from "@/components/icons/SocialIcons";
import { buildWhatsAppLink } from "@/lib/whatsapp";

// Páginas sem o botão do estúdio: na página ponte do Clube a única ação é entrar no grupo,
// e quem vem do anúncio não deve cair no WhatsApp de atendimento.
const SEM_BOTAO = ["/clube/vip"];

export function WhatsAppFloat() {
  const pathname = usePathname();
  if (SEM_BOTAO.some((p) => pathname === p || pathname?.startsWith(`${p}/`))) return null;
  return (
    <a
      href={buildWhatsAppLink("geral")}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-4 right-4 z-[60] flex h-14 items-center gap-2.5 rounded-ad-pill border-[3px] border-black bg-amarelo px-5 font-sans text-sm font-bold uppercase tracking-wide text-amarelo-on shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5 sm:px-[22px]"
    >
      <WhatsAppIcon className="h-6 w-6 shrink-0" />
      <span className="hidden sm:inline">Fale com a gente</span>
    </a>
  );
}
