import type { Metadata } from "next";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { AdButton } from "@/components/ui/Button";
import { ChannelCard } from "@/components/contato/ChannelCard";
import { ContactForm } from "@/components/contato/ContactForm";
import { WhatsAppIcon, InstagramIcon } from "@/components/icons/SocialIcons";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contato | Agende seu Horário — Afro Dreads Pirituba",
  description:
    "Fale com a Afro Dreads pelo WhatsApp ou Instagram, ou monte seu projeto de dreadlocks e microlocs pelo formulário. Estúdio em Pirituba, SP.",
  alternates: { canonical: "/contato" },
};

export default function ContatoPage() {
  return (
    <>
      <div className="border-b border-line px-6 pb-12 pt-32 sm:pt-40">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4">
          <AdEyebrow>Contato</AdEyebrow>
          <AdTitle as="h1" size="hero">
            Seu próximo visual começa <em>aqui.</em>
          </AdTitle>
          <p className="m-0 max-w-xl text-lg leading-relaxed text-ink-muted">
            Não sabe exatamente qual dread fazer? Sem problema. Conte pra gente como você gostaria de
            ficar e nossa equipe ajuda você a transformar sua ideia em um projeto personalizado.
          </p>
          <AdButton href={buildWhatsAppLink("geral")} size="lg" icon={<WhatsAppIcon className="h-5 w-5" />}>
            Quero falar com a Afro Dreads
          </AdButton>
        </div>
      </div>

      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col gap-4">
            <ChannelCard
              href={buildWhatsAppLink("geral")}
              icon={<WhatsAppIcon className="h-5 w-5" />}
              iconVariant="amarelo"
              title="WhatsApp"
              subtitle="Resposta da nossa equipe"
            />
            <ChannelCard
              href="https://instagram.com/afrodreads_"
              icon={<InstagramIcon className="h-5 w-5" />}
              iconVariant="roxo"
              title="Instagram"
              subtitle="Veja os trabalhos mais recentes"
            />
            <ChannelCard
              href="https://share.google/hdE6lHpW06wTsRZvc"
              icon={<PinIcon />}
              iconVariant="folha"
              title="Pirituba · São Paulo"
              subtitle="Endereço enviado após o agendamento"
            />
          </div>

          <ContactForm />
        </div>
      </section>
    </>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
