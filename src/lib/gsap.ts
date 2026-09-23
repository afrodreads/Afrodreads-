import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);

  // Evita recalculo espurio quando a barra de endereco do celular
  // aparece/some durante o scroll (mudanca de altura do viewport).
  ScrollTrigger.config({ ignoreMobileResize: true });

  // As posicoes de cada ScrollTrigger sao calculadas a partir do layout
  // no momento em que o componente monta. Fontes carregadas via
  // next/font/google trocam de peso/metrica ao terminar de baixar
  // (mesmo com font-display:swap ha reflow), o que desalinha essas
  // posicoes e pode deixar uma secao presa em opacity:0 (invisivel,
  // mas ainda clicavel) se o gatilho ja tiver "passado" antes do
  // recalculo. Por isso forcamos um refresh assim que o layout
  // estabiliza — apos as fontes carregarem e apos o load da pagina.
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener("load", refresh);
  document.fonts?.ready?.then(refresh);
}

// Linguagem de movimento única do site: toda animação de entrada usa estas
// mesmas constantes, em vez de um easing/duração diferente por seção — é o
// que evita o site parecer "cafona" com efeitos divergentes.
export const EASE = "power3.out";
export const DURATION = 0.7;
export const STAGGER = 0.08;
export const Y_OFFSET = 28;

export { gsap, ScrollTrigger };
