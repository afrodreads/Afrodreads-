import type { AgentContext } from "./context";
import { renderContextBlock } from "./context";
import { layerOf, parseV2, promptSections } from "./spec";
import { TOOL_DEFINITIONS } from "./tools";

// Monta o prompt do modelo: as seções do V2 que pertencem ao modelo (persona,
// conhecimento, regras explicáveis, fluxo e guardrails), mais o bloco de dados
// confiáveis do sistema e a descrição das ferramentas. O texto do V2 é lido do
// arquivo; não é copiado para o código.

export interface PromptSource {
  load(): Promise<string>;
}

const EXECUTION_RULES = [
  "# REGRAS DE EXECUÇÃO (definidas pelo sistema)",
  "",
  "- Você está em MODO SOMBRA: seu texto é um rascunho revisado por pessoas; nada é enviado automaticamente.",
  "- Fatos dinâmicos (promoção, sinal, datas, nome, links) vêm SOMENTE do bloco DADOS DO SISTEMA. O que não estiver lá é desconhecido.",
  "- Você não fala de preço, não confirma pagamento, não confirma nem oferece horário e não informa endereço ou mapa. O sistema e a equipe fazem isso.",
  "- Você não executa ações: só pode PROPOR `request_handoff` e `update_lead_data` pelas ferramentas.",
  "- Quando a conversa for passada para a equipe, você deixa de responder.",
].join("\n");

function renderTools(): string {
  return ["# FERRAMENTAS", "", ...TOOL_DEFINITIONS.map((tool) => `- ${tool.name}: ${tool.description}`)].join("\n");
}

export async function buildSystemPrompt(source: PromptSource, context: AgentContext): Promise<string> {
  const markdown = await source.load();
  const sections = promptSections(parseV2(markdown));

  const spec = sections
    .filter((section) => layerOf(section.key) !== undefined)
    .map((section) => `# ${section.key}. ${section.title}\n\n${section.body}`)
    .join("\n\n---\n\n");

  return [spec, EXECUTION_RULES, renderTools(), renderContextBlock(context)].join("\n\n---\n\n");
}
