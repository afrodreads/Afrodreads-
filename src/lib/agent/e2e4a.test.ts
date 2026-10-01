import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { finishConversation, handoffToHuman } from "../conversations/conversation";
import type { ModelResponse } from "./model";
import { handleInboundShadow, ingestInbound, processAfterQuietPeriod } from "./pipeline";
import { agentHarness, HARNESS_NOW as NOW, MemoryGroupingReader, ScriptedModel, SECRET_ADDRESS, SECRET_MAP } from "./testSupport";

// Cenários A–K da Fase 4A, ponta a ponta em SOMBRA. Em nenhum deles a IA envia
// mensagem: nenhuma Message OUTBOUND, nenhuma chamada de rede, nenhuma ação.

let networkCalls = 0;
const originalFetch = globalThis.fetch;
beforeEach(() => {
  networkCalls = 0;
  globalThis.fetch = (async () => {
    networkCalls += 1;
    throw new Error("rede proibida");
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const STAFF = { type: "HUMAN", ref: "atendente-1" } as const;

function scenario(response: ModelResponse) {
  const model = new ScriptedModel(() => response);
  const h = agentHarness(model);
  const send = (id: string, content: string, at = NOW) =>
    handleInboundShadow(
      { conversations: h.db, agent: h.live },
      { unitId: h.unit.id, phone: "11987654321", customerName: "Maria", externalConversationId: "contato-1", externalMessageId: id, content },
      at,
    );
  const assertNothingSent = () => {
    assert.equal(h.db.messages.filter((m) => m.direction === "OUTBOUND").length, 0, "nenhuma mensagem enviada");
    assert.equal(h.db.handoffs.length, 0, "handoff só proposto, nunca executado");
    assert.equal(networkCalls, 0, "nenhuma chamada de rede");
  };
  const promptOf = (i = 0) => JSON.stringify(model.calls[i]);
  return { model, h, send, assertNothingSent, promptOf };
}

const lead = (data: Record<string, unknown>) => ({ name: "update_lead_data", arguments: data });
const handoff = (reason: string, headline: string) => ({ name: "request_handoff", arguments: { reason, summary: { headline } } });

describe("cenários de atendimento em sombra", () => {
  it("A) 'dread até a cintura, preto, cabeça toda. Quanto fica?' → qualifica, não dá preço, propõe encaminhar", async () => {
    const s = scenario({
      text: "Que projeto lindo! A gente não trabalha com um valor único, porque cada projeto muda conforme comprimento, quantidade e material. Me manda uma foto do seu cabelo atual que eu organizo para a equipe avaliar. 💛",
      toolCalls: [lead({ intent: "ORCAMENTO", temperature: "QUENTE", desiredLength: "até a cintura", color: "preto", headArea: "cabeca_toda" }), handoff("QUOTE_REQUEST", "Orçamento: cintura, preto, cabeça toda")],
    });
    const result = await s.send("A1", "Oi, quero colocar dread até a cintura, preto, cabeça toda. Quanto fica?");
    const run = s.h.runs.runs[0];
    assert.equal(result.agent.outcome, "DRAFT_SAVED");
    assert.equal(run.intent, "ORCAMENTO");
    assert.equal(run.proposedHandoff?.reason, "QUOTE_REQUEST");
    assert.match(s.promptOf(), /preço ou faixa de preço/);
    s.assertNothingSent();
  });

  it("B) 'Quero manutenção.' → intenção de manutenção, pergunta o necessário", async () => {
    const s = scenario({
      text: "Boa! Me conta: seus dreads foram feitos aqui ou em outro lugar, e quando foi a última manutenção? 💛",
      toolCalls: [lead({ intent: "MANUTENCAO", appointmentType: "manutencao" })],
    });
    await s.send("B1", "Quero manutenção.");
    assert.equal(s.h.runs.runs[0].intent, "MANUTENCAO");
    assert.equal(s.h.runs.runs[0].guardrailOk, true);
    s.assertNothingSent();
  });

  it("C) 'Tenho cabelo com menos de 4 dedos.' → explica a regra com gentileza e pede foto (sem prometer)", async () => {
    const s = scenario({
      text: "O ideal é ter pelo menos 4 dedos de comprimento. Mas me manda uma foto que a equipe avalia e te orienta direitinho. 💛",
      toolCalls: [lead({ intent: "APLICACAO", currentLength: "menos de 4 dedos" })],
    });
    await s.send("C1", "Tenho cabelo com menos de 4 dedos.");
    assert.equal(s.h.runs.runs[0].outcome, "DRAFT_SAVED");
    s.assertNothingSent();
  });

  it("D) 'Quero falar com a Thay.' → propõe encaminhamento; a conversa continua BOT (nada executado)", async () => {
    const s = scenario({
      text: "Perfeito! Já deixei tudo organizado para a equipe continuar seu atendimento. 💛",
      toolCalls: [handoff("CUSTOMER_REQUEST", "Cliente pediu para falar com a atendente")],
    });
    await s.send("D1", "Quero falar com a Thay.");
    assert.equal(s.h.runs.runs[0].proposedHandoff?.reason, "CUSTOMER_REQUEST");
    assert.equal(s.h.db.conversations[0].mode, "BOT");
    s.assertNothingSent();
  });

  it("E) 'Qual o endereço?' → o modelo não conhece o endereço; se inventar, é bloqueado", async () => {
    const ok = scenario({ text: "A gente envia o endereço completo junto com a confirmação do horário. O estúdio fica em Bairro Teste. 💛", toolCalls: [] });
    await ok.send("E1", "Qual o endereço?");
    assert.equal(ok.h.runs.runs[0].guardrailOk, true);
    assert.equal(ok.promptOf().includes(SECRET_ADDRESS), false);
    assert.equal(ok.promptOf().includes(SECRET_MAP), false);
    ok.assertNothingSent();

    const bad = scenario({ text: "Fica na Rua das Palmeiras, 200, CEP 02950-000.", toolCalls: [] });
    await bad.send("E2", "Qual o endereço?");
    assert.equal(bad.h.runs.runs[0].outcome, "DRAFT_BLOCKED");
    assert.doesNotMatch(bad.h.runs.runs[0].candidateText ?? "", /Palmeiras|02950/);
    bad.assertNothingSent();
  });

  it("F) 'Vocês têm vaga amanhã?' → não promete vaga; promessa inventada é bloqueada", async () => {
    const ok = scenario({ text: "Quem vê a agenda é a equipe. Já deixei avisado para ela te passar os horários. 💛", toolCalls: [handoff("SCHEDULING", "Quer vaga amanhã")] });
    await ok.send("F1", "Vocês têm vaga amanhã?");
    assert.equal(ok.h.runs.runs[0].guardrailOk, true);
    ok.assertNothingSent();

    const bad = scenario({ text: "Temos vaga amanhã às 10h, pode vir!", toolCalls: [] });
    await bad.send("F2", "Vocês têm vaga amanhã?");
    assert.equal(bad.h.runs.runs[0].outcome, "DRAFT_BLOCKED");
    bad.assertNothingSent();
  });

  it("G) 'Meu pagamento foi confirmado?' → a IA não confirma pagamento; se tentar, é bloqueada", async () => {
    const ok = scenario({ text: "Quem confere pagamento é a equipe. Já avisei para ela verificar. 💛", toolCalls: [handoff("PAYMENT", "Pergunta sobre pagamento")] });
    await ok.send("G1", "Meu pagamento foi confirmado?");
    assert.equal(ok.h.runs.runs[0].proposedHandoff?.reason, "PAYMENT");
    assert.equal(ok.h.runs.runs[0].guardrailOk, true);
    ok.assertNothingSent();

    const bad = scenario({ text: "Sim, seu pagamento foi confirmado!", toolCalls: [] });
    await bad.send("G2", "Meu pagamento foi confirmado?");
    assert.equal(bad.h.runs.runs[0].outcome, "DRAFT_BLOCKED");
    bad.assertNothingSent();
  });

  it("H) 'Quanto custa?' → nenhum preço; preço inventado (até por extenso) é bloqueado", async () => {
    for (const invented of ["Custa R$ 600.", "Fica uns seiscentos reais."]) {
      const bad = scenario({ text: invented, toolCalls: [] });
      await bad.send("H1", "Quanto custa?");
      assert.equal(bad.h.runs.runs[0].outcome, "DRAFT_BLOCKED", invented);
      bad.assertNothingSent();
    }
  });

  it("I) mensagens rápidas ('Oi' / 'Queria colocar dread' / 'Até a cintura' / 'Quanto fica?') → uma execução só", async () => {
    const model = new ScriptedModel(() => ({ text: "Me manda uma foto do cabelo? 💛", toolCalls: [lead({ intent: "ORCAMENTO" })] }));
    const h = agentHarness(model);
    const grouping = new MemoryGroupingReader(h.db);
    const jobs: { conversationId: string; triggerMessageId: string }[] = [];
    const texts = ["Oi", "Queria colocar dread", "Até a cintura", "Quanto fica?"];
    for (const [i, text] of texts.entries()) {
      const { inbound } = await ingestInbound(
        h.db,
        { unitId: h.unit.id, phone: "11987654321", externalConversationId: "contato-1", externalMessageId: `I${i}`, content: text },
        new Date(NOW.getTime() + i * 1500),
      );
      jobs.push({ conversationId: inbound.conversationId, triggerMessageId: inbound.messageId });
    }
    const later = new Date(NOW.getTime() + 10_000);
    const results = await Promise.all(
      jobs.map((job) => processAfterQuietPeriod({ agent: h.live, grouping }, job, { policy: { quietMs: 4000, maxWaitMs: 20000 }, sleep: async () => {}, now: () => later })),
    );
    assert.deepEqual(results.map((r) => r.outcome), ["GROUPED", "GROUPED", "GROUPED", "DRAFT_SAVED"]);
    assert.equal(model.calls.length, 1);
    assert.equal(h.runs.runs[0].groupedMessageCount, 4);
    assert.equal(h.db.messages.filter((m) => m.direction === "OUTBOUND").length, 0);
    assert.equal(networkCalls, 0);
  });

  it("J) cliente manda mensagem enquanto HUMAN → salva, sem modelo, sem AgentRun, continua HUMAN", async () => {
    const s = scenario({ text: "não deveria ser chamado", toolCalls: [] });
    const first = await s.send("J1", "Oi");
    await handoffToHuman(s.h.db, { conversationId: first.inbound.conversationId, reason: "CUSTOMER_REQUEST", summary: { headline: "x" }, actor: STAFF });
    const calls = s.model.calls.length;
    const runs = s.h.runs.runs.length;

    const during = await s.send("J2", "Qual o horário?");

    assert.equal(during.agent.outcome, "SKIPPED_NOT_BOT");
    assert.equal(s.model.calls.length, calls);
    assert.equal(s.h.runs.runs.length, runs);
    assert.equal(s.h.db.conversations[0].mode, "HUMAN");
    assert.equal(s.h.db.messages.filter((m) => m.direction === "OUTBOUND").length, 0);
    assert.equal(networkCalls, 0);
  });

  it("K) cliente volta depois de FINISHED → conversa reaberta, agente sabe que é pós-atendimento", async () => {
    const s = scenario({ text: "Que bom te ver de novo, Maria! Como posso ajudar? 💛", toolCalls: [lead({ intent: "POS_ATENDIMENTO" })] });
    const first = await s.send("K1", "Oi");
    await handoffToHuman(s.h.db, { conversationId: first.inbound.conversationId, reason: "OTHER", summary: { headline: "x" }, actor: STAFF });
    await finishConversation(s.h.db, { conversationId: first.inbound.conversationId, actor: STAFF });

    const back = await s.send("K2", "Oi, voltei! Quero marcar a manutenção.", new Date(NOW.getTime() + 86_400_000));

    assert.equal(back.inbound.reopened, true);
    assert.equal(s.h.runs.runs.at(-1)?.agentStatus, "finalizado");
    assert.equal(s.h.runs.runs.at(-1)?.intent, "POS_ATENDIMENTO");
    assert.equal(s.h.db.messages.filter((m) => m.direction === "OUTBOUND").length, 0);
    assert.equal(networkCalls, 0);
  });
});
