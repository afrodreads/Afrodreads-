import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MemoryConversations } from "../conversations/memoryRepo";
import { finishConversation, handoffToHuman } from "../conversations/conversation";
import { receiveInboundMessage } from "../conversations/message";
import { NotShadowModeError } from "./config";
import { runAgentShadow, type ShadowRunDeps } from "./orchestrator";
import {
  birthdayPromotion,
  fixedPromptSource,
  MemoryContextReader,
  MemoryShadowSink,
  ScriptedModel,
  replyWith,
  SECRET_ADDRESS,
  SECRET_MAP,
} from "./testSupport";

const NOW = new Date("2026-10-01T15:30:00-03:00");
const STAFF = { type: "HUMAN", ref: "atendente-1" } as const;

async function setup(model: ScriptedModel) {
  const db = new MemoryConversations();
  const unit = db.addUnit({ slug: "principal" });
  const reader = new MemoryContextReader(db, unit.id);
  const sink = new MemoryShadowSink();
  const deps: ShadowRunDeps = {
    config: { mode: "shadow" },
    store: db,
    reader,
    model,
    promptSource: fixedPromptSource(),
    sink,
  };
  const inbound = (id: string, content = "Quanto custa?") =>
    receiveInboundMessage(db, { unitId: unit.id, phone: "11987654321", customerName: "Maria", externalMessageId: id, content }, NOW);
  return { db, unit, reader, sink, deps, inbound };
}

describe("modo sombra: nada chega ao cliente", () => {
  it("gera um rascunho, registra e NÃO cria mensagem nem muda a conversa", async () => {
    const model = replyWith("Me manda uma foto do cabelo que eu organizo para a equipe avaliar. 💛");
    const { db, sink, deps, inbound } = await setup(model);
    const first = await inbound("m1");
    const messagesBefore = db.messages.length;

    const result = await runAgentShadow(deps, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: NOW });

    assert.equal(result.outcome, "draft_saved");
    assert.match(result.draft?.text ?? "", /foto do cabelo/);
    assert.equal(model.calls.length, 1);
    assert.equal(db.messages.length, messagesBefore); // nenhuma Message criada
    assert.equal(db.messages.filter((m) => m.direction === "OUTBOUND").length, 0);
    assert.equal(db.conversations[0].mode, "BOT");
    assert.equal(db.handoffs.length, 0);
    assert.equal(db.transitions.length, 0);
    assert.equal(sink.records.length, 1);
    assert.equal(sink.records[0].outcome, "draft_saved");
  });

  it("recusa qualquer modo diferente de 'shadow' sem chamar o modelo", async () => {
    const model = replyWith("oi");
    const { deps, inbound } = await setup(model);
    const first = await inbound("m1");
    await assert.rejects(
      () => runAgentShadow({ ...deps, config: { mode: "live" } }, { conversationId: first.conversationId, triggerMessageId: "m1" }),
      NotShadowModeError,
    );
    assert.equal(model.calls.length, 0);
  });

  it("o prompt enviado ao modelo nunca contém endereço, mapa nem promoção vencida", async () => {
    const model = replyWith("Claro!");
    const { db, reader, deps, inbound } = await setup(model);
    reader.promotions = [birthdayPromotion];
    const first = await inbound("m1");
    await runAgentShadow(deps, { conversationId: first.conversationId, triggerMessageId: "m1", now: new Date("2026-11-05T10:00:00-03:00") });

    const sent = JSON.stringify(model.calls[0]);
    assert.equal(sent.includes(SECRET_ADDRESS), false);
    assert.equal(sent.includes(SECRET_MAP), false);
    assert.equal(sent.includes("R$ 750"), false);
    assert.match(model.calls[0].system, /DADOS DO SISTEMA/);
    assert.equal(db.messages.length, 1);
  });
});

describe("HUMAN bloqueia a IA", () => {
  async function inHuman() {
    const model = replyWith("Não deveria ser chamado");
    const ctx = await setup(model);
    const first = await ctx.inbound("m1");
    await handoffToHuman(ctx.db, {
      conversationId: first.conversationId,
      reason: "QUOTE_REQUEST",
      summary: { headline: "Orçamento" },
      actor: { type: "AI" },
    });
    return { ...ctx, model, conversationId: first.conversationId };
  }

  it("com a conversa em HUMAN o modelo nem é chamado", async () => {
    const { deps, model, conversationId, inbound } = await inHuman();
    const next = await inbound("m2", "E aí, tem novidade?");

    const result = await runAgentShadow(deps, { conversationId, triggerMessageId: next.messageId, now: NOW });

    assert.equal(result.outcome, "skipped_not_bot");
    assert.equal(result.draft, null);
    assert.equal(model.calls.length, 0);
  });

  it("várias mensagens do cliente em HUMAN: todas salvas, nenhuma resposta, continua HUMAN", async () => {
    const { db, deps, model, conversationId, inbound, sink } = await inHuman();
    for (let i = 2; i <= 5; i++) {
      const message = await inbound(`m${i}`, `mensagem ${i}`);
      assert.equal(message.aiMayRespond, false);
      assert.equal(message.reopened, false);
      const result = await runAgentShadow(deps, { conversationId, triggerMessageId: message.messageId, now: NOW });
      assert.equal(result.outcome, "skipped_not_bot");
    }
    assert.equal(model.calls.length, 0);
    assert.equal(db.messages.filter((m) => m.sender === "CUSTOMER").length, 5);
    assert.equal(db.conversations[0].mode, "HUMAN"); // nunca voltou para BOT sozinho
    assert.equal(sink.records.every((r) => r.outcome === "skipped_not_bot"), true);
  });

  it("FINISHED também silencia; quando o cliente volta a conversa reabre (Fase 1) e o agente sabe que é pós-atendimento", async () => {
    const { db, deps, model, conversationId, inbound } = await inHuman();
    await finishConversation(db, { conversationId, actor: STAFF });
    const back = await inbound("m9", "Oi, voltei!");
    assert.equal(back.reopened, true);

    const result = await runAgentShadow(deps, { conversationId, triggerMessageId: back.messageId, now: NOW });

    assert.equal(result.outcome, "draft_saved");
    assert.equal(result.draft?.context.status, "finalizado");
    assert.equal(model.calls.length, 1);
  });

  it("se a equipe assume ENQUANTO o modelo gera, o rascunho é descartado", async () => {
    const db = new MemoryConversations();
    const unit = db.addUnit({ slug: "principal" });
    const sink = new MemoryShadowSink();
    const model = new ScriptedModel(async () => {
      await handoffToHuman(db, {
        conversationId: db.conversations[0].id,
        reason: "CUSTOMER_REQUEST",
        summary: { headline: "Pediu uma pessoa" },
        actor: STAFF,
      });
      return { text: "Resposta atrasada", toolCalls: [] };
    });
    const deps: ShadowRunDeps = {
      config: { mode: "shadow" },
      store: db,
      reader: new MemoryContextReader(db, unit.id),
      model,
      promptSource: fixedPromptSource(),
      sink,
    };
    const first = await receiveInboundMessage(db, { unitId: unit.id, phone: "11987654321", externalMessageId: "m1", content: "oi" }, NOW);

    const result = await runAgentShadow(deps, { conversationId: first.conversationId, triggerMessageId: "m1", now: NOW });

    assert.equal(result.outcome, "discarded_mode_changed");
    assert.equal(result.draft, null);
    assert.equal(sink.records[0].mode, "HUMAN");
  });
});

describe("idempotência", () => {
  it("a mesma mensagem-gatilho processada duas vezes chama o modelo uma vez", async () => {
    const model = replyWith("Olá! 💛");
    const { deps, inbound, sink } = await setup(model);
    const first = await inbound("m1", "Oi");

    const a = await runAgentShadow(deps, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: NOW });
    const b = await runAgentShadow(deps, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: NOW });

    assert.equal(a.outcome, "draft_saved");
    assert.equal(b.outcome, "duplicate");
    assert.equal(b.duplicate, true);
    assert.equal(model.calls.length, 1);
    assert.equal(sink.records.length, 1);
  });

  it("execuções simultâneas da mesma mensagem geram um único rascunho", async () => {
    const model = replyWith("Olá! 💛");
    const { deps, inbound, sink } = await setup(model);
    const first = await inbound("m1", "Oi");

    const results = await Promise.all(
      [1, 2, 3].map(() => runAgentShadow(deps, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: NOW })),
    );

    assert.equal(results.filter((r) => !r.duplicate).length, 1);
    assert.equal(model.calls.length, 1);
    assert.equal(sink.records.length, 1);
  });

  it("entrega duplicada do webhook (mesmo id externo) não gera segunda execução", async () => {
    const model = replyWith("Olá! 💛");
    const { deps, inbound } = await setup(model);
    const first = await inbound("m1", "Oi");
    const again = await inbound("m1", "Oi");
    assert.equal(again.duplicate, true);
    assert.equal(again.messageId, first.messageId);

    await runAgentShadow(deps, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: NOW });
    await runAgentShadow(deps, { conversationId: again.conversationId, triggerMessageId: again.messageId, now: NOW });
    assert.equal(model.calls.length, 1);
  });
});

describe("guardrails no orquestrador", () => {
  it("rascunho com preço inventado é bloqueado, trocado pelo fallback e vira proposta de handoff", async () => {
    const model = replyWith("O valor fica R$ 400 e seu horário está confirmado para terça.");
    const { db, deps, inbound } = await setup(model);
    const first = await inbound("m1", "Quanto custa?");

    const result = await runAgentShadow(deps, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: NOW });

    assert.equal(result.outcome, "draft_blocked");
    assert.doesNotMatch(result.draft?.text ?? "", /400|confirmado/);
    assert.match(result.draft?.text ?? "", /confirmar com a equipe/);
    assert.match(result.draft?.blockedOriginalText ?? "", /R\$ 400/);
    const codes = result.draft?.violations.map((v) => v.code) ?? [];
    assert.ok(codes.includes("unauthorized_price") && codes.includes("booking_claim"));
    const handoff = result.draft?.proposedActions.find((a) => a.tool === "request_handoff");
    assert.ok(handoff && handoff.tool === "request_handoff" && handoff.reason === "AI_UNCERTAIN");
    assert.equal(db.handoffs.length, 0); // proposta, não execução
    assert.equal(db.messages.filter((m) => m.direction === "OUTBOUND").length, 0);
  });

  it("endereço e mapa inventados pelo modelo são barrados", async () => {
    const model = replyWith(`Fica na ${SECRET_ADDRESS}. Mapa: ${SECRET_MAP}`);
    const { deps, inbound } = await setup(model);
    const first = await inbound("m1", "Onde fica?");
    const result = await runAgentShadow(deps, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: NOW });
    assert.equal(result.outcome, "draft_blocked");
    assert.equal((result.draft?.text ?? "").includes(SECRET_ADDRESS), false);
  });

  it("ferramentas: handoff válido é apenas PROPOSTO; ferramentas proibidas e argumentos ruins são rejeitados", async () => {
    const model = replyWith("Vou chamar a equipe. 💛", [
      { name: "request_handoff", arguments: { reason: "QUOTE_REQUEST", summary: { headline: "Quer orçamento" } } },
      { name: "update_lead_data", arguments: { intent: "ORCAMENTO", temperature: "QUENTE" } },
      { name: "confirm_payment", arguments: { bookingId: "b1" } },
      { name: "extend_payment_deadline", arguments: {} },
      { name: "request_handoff", arguments: { reason: "INVENTADO", summary: {} } },
    ]);
    const { db, deps, inbound } = await setup(model);
    const first = await inbound("m1", "Quero orçamento");

    const result = await runAgentShadow(deps, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: NOW });

    assert.equal(result.outcome, "draft_saved");
    assert.deepEqual(result.draft?.proposedActions.map((a) => a.tool), ["request_handoff", "update_lead_data"]);
    assert.deepEqual(
      result.draft?.rejectedToolCalls.map((c) => `${c.name}:${c.reason}`),
      ["confirm_payment:unknown_tool", "extend_payment_deadline:unknown_tool", "request_handoff:invalid_arguments"],
    );
    // Nada foi executado.
    assert.equal(db.handoffs.length, 0);
    assert.equal(db.conversations[0].mode, "BOT");
  });
});

describe("casos de borda do orquestrador", () => {
  it("se a última mensagem já é da equipe/IA, não há o que responder", async () => {
    const model = replyWith("x");
    const { db, deps, inbound } = await setup(model);
    const first = await inbound("m1");
    db.messages.push({
      id: "out-1",
      conversationId: first.conversationId,
      direction: "OUTBOUND",
      sender: "AI",
      senderRef: null,
      content: "Olá!",
      externalId: null,
      metadata: null,
      createdAt: NOW,
    });
    const result = await runAgentShadow(deps, { conversationId: first.conversationId, triggerMessageId: "m1", now: NOW });
    assert.equal(result.outcome, "nothing_to_answer");
    assert.equal(model.calls.length, 0);
  });

  it("erro do modelo vira 'model_error' e nada é enviado", async () => {
    const model = new ScriptedModel(() => {
      throw new Error("falha simulada");
    });
    const { db, deps, inbound } = await setup(model);
    const first = await inbound("m1");
    const result = await runAgentShadow(deps, { conversationId: first.conversationId, triggerMessageId: "m1", now: NOW });
    assert.equal(result.outcome, "model_error");
    assert.equal(db.messages.length, 1);
  });

  it("conversa sem contexto disponível", async () => {
    const model = replyWith("x");
    const { deps } = await setup(model);
    await assert.rejects(() => runAgentShadow(deps, { conversationId: "nao-existe", triggerMessageId: "m" }));
  });
});
