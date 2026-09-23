const RULES = [
  {
    big: "R$ 50",
    title: "Sinal para reservar",
    text: "Sinal fixo de R$ 50 para garantir seu horário. Em dezembro ou em atendimentos por temporada fora de São Paulo, o sinal passa a ser 50% do valor do serviço.",
  },
  {
    big: "2 dias",
    title: "Cancelou antes? Devolvemos",
    text: "Cancelamentos com 2 dias ou mais de antecedência têm o sinal devolvido integralmente.",
  },
  {
    big: "1 dia",
    title: "Em cima da hora",
    text: "Cancelamentos no mesmo dia ou com 1 dia de antecedência não têm o sinal devolvido.",
  },
];

export function PolicyRules() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {RULES.map((rule) => (
        <div key={rule.title} className="flex flex-col gap-3 rounded-ad-md border border-line bg-surface-raised p-6">
          <span className="font-serif text-4xl font-normal text-amarelo-text">{rule.big}</span>
          <h3 className="m-0 text-[17px] font-semibold text-ink">{rule.title}</h3>
          <p className="m-0 text-sm leading-relaxed text-ink-muted">{rule.text}</p>
        </div>
      ))}
    </div>
  );
}
