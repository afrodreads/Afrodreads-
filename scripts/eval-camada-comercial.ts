// Avaliação da camada comercial com o Claude DE VERDADE (custa alguns centavos).
//
// Roda os 20 cenários pedidos pelo dono pelo mesmo caminho do agente (prompt V2 +
// camada comercial, travas, ferramentas), mas tudo em memória: não toca no banco,
// não fala com o ManyChat nem com o WhatsApp. Gera um relatório em docs/ para leitura.
//
// Uso (a chave fica só no ambiente do terminal, nunca em arquivo):
//   ANTHROPIC_API_KEY=... npx tsx scripts/eval-camada-comercial.ts
// Opcional: AGENT_MODEL (padrão claude-sonnet-5-5), AGENT_COMMERCIAL_LAYER=off (compara sem a camada).

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { recordOutboundMessage } from "../src/lib/conversations/message";
import { createClaudeModelFromEnv } from "../src/lib/agent-model/claude";
import { handleInboundShadow } from "../src/lib/agent/pipeline";
import { agentHarness, HARNESS_NOW, type ScriptedModel } from "../src/lib/agent/testSupport";

type Scenario = { name: string; turns: string[][] };

const SCENARIOS: Scenario[] = [
  { name: "1. pergunta o preço", turns: [["Oi, sou a Ana. Quanto custa pra fazer dread até a cintura?"]] },
  { name: "2. preço sem dizer o serviço", turns: [["Oi, me chamo Bruno. Quanto é?"]] },
  { name: "3. pronto para comprar", turns: [["Oi, sou a Carla. Quero micro preto até o ombro, cabeça toda. Meu cabelo tem uns 10 cm e já tenho referência. Quero fazer logo!"]] },
  { name: "4. indeciso", turns: [["Oi, sou o Diego. Tô na dúvida se faço dread, não sei se combina comigo"]] },
  { name: "5. acha caro", turns: [["Oi, sou a Eva", "Uma amiga fez dread e achei muito caro"]] },
  { name: "6. pede desconto", turns: [["Oi, sou o Fábio. Tem desconto se eu pagar no Pix?"]] },
  { name: "7. compara com concorrente", turns: [["Oi, sou a Gabi. Vi um lugar que faz mais barato que vocês"]] },
  { name: "8. vou pensar", turns: [["Oi, sou o Hugo. Quero microlocs"], ["Vou pensar e te falo"]] },
  { name: "9. falar depois", turns: [["Oi, sou a Iara. Agora não posso, falo com vocês depois"]] },
  { name: "10. medo de fazer", turns: [["Oi, sou a Júlia. Tenho muito medo de fazer dread e estragar meu cabelo"]] },
  { name: "11. primeira aplicação", turns: [["Oi, sou o Kauã. Nunca fiz dread, quero fazer pela primeira vez"]] },
  { name: "12. cliente antigo, manutenção", turns: [["Oi, sou a Lara. Fiz meus dreads com vocês ano passado e preciso de manutenção"]] },
  { name: "13. pergunta de promoção", turns: [["Oi, sou o Mateus. Tem alguma promoção?"]] },
  { name: "14. pergunta que o agente não sabe", turns: [["Oi, sou a Nina. Vocês atendem a domicílio em Campinas?"]] },
  { name: "15. pede para falar com uma pessoa", turns: [["Oi, sou o Otávio. Quero falar com uma pessoa, não com robô"]] },
  { name: "16. várias informações de uma vez", turns: [["Oi! Sou a Paula, quero microlocs pretos até o ombro, cabeça toda, meu cabelo tem uns 10 cm"]] },
  { name: "17. muda de ideia", turns: [["Oi, sou o Rafael. Quero dread M até o ombro"], ["Na verdade mudei de ideia, quero micro"]] },
  { name: "18. mensagens curtas e picadas", turns: [["oi", "sou a Sofia", "dread", "até a cintura", "quanto"]] },
  { name: "19. pronto para agendar", turns: [["Oi, sou o Tiago. Já mandei foto e referência pra Thay e ela me passou o valor, quero agendar sábado"]] },
  { name: "20. abandona antes de fechar", turns: [["Oi, sou a Vitória. Quero dread até o ombro"], ["Vou ver aqui e qualquer coisa eu volto"]] },
];

async function main() {
  process.env.AGENT_MODEL ??= "claude-sonnet-5-5";
  const model = createClaudeModelFromEnv();
  if (!model) {
    console.error("Defina ANTHROPIC_API_KEY no terminal para rodar a avaliação.");
    process.exit(1);
  }
  const root = process.cwd();
  const files = [path.join(root, "agente", "00-prompt-do-agente-v2.md")];
  if (process.env.AGENT_COMMERCIAL_LAYER !== "off") files.push(path.join(root, "agente", "08-camada-comercial.md"));
  const promptText = files.map((file) => readFileSync(file, "utf8")).join("\n\n");

  const report: string[] = [
    `# Avaliação da camada comercial (${new Date().toISOString().slice(0, 10)})`,
    "",
    `Modelo: ${model.id}. Camada comercial: ${files.length > 1 ? "ligada" : "desligada"}. Sem promoção ativa no teste.`,
    "",
  ];
  let costUsd = 0;

  for (const scenario of SCENARIOS) {
    const h = agentHarness(model as unknown as ScriptedModel, promptText);
    report.push(`## ${scenario.name}`, "");
    let now = HARNESS_NOW.getTime();
    let n = 0;
    for (const turn of scenario.turns) {
      for (const [index, content] of turn.entries()) {
        now += 20_000;
        n += 1;
        report.push(`> **Cliente:** ${content}`);
        const message = { unitId: h.unit.id, phone: "11987654321", customerName: null, externalMessageId: `eval-${n}`, content };
        // Mensagens enviadas juntas: só a última aciona o agente (como o agrupamento faz).
        if (index < turn.length - 1) {
          await h.inbound(`eval-${n}`, content, new Date(now));
          continue;
        }
        const result = await handleInboundShadow({ conversations: h.db, agent: h.live }, message, new Date(now));
        const run = "result" in result.agent ? result.agent.result : null;
        if (!run) {
          report.push(">", `> **Agente:** (não rodou: ${result.agent.outcome})`, "");
          continue;
        }
        costUsd += run.estimatedCostUsd ?? 0;
        const text = run.candidateText ?? run.blockedOriginalText ?? "(sem texto)";
        const blocked = run.outcome !== "DRAFT_SAVED";
        const stage = run.proposedActions
          .flatMap((action) => (action.tool === "update_lead_data" && action.data.stage ? [action.data.stage] : []))
          .join(", ");
        const handoff = run.proposedHandoff ? ` · encaminha (${run.proposedHandoff.reason})` : "";
        report.push(">", `> **Agente${blocked ? ` [${run.outcome}]` : ""}:** ${text.replace(/\n/g, " ")}`);
        const violations = run.violations.map((violation) => violation.code).join(", ");
        report.push(`>`, `> _estágio: ${stage || "—"}${handoff}${violations ? ` · travas: ${violations}` : ""}_`, "");
        if (run.candidateText && !blocked) {
          await recordOutboundMessage(
            h.db,
            { conversationId: result.inbound.conversationId, sender: "AI", senderRef: "eval", content: run.candidateText },
            new Date(now + 5_000),
          );
        }
      }
    }
    console.log(`ok: ${scenario.name}`);
  }

  report.push(`Custo estimado da avaliação: US$ ${costUsd.toFixed(3)}`);
  const out = path.join(root, "docs", `eval-camada-comercial-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(out, `${report.join("\n")}\n`);
  console.log(`Relatório: ${out}`);
}

void main();
