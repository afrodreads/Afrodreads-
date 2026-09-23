import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Linguagem de movimento única do site: toda animação de entrada usa estas
// mesmas constantes, em vez de um easing/duração diferente por seção — é o
// que evita o site parecer "cafona" com efeitos divergentes.
export const EASE = "power3.out";
export const DURATION = 0.7;
export const STAGGER = 0.08;
export const Y_OFFSET = 28;

export { gsap, ScrollTrigger };
