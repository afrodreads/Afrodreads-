"use client";

import { WhatsAppIcon } from "@/components/icons/SocialIcons";
import { entrarNoClube } from "@/lib/clube-lead";

const VARIANTES = {
  // Amarelo da marca (página /clube).
  marca: "bg-amarelo text-amarelo-on",
  // Verde do WhatsApp (página ponte /clube/vip, que recebe o tráfego dos anúncios).
  // Texto escuro: branco sobre esse verde não tem contraste suficiente.
  whatsapp: "clube-cta-verde bg-[#25D366] text-[#0B0B0C] hover:bg-[#2EE374]",
} as const;

// Botão principal das páginas do Clube. O clique dispara o "Lead" do Pixel da Meta e vai
// para /clube/entrar, que redireciona para o grupo. É esse "Lead" que a campanha otimiza.
export function EntrarNoClube({
  className,
  origem = "pagina-clube",
  variante = "marca",
  texto = "Entrar no grupo grátis",
}: {
  className?: string;
  origem?: string;
  variante?: keyof typeof VARIANTES;
  texto?: string;
}) {
  return (
    <a
      href="/clube/entrar"
      onClick={(e) => entrarNoClube(e, origem)}
      className={`clube-cta inline-flex h-16 w-full items-center justify-center gap-3 rounded-ad-pill px-8 font-sans text-base font-semibold uppercase tracking-wide sm:w-auto ${VARIANTES[variante]} ${className ?? ""}`}
    >
      <WhatsAppIcon className="h-6 w-6" />
      {texto}
    </a>
  );
}
