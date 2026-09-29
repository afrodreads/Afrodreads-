// Guias (conteúdo de apoio para SEO/GEO) em /guias. Só usam informações que já
// estão no site (serviços, durações, regras de sinal). Sem preços: o valor
// depende do projeto e é combinado pelo WhatsApp.
export type GuideSection = { heading: string; paragraphs: string[] };

export type Guide = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  sections: GuideSection[];
  published: string;
  ctaLabel: string;
};

export const GUIDES: Guide[] = [
  {
    slug: "quanto-tempo-leva-fazer-dreads",
    title: "Quanto tempo leva para fazer dreads? | Afro Dreads Pirituba",
    h1: "Quanto tempo leva para fazer dreads?",
    description:
      "Veja quanto tempo dura o atendimento de cada serviço da Afro Dreads em Pirituba: primeira aplicação, microlocs, retwist, revitalização e mais.",
    intro:
      "A duração depende do serviço e do seu cabelo. Todos os atendimentos da Afro Dreads são com hora marcada, e por isso é importante reservar o dia inteiro ou boa parte dele.",
    sections: [
      {
        heading: "Duração de cada serviço",
        paragraphs: [
          "As faixas de tempo de cada serviço estão na lista de serviços desta página. Uma manutenção leva de 3 a 5 horas, uma primeira aplicação de 3 a 8 horas e os microlocs de 8 a 12 horas.",
        ],
      },
      {
        heading: "O que muda o tempo do atendimento",
        paragraphs: [
          "O comprimento do cabelo, a quantidade de dreads, a espessura e o tipo de procedimento influenciam a duração. Por isso cada serviço tem uma faixa de horas, e não um tempo fixo.",
          "Microlocs são formados fio a fio, o que torna o atendimento mais longo que os demais.",
        ],
      },
      {
        heading: "Como se organizar",
        paragraphs: [
          "Reserve o horário com antecedência, chegue com o cabelo como combinado com a equipe e leve o que precisar para ficar confortável durante o atendimento. O horário é garantido com um sinal, e as regras de cancelamento estão na página de serviços.",
        ],
      },
    ],
    published: "2026-09-29",
    ctaLabel: "Quero agendar meu horário",
  },
  {
    slug: "quanto-custa-fazer-dreads",
    title: "Quanto custa fazer dreads? | Afro Dreads Pirituba",
    h1: "Quanto custa fazer dreads?",
    description:
      "Entenda o que define o valor de dreadlocks e microlocs na Afro Dreads, em Pirituba, e como funciona o sinal para garantir o horário.",
    intro:
      "Não existe um preço único para dreads. O valor depende do seu projeto e é combinado direto com você pelo WhatsApp.",
    sections: [
      {
        heading: "O que define o valor",
        paragraphs: [
          "O valor final considera o comprimento, a quantidade, a espessura, o material, a cor e o tipo de procedimento. Dois clientes fazendo o mesmo serviço podem ter valores diferentes por causa desses detalhes.",
        ],
      },
      {
        heading: "Como é combinado",
        paragraphs: [
          "Você conta o que deseja pelo WhatsApp e a equipe ajuda a encontrar a melhor opção para o seu caso, informando o valor do projeto antes do atendimento.",
        ],
      },
      {
        heading: "Sinal para garantir o horário",
        paragraphs: [
          "O horário é reservado com um sinal fixo de R$ 50. Em dezembro ou em atendimentos por temporada fora de São Paulo, o sinal passa a ser 50% do valor do serviço.",
          "Cancelamentos com 2 dias ou mais de antecedência têm o sinal devolvido integralmente. No mesmo dia ou com 1 dia de antecedência, o sinal não é devolvido.",
        ],
      },
    ],
    published: "2026-09-29",
    ctaLabel: "Pedir o valor do meu projeto",
  },
  {
    slug: "diferenca-entre-dreads-e-microlocs",
    title: "Qual a diferença entre dreads e microlocs? | Afro Dreads Pirituba",
    h1: "Qual a diferença entre dreads e microlocs?",
    description:
      "Entenda a diferença entre dreadlocks e microlocs, quanto tempo cada um leva e para quem cada opção é indicada. Afro Dreads, Pirituba, SP.",
    intro:
      "Os dois são locs, mas diferem na espessura, na quantidade e no tempo de atendimento. Aqui está um resumo para você escolher com mais segurança.",
    sections: [
      {
        heading: "Dreadlocks",
        paragraphs: [
          "Na Afro Dreads, a primeira aplicação pode ser feita no topo da cabeça (3 a 5 horas) ou na cabeça toda (4 a 8 horas). É indicada para quem quer começar os dreads, com mais ou menos cobertura.",
        ],
      },
      {
        heading: "Microlocs",
        paragraphs: [
          "Microlocs são dreadlocks finos, formados fio a fio para um acabamento delicado. Por serem mais finos e numerosos, o atendimento leva de 8 a 12 horas.",
        ],
      },
      {
        heading: "Como escolher",
        paragraphs: [
          "A melhor escolha depende do seu cabelo, do visual que você quer e do tempo que você tem. Se estiver em dúvida, fale com a equipe pelo WhatsApp: você conta o que deseja e a gente ajuda a encontrar a melhor opção.",
        ],
      },
    ],
    published: "2026-09-29",
    ctaLabel: "Tirar minha dúvida no WhatsApp",
  },
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
