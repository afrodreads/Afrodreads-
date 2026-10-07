import { readFileSync } from "node:fs";
import path from "node:path";

// Fotos de referência do portfólio da Afro Dreads (cópias pequenas em
// `agente/referencias/`). Vão junto com as fotos do cliente para o modelo
// comparar e não confundir os trabalhos (ex.: retwist com microlocs).
// Só leitura de arquivo local; nada de rede.

export type ReferenceImage = { mediaType: "image/jpeg"; data: string; caption: string };

export const REFERENCE_PHOTOS: readonly { file: string; caption: string }[] = [
  {
    file: "retwist-twists.jpg",
    caption:
      "RETWIST (método). O cabelo todo TORCIDO em twists, do começo ao fim da mecha, com divisões quadradas bem marcadas, espessura P ou M. NÃO é microlocs.",
  },
  {
    file: "retwist-twists-2.jpg",
    caption: "RETWIST (método), visto de cima. Cada mecha torcida em twist, divisões quadradas na raiz.",
  },
  {
    file: "start-locs.jpg",
    caption:
      "START LOCS. O comprimento fica SOLTO e só a RAIZ é enrolada/torcida, com divisões na raiz. Não é o cabelo todo torcido (isso é retwist).",
  },
  {
    file: "microlocs-inicio.jpg",
    caption:
      "Microlocs no início da formação. Divisões da raiz MUITO pequenas e numerosas, mechas fininhas (micro tranças/micro twist), pontas ainda soltas e volumosas.",
  },
  {
    file: "microlocs-micro-twist.jpg",
    caption: "Microlocs feitos com micro twist. Centenas de mechas muito fininhas e divisões minúsculas na raiz.",
  },
  {
    file: "microlocs-acobreados.jpg",
    caption: "Microlocs acobreados. Divisões pequenas, mechas finas e onduladas, cor acobreada no cabelo todo.",
  },
  {
    file: "microlocs-finalizados.jpg",
    caption: "Microlocs finalizados, curtos, vistos de trás. Muitas locs finas, já formadas.",
  },
  {
    file: "retwist-manutencao.jpg",
    caption:
      "Retwist como MANUTENÇÃO da raiz em dreads já formados (acobreados, espessura M). A raiz que cresceu é retorcida e as divisões ficam organizadas.",
  },
  {
    file: "dread-sintetico-twist.jpg",
    caption: "Dread sintético + twist. Dreads de espessura M com acabamento torcido (twist) e divisões grandes.",
  },
  {
    file: "primeira-aplicacao-topo.jpg",
    caption: "Primeira aplicação só no topo. Laterais raspadas, dreads finos/P compridos com pontas loiras (degradê).",
  },
  {
    file: "short-dread.jpg",
    caption: "Short Dread. Dreads curtos no topo, laterais baixas, visual curto e discreto.",
  },
  {
    file: "cabeca-toda.jpg",
    caption: "Primeira aplicação na cabeça toda. Dreads longos de espessura M, castanhos com pontas mais claras.",
  },
];

/** Lê as fotos de referência da pasta. Arquivo que faltar é ignorado (o agente segue sem ele). */
export function loadReferenceImages(dir: string): ReferenceImage[] {
  const images: ReferenceImage[] = [];
  for (const photo of REFERENCE_PHOTOS) {
    try {
      const data = readFileSync(path.join(dir, photo.file)).toString("base64");
      images.push({ mediaType: "image/jpeg", data, caption: photo.caption });
    } catch {
      // Sem a foto: segue sem essa referência.
    }
  }
  return images;
}
