const ITEMS = [
  "Aplicação profissional",
  "Vem ficar no estilo com a gente",
  "Atendimento personalizado",
  "Confecção artesanal",
];

// Faixa amarela com texto rolando em loop CSS puro (duas metades idênticas,
// a animação anda -50%, então nunca aparece vazio) — mantida 100% CSS, sem
// GSAP: é um loop linear sem interação, GSAP não agregaria nada aqui.
export function MarqueeBanner() {
  const half = [...ITEMS, ...ITEMS, ...ITEMS];

  return (
    <div className="relative flex h-[52px] items-center overflow-hidden bg-amarelo font-mono text-amarelo-on">
      <div className="flex w-max animate-marquee items-center">
        {[half, half].map((group, groupIndex) => (
          <div key={groupIndex} className="flex flex-none items-center">
            {group.map((item, index) => (
              <span
                key={`${groupIndex}-${item}-${index}`}
                className="flex items-center gap-6 whitespace-nowrap py-0 pl-6 text-xs uppercase tracking-[0.14em] sm:text-[13px]"
              >
                {item} <span aria-hidden="true" className="text-[10px]">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
