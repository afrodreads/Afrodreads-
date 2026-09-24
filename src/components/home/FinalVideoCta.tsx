"use client";

import { useEffect, useRef } from "react";
import { useScrollReveal } from "@/lib/useScrollReveal";
import { AdEyebrow } from "@/components/ui/Eyebrow";
import { AdTitle } from "@/components/ui/SectionTitle";
import { AdButton } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/icons/SocialIcons";
import { buildWhatsAppLink } from "@/lib/whatsapp";

// Ultima secao da home, antes do rodape: video em loop da persona
// acenando. preload="none" + IntersectionObserver -- so carrega e toca
// quando a secao esta perto de entrar na tela, e pausa quando sai, pra
// nao pesar o carregamento da pagina com um video que fica bem embaixo.
export function FinalVideoCta() {
  const ref = useScrollReveal<HTMLDivElement>();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return; // fica só no poster, nunca chama load()/play()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (video.readyState === 0) {
              video.load();
            }
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { rootMargin: "200px 0px", threshold: 0.1 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="px-6 py-16 sm:py-24" style={{ backgroundColor: "#0C0C0C" }}>
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-[0.9fr_1.1fr] sm:items-center sm:gap-12">
        <div data-reveal className="flex justify-center">
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="none"
            poster="/final-loop-poster.jpg"
            aria-hidden="true"
            className="h-[26vh] max-h-[240px] w-auto object-contain sm:h-auto sm:max-h-none sm:w-full sm:max-w-sm"
          >
            <source src="/final-loop.webm" type="video/webm" />
            <source src="/final-loop.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
          <div data-reveal className="flex flex-col items-center gap-3 sm:items-start">
            <AdEyebrow>Vem com a gente</AdEyebrow>
            <AdTitle className="text-center sm:text-left">
              Seu próximo visual começa <em>aqui.</em>
            </AdTitle>
          </div>
          <p data-reveal className="m-0 max-w-xl text-lg leading-relaxed text-ink-muted">
            Não sabe exatamente qual dread fazer? Sem problema. Conte pra gente como você gostaria de
            ficar e nossa equipe ajuda você a transformar sua ideia em um projeto personalizado.
          </p>
          <span data-reveal className="text-sm font-bold uppercase tracking-wide text-amarelo">
            Vem ficar no estilo com a gente. 💛
          </span>
          <span data-reveal>
            <AdButton href={buildWhatsAppLink("geral")} size="lg" icon={<WhatsAppIcon className="h-5 w-5" />}>
              Quero falar com a Afro Dreads
            </AdButton>
          </span>
        </div>
      </div>
    </section>
  );
}
