const ITEMS = [
  "AGENDE AGORA",
  "FORMAÇÃO DE DREADS",
  "MICROLOCS",
  "RETWIST",
  "REVITALIZAÇÃO",
];

// Faixa amarela com texto rolando — referência direta à marquise (marquee) de
// entrada de tenda de circo, anunciando a atração.
export function MarqueeBanner() {
  const track = [...ITEMS, ...ITEMS];

  return (
    <div className="relative overflow-hidden bg-brand-yellow py-3">
      <div className="flex w-max animate-marquee gap-8">
        {[...track, ...track].map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="font-display text-sm tracking-widest text-brand-black sm:text-base"
          >
            {item} <span className="mx-4 text-brand-black/40">★</span>
          </span>
        ))}
      </div>
    </div>
  );
}
