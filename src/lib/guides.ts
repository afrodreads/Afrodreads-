// Guias (conteúdo de apoio para SEO/GEO) em /guias. Usam informações que já
// estão no site (serviços, durações, regras de sinal) e conteúdo fornecido pela
// equipe (ex.: roteiro de vídeo). Sem preços: o valor depende do projeto e é
// combinado pelo WhatsApp.
export type GuideSection = { heading: string; paragraphs: string[]; bullets?: string[] };

export type GuideVideo = {
  id: string; // ID do vídeo no YouTube
  name: string;
  description: string;
  uploadDate: string; // AAAA-MM-DD
  duration: string; // ISO 8601, ex.: PT4M47S
};

export type Guide = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  sections: GuideSection[];
  published: string;
  ctaLabel: string;
  serviceSlug?: string; // serviço relacionado (slug de SERVICES)
  video?: GuideVideo;
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
  {
    slug: "cuidados-com-dreads",
    title: "Cuidados com dreads: como lavar, hidratar e fazer a manutenção | Afro Dreads",
    h1: "Guia de cuidados com seus dreads",
    description:
      "Como cuidar dos dreads depois da aplicação e antes da manutenção: lavagem, hidratação, secagem, palm rolling e frequência da manutenção. Orientações da Afro Dreads, Pirituba.",
    intro:
      "Orientações da equipe da Afro Dreads para manter seus dreads organizados, firmes e com um crescimento saudável.",
    sections: [
      {
        heading: "Após a aplicação",
        paragraphs: [],
        bullets: [
          "Lave os dreads 1 vez por semana, utilizando apenas shampoo diluído em água.",
          "Evite condicionador. Para hidratação, utilize óleos vegetais em pequena quantidade, como óleo de babosa, óleo de semente de uva, óleo de jojoba ou óleo de alecrim.",
          "Lave preferencialmente durante o dia e deixe os dreads secarem completamente. Se necessário, utilize o secador no ar frio.",
          "Para dormir, use touca ou fronha de cetim, ajudando a reduzir o frizz.",
          "Faça palm rolling regularmente para manter os dreads alinhados e firmes.",
        ],
      },
      {
        heading: "Antes da manutenção",
        paragraphs: [],
        bullets: [
          "Lave os dreads somente com shampoo.",
          "Compareça com os dreads limpos e completamente secos.",
          "Evite cremes, óleos e finalizadores antes da manutenção, para não deixar resíduos.",
        ],
      },
      {
        heading: "Manutenção",
        paragraphs: [
          "A primeira manutenção deve ser realizada 1 mês após a aplicação. Depois, recomendamos manter a frequência entre 2 e 3 meses, de acordo com a necessidade dos seus dreads.",
          "A constância na manutenção ajuda a manter os dreads organizados, maduros, firmes e com um crescimento saudável.",
        ],
      },
    ],
    published: "2026-09-29",
    ctaLabel: "Agendar minha manutenção",
  },
  {
    slug: "microlocs-o-que-sao-como-funcionam",
    title: "Microlocs: o que são, métodos, manutenção e tempo | Afro Dreads",
    h1: "Microlocs: o guia completo antes de começar",
    description:
      "Tudo sobre microlocs: o que são, os 3 métodos de início, quantidade, manutenção, como lavar e quanto tempo levam para amadurecer. Afro Dreads, Pirituba.",
    intro:
      "Este guia reúne o que a Thay, da Afro Dreads, explica no vídeo abaixo: as respostas para as dúvidas mais comuns de quem quer começar microlocs.",
    sections: [
      {
        heading: "O que são microlocs?",
        paragraphs: [
          "Microlocs são locs bem fininhas, feitas em pequenas divisões por todo o cabelo. Elas são permanentes e passam por um processo natural de maturação até adquirirem a aparência característica das locs.",
          "Por serem menores, elas têm bastante movimento, são leves, delicadas e permitem fazer diversos penteados sem perder a identidade das locs.",
        ],
      },
      {
        heading: "Qualquer tipo de cabelo pode fazer microlocs?",
        paragraphs: [
          "Sim. As microlocs podem ser feitas em diferentes tipos e curvaturas de cabelo.",
          "O que muda não é se você pode ou não fazer, mas qual método será mais indicado para o seu tipo de fio. Essa escolha leva em consideração a textura, a curvatura, a densidade, o comprimento do cabelo e também o resultado que você deseja.",
        ],
      },
      {
        heading: "Quais são os métodos de início?",
        paragraphs: ["Existem três métodos principais para começar microlocs:"],
        bullets: [
          "Micro twists: cada divisão é torcida individualmente. Com o passar do tempo, as twists vão se compactando naturalmente até se transformarem em locs. É um processo gradual e faz parte da evolução das microlocs.",
          "Micro tranças: cada divisão é feita em forma de microtrança. Assim como as twists, elas também passam pelo processo de maturação até se transformarem em locs. É um método bastante resistente no início e muito utilizado em alguns tipos de cabelo.",
          "Método agulhado: cada microloc é construída manualmente com uma agulha de crochet. A grande vantagem é que a loc já sai estruturada desde o primeiro dia. Esse método também permite adicionar extensões, caso você queira começar com mais comprimento ou mais volume.",
        ],
      },
      {
        heading: "Quantas microlocs você vai ter?",
        paragraphs: [
          "Não existe uma quantidade padrão. Tudo varia conforme o tamanho do seu cabelo, a quantidade de cabelo, a densidade dos fios e a espessura que você deseja para as locs.",
          "De forma geral, um trabalho dificilmente terá menos de 200 microlocs. Dependendo do cabelo, esse número pode passar de 300, 400 ou até 500. Quanto menores forem as divisões, maior será a quantidade de microlocs.",
        ],
      },
      {
        heading: "Como funciona a manutenção?",
        paragraphs: [
          "Depois que você dá início ao cultivo, o seu cabelo continua crescendo normalmente. Por isso, é necessário reorganizar a raiz periodicamente.",
          "Uma das técnicas mais utilizadas é o interlock: ele consiste em passar a ponta da loc por dentro da própria raiz, utilizando uma ferramenta específica. Essa técnica mantém cada divisão organizada, fortalece a base das locs e acompanha o crescimento natural do cabelo.",
        ],
      },
      {
        heading: "De quanto em quanto tempo fazer a manutenção?",
        paragraphs: [
          "O ideal é fazer as manutenções em no máximo 30 a 90 dias. Esse intervalo pode variar conforme a velocidade de crescimento do seu cabelo.",
          "Se você demorar muito para fazer a manutenção, as raízes podem começar a se unir, o que deixa o processo mais demorado e dificulta a separação correta das divisões.",
        ],
      },
      {
        heading: "Como lavar as microlocs?",
        paragraphs: [
          "Você pode lavar normalmente. A higiene do couro cabeludo é essencial para manter as microlocs saudáveis.",
          "O ideal é usar um shampoo leve, que faça uma boa limpeza e seja suave (pode ser um neutro), e enxaguar muito bem para evitar resíduos.",
          "Nos métodos de micro twists e micro tranças, principalmente nas primeiras semanas, alguns cuidados extras podem ser indicados para preservar a estrutura inicial enquanto as locs começam o processo de maturação.",
        ],
      },
      {
        heading: "Quanto tempo as microlocs levam para amadurecer?",
        paragraphs: [
          "Depende muito do seu tipo de cabelo e do método utilizado. Em média:",
        ],
        bullets: [
          "Cabelos crespos (como 4A, 4B e 4C): a maturação costuma acontecer entre 6 meses e 1 ano.",
          "Cabelos cacheados (como 3A, 3B e 3C): esse processo geralmente leva entre 1 e 2 anos.",
          "Microlocs iniciadas no método agulhado: como já começam estruturadas, a aparência inicial é diferente. Ainda assim, elas também passam por um processo de amadurecimento interno, que costuma levar cerca de 1 ano, podendo variar de acordo com o tipo de cabelo e os cuidados ao longo da jornada.",
        ],
      },
      {
        heading: "Esses são apenas prazos médios",
        paragraphs: [
          "Cada cabelo amadurece no seu próprio tempo. Fatores como a rotina de cuidados, a frequência das manutenções e as características naturais dos fios podem acelerar ou prolongar esse processo.",
        ],
      },
      {
        heading: "As microlocs dão muito trabalho?",
        paragraphs: [
          "Na verdade, não. Depois que você cria uma rotina de cuidados e faz as manutenções no período recomendado, elas costumam ser muito práticas no dia a dia. Você continua lavando o cabelo, cuidando do couro cabeludo e vivendo normalmente.",
        ],
      },
      {
        heading: "Vale a pena fazer microlocs?",
        paragraphs: [
          "Se você procura um estilo duradouro, versátil, leve e cheio de personalidade, as microlocs podem ser uma excelente escolha.",
          "O mais importante é escolher o método ideal para o seu tipo de cabelo, respeitar o processo de maturação e manter uma boa rotina de cuidados. Assim, você acompanha a evolução das suas microlocs e aproveita cada fase dessa transformação.",
        ],
      },
    ],
    published: "2026-09-29",
    ctaLabel: "Quero fazer minha avaliação de microlocs",
    serviceSlug: "microlocs",
    video: {
      id: "A9BejPrvxik",
      name: "Microlocs: tudo que você precisa saber antes de fazer",
      description:
        "A Thay, da Afro Dreads, explica o que são microlocs, os métodos de início, a quantidade, a manutenção, como lavar e quanto tempo levam para amadurecer.",
      uploadDate: "2026-09-04",
      duration: "PT4M47S",
    },
  },
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
