"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, EASE, DURATION, STAGGER, Y_OFFSET } from "@/lib/gsap";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { AdButton } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/icons/SocialIcons";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(ref.current!.querySelectorAll("[data-hero-item]"), {
          opacity: 0,
          y: Y_OFFSET,
          duration: DURATION,
          ease: EASE,
          stagger: STAGGER,
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  useEffect(() => {
    // Autoplay via JS (mais confiavel entre navegadores que o atributo
    // HTML autoplay quando o video vem depois de outros scripts). Nao
    // depende de prefers-reduced-motion: e um video mudo e curto, com
    // controle manual de replay (clique), entao nao se enquadra no tipo
    // de movimento que essa preferencia visa evitar.
    videoRef.current?.play().catch(() => {});
  }, []);

  // Video toca uma vez ao carregar a pagina e para no ultimo quadro (sem
  // loop) — clicar/tocar nele reinicia a animacao do zero, sem precisar
  // recarregar a pagina.
  function replayVideo() {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(() => {});
  }

  return (
    <section
      className="relative overflow-hidden border-b border-line pt-28 sm:pt-24"
      style={{ backgroundColor: "#0C0C0C" }}
    >
      <div
        ref={ref}
        className="mx-auto grid max-w-6xl gap-4 px-6 pb-10 pt-2 sm:grid-cols-[1.1fr_0.9fr] sm:items-center sm:gap-12 sm:pb-24 sm:pt-16"
      >
        <div data-hero-item className="order-first flex justify-center sm:order-none">
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            poster="/hero-poster.jpg"
            role="button"
            tabIndex={0}
            aria-label="Reproduzir novamente a animação da Afro Dreads"
            onClick={replayVideo}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                replayVideo();
              }
            }}
            className="h-[26vh] max-h-[240px] w-auto cursor-pointer object-contain sm:h-auto sm:max-h-none sm:w-full sm:max-w-md"
          >
            <source src="/hero.webm" type="video/webm" />
            <source src="/hero.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:gap-8 sm:text-left">
          <div data-hero-item className="flex flex-col items-center gap-2 sm:items-start sm:gap-4">
            <AdEyebrow>Afro Dreads</AdEyebrow>
            <AdTitle as="h1" size="hero" className="text-center sm:text-left">
              Vem ficar no <em>estilo</em> com a gente.
            </AdTitle>
          </div>
          <p
            data-hero-item
            className="m-0 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg sm:text-[17px]"
          >
            Do primeiro dread às manutenções, criamos um visual pensado para combinar com você, seu
            estilo e sua rotina. <strong className="font-semibold text-amarelo">Escolha o comprimento,
            espessura, cor e estilo.</strong> A gente transforma sua ideia em realidade.
          </p>
          <div data-hero-item className="flex flex-wrap justify-center gap-3 sm:justify-start">
            <AdButton
              href={buildWhatsAppLink("geral")}
              size="lg"
              icon={<WhatsAppIcon className="h-5 w-5" />}
            >
              Quero ficar no estilo
            </AdButton>
          </div>
        </div>
      </div>
    </section>
  );
}
