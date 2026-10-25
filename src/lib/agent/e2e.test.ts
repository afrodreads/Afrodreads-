import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleInboundShadow } from "./pipeline";
import { agentHarness, HARNESS_NOW as NOW, ScriptedModel } from "./testSupport";

// TESTE DE PONTA A PONTA (interno, em memória): uma mensagem real de cliente
// passa por todo o caminho do modo sombra. Qualquer tentativa de rede é
// interceptada e faz o teste falhar. (Agendamentos e pagamentos: o caminho não
// recebe nenhuma dependência que os altere; a contagem no banco real é conferida
// no teste de integração com Postgres, ver relatório da Fase 3.)

const MESSAGE = "Oi, quero colocar dread até a cintura, preto, cabeça toda. Quanto fica?";
// Valor de serviço que existe no sistema (orçamento/agendamento) e NUNCA pode chegar ao modelo.
const SERVICE_PRICE_IN_SYSTEM = "1.234,56";

let networkCalls: string[] = [];
const originalFetch = globalThis.fetch;

beforeEach(() => {
  networkCalls = [];
  globalThis.fetch = (async (input: unknown) => {
    networkCalls.push(String(input));
    throw new Error("rede proibida no modo sombra");
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("ponta a ponta: 'dread até a cintura, preto, cabeça toda. Quanto fica?'", () => {
  it("cria cliente, conversa, mensagem e AgentRun com intenção e qualificação, sem responder de verdade", async () => {
    const model = new ScriptedModel(() => ({
      text:
        "Que projeto lindo, Maria! A gente não trabalha com um valor único porque cada projeto muda conforme comprimento, quantidade, espessura e material. Me manda uma foto do seu cabelo atual que eu deixo tudo organizado para a equipe avaliar. 💛",
      toolCalls: [
        {
          name: "update_lead_data",
          arguments: {
            intent: "ORCAMENTO",
            temperature: "QUENTE",
            appointmentType: "aplicacao_do_zero",
            desiredLength: "até a cintura",
            color: "preto",
            headArea: "cabeca_toda",
          },
        },
        {
          name: "request_handoff",
          arguments: {
            reason: "QUOTE_REQUEST",
            summary: {
              headline: "Quer orçamento de dreads até a cintura, pretos, cabeça toda",
              collected: { comprimento: "até a cintura", cor: "preto", area: "cabeça toda" },
              openQuestions: ["Foto do cabelo atual"],
            },
          },
        },
      ],
    }));
    const h = agentHarness(model);

    const result = await handleInboundShadow(
      { conversations: h.db, agent: h.live },
      { unitId: h.unit.id, phone: "(11) 98765-4321", customerName: "Maria", externalMessageId: "wamid-1", content: MESSAGE },
      NOW,
    );

    // Customer / Conversation / Message
    assert.equal(h.db.customers.length, 1);
    assert.equal(h.db.customers[0].phone, "+5511987654321");
    assert.equal(h.db.conversations.length, 1);
    assert.equal(h.db.messages.length, 1);
    assert.equal(h.db.messages[0].content, MESSAGE);
    assert.equal(h.db.messages[0].direction, "INBOUND");

    // AgentRun
    assert.equal(result.agent.outcome, "DRAFT_SAVED");
    assert.equal(h.runs.runs.length, 1);
    const run = h.runs.runs[0];
    assert.equal(run.triggerMessageId, h.db.messages[0].id);
    assert.equal(run.intent, "ORCAMENTO");
    assert.equal(run.temperature, "QUENTE");
    assert.deepEqual(run.qualification, {
      intent: "ORCAMENTO",
      temperature: "QUENTE",
      appointmentType: "aplicacao_do_zero",
      desiredLength: "até a cintura",
      color: "preto",
      headArea: "cabeca_toda",
    });
    assert.equal(run.proposedHandoff?.reason, "QUOTE_REQUEST");
    assert.match(run.candidateText ?? "", /foto do seu cabelo/);
    assert.equal(run.guardrailOk, true); // guardrails executados e aprovados
    assert.ok(Array.isArray(run.violations));
    assert.match(run.promptVersion?.sha256 ?? "", /^[0-9a-f]{64}$/);

    // Preço NÃO entregue ao modelo
    const request = JSON.stringify(model.calls[0]);
    assert.equal(request.includes(SERVICE_PRICE_IN_SYSTEM), false);
    assert.doesNotMatch(request, /servicePrice|basePrice|remainingAmount/);
    assert.match(model.calls[0].system, /preço ou faixa de preço \(só a equipe passa o orçamento\)/);

    // Nada enviado, nada alterado
    assert.equal(h.db.messages.filter((m) => m.direction === "OUTBOUND").length, 0);
    assert.equal(h.db.conversations[0].mode, "BOT"); // handoff só PROPOSTO
    assert.equal(h.db.handoffs.length, 0);
    assert.deepEqual(networkCalls, []);
  });

  it("se o modelo inventar o preço, o guardrail barra e nada sai", async () => {
    const model = new ScriptedModel(() => ({ text: "Fica R$ 1.800 no total, cabeça toda até a cintura.", toolCalls: [] }));
    const h = agentHarness(model);
    const result = await handleInboundShadow(
      { conversations: h.db, agent: h.live },
      { unitId: h.unit.id, phone: "11987654321", externalMessageId: "wamid-2", content: MESSAGE },
      NOW,
    );
    assert.equal(result.agent.outcome, "DRAFT_BLOCKED");
    assert.doesNotMatch(h.runs.runs[0].candidateText ?? "", /1\.800/);
    assert.equal(h.db.messages.filter((m) => m.direction === "OUTBOUND").length, 0);
    assert.deepEqual(networkCalls, []);
  });
});
