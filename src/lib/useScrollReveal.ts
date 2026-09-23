"use client";

import { useEffect, useRef } from "react";
import { gsap, EASE, DURATION, STAGGER, Y_OFFSET } from "@/lib/gsap";

// Revela cada item [data-reveal] dentro do container quando ele entra na
// tela, usando IntersectionObserver nativo em vez do calculo de posicao de
// scroll do ScrollTrigger. Isso evita uma classe inteira de bugs onde a
// posicao do gatilho e calculada no mount (antes das fontes carregarem/
// layout estabilizar) e fica desalinhada depois — no Safari/iOS isso deixava
// secoes inteiras com opacity:0 preso, mas ainda clicaveis. Com
// IntersectionObserver a checagem e sempre contra o layout atual, e um
// setTimeout de seguranca garante que o conteudo nunca fique invisivel para
// sempre mesmo se algo falhar.
export function useScrollReveal<T extends HTMLElement>(selector = "[data-reveal]") {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(container.querySelectorAll<HTMLElement>(selector));
    if (items.length === 0) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      gsap.set(items, { opacity: 1, y: 0 });
      return;
    }

    gsap.set(items, { opacity: 0, y: Y_OFFSET });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const index = items.indexOf(el);
          gsap.to(el, {
            opacity: 1,
            y: 0,
            duration: DURATION,
            ease: EASE,
            delay: (index % 6) * STAGGER,
          });
          observer.unobserve(el);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" },
    );

    items.forEach((item) => observer.observe(item));

    // Rede de seguranca: se por qualquer motivo o observer nao disparar para
    // algum item (navegador, timing, etc.), garante visibilidade mesmo assim.
    const fallback = window.setTimeout(() => {
      items.forEach((item) => {
        if (getComputedStyle(item).opacity === "0") {
          gsap.set(item, { opacity: 1, y: 0 });
        }
      });
    }, 2000);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [selector]);

  return containerRef;
}
