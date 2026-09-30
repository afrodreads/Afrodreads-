// O prompt V2 (agente/00-prompt-do-agente-v2.md) é a ESPECIFICAÇÃO de
// comportamento. O código não copia o texto: lê o arquivo, divide em seções e
// decide, seção por seção, o que vai para o modelo e o que o código garante.
//
// Camadas pedidas para a Fase 2:
//   persona | conhecimento | regras de negócio | fluxo (estado/ferramentas)
//   | guardrails | configuração da unidade
// Seções que tratam de dados críticos ou de eventos NÃO vão para o modelo: o
// backend fornece o dado estruturado (promoção, localização) ou o evento SYSTEM
// envia a mensagem (cards, confirmação, finalização).

export type V2Layer =
  | "persona"
  | "knowledge"
  | "business_rules"
  | "flow"
  | "guardrails"
  | "unit_config" // vem da configuração da unidade, não do texto
  | "code_enforced"; // garantido pelo código/evento SYSTEM; fora do prompt

export type V2SectionKey = number | "preamble" | "notes";

export type V2Section = { key: V2SectionKey; title: string; body: string };

/** Classificação de cada seção do V2. Uma seção nova no V2 precisa entrar aqui. */
export const V2_LAYERS: Record<string, V2Layer> = {
  preamble: "code_enforced",
  "0": "unit_config", // variáveis e ações: o contexto estruturado e as ferramentas substituem
  "1": "persona",
  "2": "guardrails",
  "3": "guardrails",
  "4": "persona",
  "5": "persona",
  "6": "persona",
  "7": "persona",
  "8": "knowledge",
  "9": "business_rules",
  "10": "code_enforced", // promoção: dado com validade (promotions.ts), nunca texto fixo
  "11": "business_rules",
  "12": "knowledge",
  "13": "flow",
  "14": "flow",
  "15": "flow",
  "16": "flow",
  "17": "code_enforced", // estado pós-handoff: HUMAN bloqueia a IA no código
  "18": "code_enforced", // agendamento confirmado: evento SYSTEM
  "19": "code_enforced", // finalização: evento SYSTEM
  "20": "guardrails",
  "21": "guardrails",
  "22": "knowledge",
  "23": "guardrails",
  "24": "code_enforced", // campos de CRM: esquema da ferramenta update_lead_data
  "25": "code_enforced", // regras temporais: validade checada pelo código
  "26": "guardrails",
  "27": "persona",
  notes: "code_enforced",
};

const SECTION_HEADING = /^#{1,2} (\d+)\. (.+)$/;
const NOTES_HEADING = /^## NOTAS DE IMPLEMENTA/;

/** Divide o markdown do V2 em seções numeradas (mais o preâmbulo e as notas). */
export function parseV2(markdown: string): V2Section[] {
  const sections: V2Section[] = [];
  let current: V2Section = { key: "preamble", title: "Preâmbulo", body: "" };

  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const numbered = SECTION_HEADING.exec(line);
    if (numbered) {
      sections.push(current);
      current = { key: Number(numbered[1]), title: numbered[2].trim(), body: "" };
    } else if (NOTES_HEADING.test(line)) {
      sections.push(current);
      current = { key: "notes", title: "Notas de implementação", body: "" };
    } else {
      current.body += `${line}\n`;
    }
  }
  sections.push(current);

  return sections.map((section) => ({ ...section, body: section.body.trim() }));
}

export function layerOf(key: V2SectionKey): V2Layer | undefined {
  return V2_LAYERS[String(key)];
}

/** Seções do V2 sem classificação (o teste falha se existir alguma). */
export function unclassifiedSections(sections: V2Section[]): V2SectionKey[] {
  return sections.filter((section) => !layerOf(section.key)).map((section) => section.key);
}

/** Seções que vão para o prompt do modelo, na ordem do arquivo. */
export function promptSections(sections: V2Section[]): V2Section[] {
  return sections.filter((section) => {
    const layer = layerOf(section.key);
    return layer !== undefined && layer !== "code_enforced" && layer !== "unit_config";
  });
}
