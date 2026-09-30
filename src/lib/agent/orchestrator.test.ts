import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { claimHandoff, finishConversation, handoffToHuman } from "../conversations/conversation";
import { NotShadowModeError } from "./config";
import { runAgentShadow } from "./orchestrator";
import { handleInboundShadow } from "./pipeline";
import { agentHarness, HARNESS_NOW as NOW, promotion, replyWith, ScriptedModel, SECRET_ADDRESS, SECRET_MAP } from "./testSupport";

const STAFF = { type: "HUMAN", ref: "atendente-1" } as const;

describe("AgentRun: cada execução fica registrada", () => {
  it("grava conversa, mensagem, modelo, versão do prompt, modo, resultado, rascunho, guardrails e duração", async () => {
    const model = replyWith("Me manda uma foto do cabelo que eu organizo para a equipe avaliar. 💛", [
      { name: "update_lead_data", arguments: { intent: "ORCAMENTO", temperature: "QUENTE" } },
    ]);
    const h = agentHarness(model);
    const first = await h.inbound("m1");

    const result = await runAgentShadow(h.live, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: NOW });

    assert.equal(result.outcome, "DRAFT_SAVED");
    assert.equal(h.runs.runs.length, 1);
    const run = h.runs.runs[0];
    assert.equal(run.id, result.runId);
    assert.equal(run.idempotencyKey, `inbound:${first.messageId}`);
    assert.equal(run.conversationId, first.conversationId);
    assert.equal(run.triggerMessageId, first.messageId);
    assert.equal(run.unitId, h.unit.id);
    assert.equal(run.trigger, "INBOUND");
    assert.equal(run.modelId, "modelo-roteirizado-v1");
    assert.equal(run.promptVersion?.name, "V7");
    assert.match(run.promptVersion?.sha256 ?? "", /^[0-9a-f]{64}$/);
    assert.equal(run.outcome, "DRAFT_SAVED");
    assert.equal(run.intent, "ORCAMENTO");
    assert.equal(run.temperature, "QUENTE");
    assert.deepEqual(run.qualification, { intent: "ORCAMENTO", temperature: "QUENTE" });
    assert.match(run.candidateText ?? "", /foto do cabelo/);
    assert.equal(run.guardrailOk, true);
    assert.equal(run.agentStatus, "novo");
    assert.equal(run.durationMs, 5);
    assert.deepEqual((run.contextSnapshot as { messageIds: string[] }).messageIds, [first.messageId]);
    assert.ok(run.completedAt instanceof Date);
    assert.equal(run.errorCode, null);
  });

  it("não cria Message OUTBOUND, não muda a conversa e não cria handoff real", async () => {
    const model = replyWith("Vou chamar a equipe. 💛", [
      { name: "request_handoff", arguments: { reason: "QUOTE_REQUEST", summary: { headline: "Quer orçamento" } } },
    ]);
    const h = agentHarness(model);
    const first = await h.inbound("m1");

    const result = await runAgentShadow(h.live, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: NOW });

    assert.deepEqual(result.result?.proposedHandoff, { reason: "QUOTE_REQUEST", summary: { headline: "Quer orçamento" } });
    assert.equal(h.db.messages.filter((m) => m.direction === "OUTBOUND").length, 0);
    assert.equal(h.db.messages.length, 1);
    assert.equal(h.db.conversations[0].mode, "BOT");
    assert.equal(h.db.handoffs.length, 0);
    assert.equal(h.db.transitions.length, 0);
  });

  it("recusa qualquer modo diferente de 'shadow' sem chamar o modelo nem gravar", async () => {
    const model = replyWith("oi");
    const h = agentHarness(model);
    const first = await h.inbound("m1");
    await assert.rejects(
      () => runAgentShadow({ ...h.live, config: { mode: "live" } }, { conversationId: first.conversationId, triggerMessageId: first.messageId }),
      NotShadowModeError,
    );
    assert.equal(model.calls.length, 0);
    assert.equal(h.runs.runs.length, 0);
  });

  it("o prompt enviado ao modelo nunca contém endereço, mapa nem promoção vencida", async () => {
    const model = replyWith("Claro!");
    const h = agentHarness(model);
    h.reader.promotions = [promotion(h.unit.id)];
    const late = new Date("2026-11-05T10:00:00-03:00");
    const first = await h.inbound("m1", "Oi", late);
    await runAgentShadow(h.live, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: late });

    const sent = JSON.stringify(model.calls[0]);
    assert.equal(sent.includes(SECRET_ADDRESS), false);
    assert.equal(sent.includes(SECRET_MAP), false);
    assert.equal(sent.includes("R$ 750"), false);
    assert.match(model.calls[0].system, /DADOS DO SISTEMA/);
  });

  it("erro do modelo é registrado sem segredos", async () => {
    const model = new ScriptedModel(() => {
      throw new Error("falhou com api_key=sk-abc123456789 e Bearer tok.en.value");
    });
    const h = agentHarness(model);
    const first = await h.inbound("m1");
    const result = await runAgentShadow(h.live, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: NOW });

    assert.equal(result.outcome, "MODEL_ERROR");
    const run = h.runs.runs[0];
    assert.equal(run.errorCode, "Error");
    assert.doesNotMatch(run.errorMessage ?? "", /sk-abc|tok\.en\.value/);
    assert.match(run.errorMessage ?? "", /\[redacted\]/);
    assert.equal(run.candidateText, null);
  });
});

describe("HUMAN bloqueia a IA: sem modelo e sem AgentRun", () => {
  it("cliente pede a Thay, a Thay assume, cliente pergunta o horário: nada de IA", async () => {
    const model = replyWith("Não deveria ser chamado");
    const h = agentHarness(model);

    // 1) "Quero falar com a Thay." (conversa ainda em BOT: o agente propõe handoff)
    const ask = await handleInboundShadow({ conversations: h.db, agent: h.live }, {
      unitId: h.unit.id,
      phone: "11987654321",
      externalMessageId: "w1",
      content: "Quero falar com a Thay.",
    }, NOW);
    assert.equal(ask.agent.outcome, "DRAFT_SAVED");
    const runsBefore = h.runs.runs.length;
    const callsBefore = model.calls.length;

    // 2) A Thay assume (ação humana real, fora da IA).
    await handoffToHuman(h.db, {
      conversationId: ask.inbound.conversationId,
      reason: "CUSTOMER_REQUEST",
      summary: { headline: "Cliente pediu para falar com a atendente" },
      actor: STAFF,
    });
    assert.equal(h.db.conversations[0].mode, "HUMAN");

    // 3) "Qual o horário?"
    const later = await handleInboundShadow({ conversations: h.db, agent: h.live }, {
      unitId: h.unit.id,
      phone: "11987654321",
      externalMessageId: "w2",
      content: "Qual o horário?",
    }, NOW);

    assert.equal(later.inbound.duplicate, false);
    assert.ok(h.db.messages.some((m) => m.id === later.inbound.messageId && m.content === "Qual o horário?")); // salva
    assert.equal(later.agent.outcome, "SKIPPED_NOT_BOT");
    assert.equal(later.agent.runId, null);
    assert.equal(h.runs.runs.length, runsBefore); // nenhum AgentRun novo
    assert.equal(model.calls.length, callsBefore); // modelo não chamado
    assert.equal(h.db.messages.filter((m) => m.sender === "AI").length, 0); // nenhuma resposta da IA
    assert.equal(h.db.conversations[0].mode, "HUMAN"); // continua HUMAN
  });

  it("várias mensagens em HUMAN (aberto ou assumido): todas salvas, zero execuções", async () => {
    const model = replyWith("x");
    const h = agentHarness(model);
    const first = await h.inbound("m1");
    await handoffToHuman(h.db, { conversationId: first.conversationId, reason: "OTHER", summary: { headline: "x" }, actor: { type: "AI" } });
    await h.inbound("m2", "oi?");
    await claimHandoff(h.db, { conversationId: first.conversationId, by: "atendente-1" });
    for (const id of ["m3", "m4", "m5"]) {
      const message = await h.inbound(id, "alguém?");
      const result = await runAgentShadow(h.live, { conversationId: first.conversationId, triggerMessageId: message.messageId, now: NOW });
      assert.equal(result.outcome, "SKIPPED_NOT_BOT");
    }
    assert.equal(model.calls.length, 0);
    assert.equal(h.runs.runs.length, 0);
    assert.equal(h.db.messages.filter((m) => m.sender === "CUSTOMER").length, 5);
    assert.equal(h.db.conversations[0].mode, "HUMAN");
  });

  it("se a equipe assume ENQUANTO o modelo gera, o rascunho é descartado e registrado como tal", async () => {
    let conversationId = "";
    const holder: { h?: ReturnType<typeof agentHarness> } = {};
    const model = new ScriptedModel(async () => {
      await handoffToHuman(holder.h!.db, { conversationId, reason: "CUSTOMER_REQUEST", summary: { headline: "x" }, actor: STAFF });
      return { text: "Resposta atrasada", toolCalls: [] };
    });
    holder.h = agentHarness(model);
    const first = await holder.h.inbound("m1");
    conversationId = first.conversationId;

    const result = await runAgentShadow(holder.h.live, { conversationId, triggerMessageId: first.messageId, now: NOW });

    assert.equal(result.outcome, "DISCARDED_MODE_CHANGED");
    assert.equal(holder.h.runs.runs[0].candidateText, null);
  });

  it("depois de FINISHED o cliente volta: reabre (Fase 1) e o agente sabe que é pós-atendimento", async () => {
    const model = replyWith("Que bom te ver de novo! 💛");
    const h = agentHarness(model);
    const first = await h.inbound("m1");
    await handoffToHuman(h.db, { conversationId: first.conversationId, reason: "OTHER", summary: { headline: "x" }, actor: STAFF });
    await finishConversation(h.db, { conversationId: first.conversationId, actor: STAFF });
    const back = await h.inbound("m9", "Oi, voltei!");
    assert.equal(back.reopened, true);

    const result = await runAgentShadow(h.live, { conversationId: first.conversationId, triggerMessageId: back.messageId, now: NOW });
    assert.equal(result.outcome, "DRAFT_SAVED");
    assert.equal(h.runs.runs.at(-1)?.agentStatus, "finalizado");
  });
});

describe("idempotência das execuções", () => {
  it("a mesma mensagem processada duas vezes: um AgentRun e uma chamada ao modelo", async () => {
    const model = replyWith("Olá! 💛");
    const h = agentHarness(model);
    const first = await h.inbound("m1", "Oi");

    const a = await runAgentShadow(h.live, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: NOW });
    const b = await runAgentShadow(h.live, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: NOW });

    assert.equal(a.outcome, "DRAFT_SAVED");
    assert.equal(b.outcome, "DUPLICATE");
    assert.equal(b.runId, a.runId);
    assert.equal(model.calls.length, 1);
    assert.equal(h.runs.runs.length, 1);
  });

  it("execuções simultâneas da mesma mensagem geram um único AgentRun", async () => {
    const model = replyWith("Olá! 💛");
    const h = agentHarness(model);
    const first = await h.inbound("m1", "Oi");
    const results = await Promise.all(
      [1, 2, 3].map(() => runAgentShadow(h.live, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: NOW })),
    );
    assert.equal(results.filter((r) => r.outcome === "DRAFT_SAVED").length, 1);
    assert.equal(model.calls.length, 1);
    assert.equal(h.runs.runs.length, 1);
  });

  it("reentrega do webhook (mesmo id externo) não gera nova execução", async () => {
    const model = replyWith("Olá! 💛");
    const h = agentHarness(model);
    const input = { unitId: h.unit.id, phone: "11987654321", externalMessageId: "dup-1", content: "Oi" };
    const a = await handleInboundShadow({ conversations: h.db, agent: h.live }, input, NOW);
    const b = await handleInboundShadow({ conversations: h.db, agent: h.live }, input, NOW);
    assert.equal(a.agent.outcome, "DRAFT_SAVED");
    assert.equal(b.inbound.duplicate, true);
    assert.equal(b.agent.outcome, "DUPLICATE");
    assert.equal(model.calls.length, 1);
    assert.equal(h.runs.runs.length, 1);
  });

  it("mensagens em sequência: cada execução usa o contexto até a sua mensagem", async () => {
    const model = replyWith("Respondo tudo junto. 💛");
    const h = agentHarness(model);
    const a = await h.inbound("m1", "Oi");
    const b = await h.inbound("m2", "Quero dread até a cintura");
    const first = await runAgentShadow(h.live, { conversationId: a.conversationId, triggerMessageId: a.messageId, now: NOW });
    const second = await runAgentShadow(h.live, { conversationId: a.conversationId, triggerMessageId: b.messageId, now: NOW });
    // O contexto de m1 é lido até m1 (ela É a última naquele recorte): responde.
    assert.equal(first.outcome, "DRAFT_SAVED");
    assert.equal(second.outcome, "DRAFT_SAVED");
    assert.deepEqual(
      (h.runs.runs[1].contextSnapshot as { messageIds: string[] }).messageIds,
      [a.messageId, b.messageId],
    );
  });
});

describe("guardrails e ferramentas no AgentRun", () => {
  it("rascunho com preço inventado é bloqueado, trocado pelo fallback e registra violações e handoff proposto", async () => {
    const model = replyWith("O valor fica R$ 400 e seu horário está confirmado para terça.");
    const h = agentHarness(model);
    const first = await h.inbound("m1", "Quanto custa?");
    const result = await runAgentShadow(h.live, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: NOW });

    assert.equal(result.outcome, "DRAFT_BLOCKED");
    const run = h.runs.runs[0];
    assert.equal(run.guardrailOk, false);
    assert.doesNotMatch(run.candidateText ?? "", /400|confirmado/);
    assert.match(run.candidateText ?? "", /confirmar com a equipe/);
    assert.match(run.blockedOriginalText ?? "", /R\$ 400/);
    const codes = (run.violations ?? []).map((v) => v.code);
    assert.ok(codes.includes("unauthorized_price") && codes.includes("booking_claim"));
    assert.equal(run.proposedHandoff?.reason, "AI_UNCERTAIN");
    assert.equal(h.db.handoffs.length, 0);
  });

  it("ferramentas proibidas e argumentos ruins são rejeitados e registrados; nada executado", async () => {
    const model = replyWith("Vou chamar a equipe. 💛", [
      { name: "request_handoff", arguments: { reason: "QUOTE_REQUEST", summary: { headline: "Quer orçamento" } } },
      { name: "confirm_payment", arguments: { bookingId: "b1" } },
      { name: "extend_payment_deadline", arguments: {} },
      { name: "request_handoff", arguments: { reason: "INVENTADO", summary: {} } },
    ]);
    const h = agentHarness(model);
    const first = await h.inbound("m1", "Quero orçamento");
    await runAgentShadow(h.live, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: NOW });

    const run = h.runs.runs[0];
    assert.deepEqual(
      (run.rejectedToolCalls ?? []).map((c) => `${c.name}:${c.reason}`),
      ["confirm_payment:unknown_tool", "extend_payment_deadline:unknown_tool", "request_handoff:invalid_arguments"],
    );
    assert.equal(h.db.handoffs.length, 0);
    assert.equal(h.db.conversations[0].mode, "BOT");
  });
});
