import type { WhatsAppMessageKey } from "@/lib/whatsapp";

// Conteúdo extra de cada serviço, usado nas páginas /servicos/[slug].
// Módulo sem "use client" para poder ser lido em componentes de servidor.
// Não há preços aqui: o valor depende do projeto e é combinado pelo WhatsApp.
export type ServiceDetail = {
  intent: WhatsAppMessageKey;
  video?: { src: string; poster: string };
  about: string;
  bestFor: string;
};

export const SERVICE_DETAILS: Record<string, ServiceDetail> = {
  "primeira-aplicacao-topo": {
    intent: "primeira",
    video: {
      src: "/services/primeira-aplicacao-topo.mp4",
      poster: "/services/primeira-aplicacao-topo-poster.jpg",
    },
    about:
      "A primeira aplicação (topo) forma os dreadlocks na região do topo da cabeça, deixando as laterais como estão. É uma forma de começar com dreads de maneira mais discreta e com menos tempo de cadeira.",
    bestFor:
      "Quem nunca fez dreads e quer um visual com volume no topo, ou prefere manter as laterais raspadas ou baixas.",
  },
  "cabeca-toda": {
    intent: "primeira",
    video: {
      src: "/services/primeira-aplicacao-cabeca-toda.mp4",
      poster: "/services/primeira-aplicacao-cabeca-toda-poster.jpg",
    },
    about:
      "A primeira aplicação de cabeça toda forma os dreadlocks em toda a cabeça. A duração e o resultado variam conforme o comprimento, a quantidade e a espessura dos dreads.",
    bestFor: "Quem quer começar os dreads completos, em toda a cabeça, de uma só vez.",
  },
  microlocs: {
    intent: "primeira",
    video: { src: "/services/microlocs.mp4", poster: "/services/microlocs-poster.jpg" },
    about:
      "Microlocs são dreadlocks finos, formados fio a fio para um acabamento delicado. Por serem mais finos e numerosos, é o atendimento mais longo do estúdio.",
    bestFor:
      "Quem busca dreads finos, versáteis para penteados e com acabamento mais delicado.",
  },
  retwist: {
    intent: "manutencao",
    video: { src: "/services/retwist.mp4", poster: "/services/retwist-poster.jpg" },
    about:
      "O retwist é a manutenção da raiz: o cabelo que cresceu é torcido de novo para manter os dreads alinhados e com boa aparência.",
    bestFor: "Quem já tem dreads e precisa manter a raiz organizada com o passar do tempo.",
  },
  revitalizacao: {
    intent: "revitalizacao",
    video: { src: "/revitalizacao.mp4", poster: "/revitalizacao-poster.jpg" },
    about:
      "A revitalização é um tratamento para renovar dreadlocks já formados. Veja exemplos de antes e depois reais no portfólio.",
    bestFor: "Quem já tem dreads e quer renová-los.",
  },
  "retwist-twist": {
    intent: "manutencao",
    video: { src: "/services/start-locs.mp4", poster: "/services/start-locs-poster.jpg" },
    about:
      "Start Locs é o início da formação das locs no cabelo natural, com mechas estruturadas de acordo com a textura e o resultado desejado.",
    bestFor: "Quem quer começar as locs com o próprio cabelo natural.",
  },
  penteados: {
    intent: "geral",
    video: { src: "/services/penteado.mp4", poster: "/services/penteado-poster.jpg" },
    about: "Penteados e finalizações para dreadlocks e microlocs, para eventos ou para o dia a dia.",
    bestFor: "Quem já tem dreads ou microlocs e quer um penteado especial.",
  },
  "short-dread": {
    intent: "primeira",
    video: { src: "/services/short-dread.mp4", poster: "/services/short-dread-poster.jpg" },
    about: "Formação de dreadlocks curtos, com um visual mais discreto e prático.",
    bestFor: "Quem quer um visual curto, discreto e de fácil manutenção. O cabelo precisa ter pelo menos 4 dedos de comprimento.",
  },
  "cultivo-agulhado": {
    intent: "primeira",
    video: {
      src: "/dreads-cultivo-agulhado.mp4",
      poster: "/dreads-cultivo-agulhado-poster.jpg",
    },
    about: "Técnica feita exclusivamente com o próprio cabelo, sem uso de extensões.",
    bestFor: "Quem quer dreads só com o próprio cabelo, sem adicionar material.",
  },
};
