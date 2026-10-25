import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyTransition,
  checkAiMayRespond,
  claimHandoff,
  finishConversation,
  findOrCreateConversation,
  handoffToHuman,
  reopenConversation,
} from "./conversation";
import { findOrCreateCustomer } from "./customer";
import {
  ConversationNotFoundError,
  HandoffNotClaimableError,
  InvalidInputError,
  InvalidTransitionError,
  TransitionConflictError,
} from "./errors";
import { formatHandoffSummary, parseHandoffSummary } from "./handoff";
import { newConversation, NOW, setup, validSummary } from "./testSupport";

const AI = { type: "AI" } as const;
const THAY = { type: "HUMAN", ref: "atendente-1" } as const;
const SYSTEM = { type: "SYSTEM" } as const;

describe("criação de conversa", () => {
  it("nasce em BOT, ligada ao cliente e à unidade, sem responsável", async () => {
    const { db, unit } = setup();
    const { customer } = await findOrCreateCustomer(db, { unitId: unit.id, phone: "11987654321" });
    const { conversation, created } = await findOrCreateConversation(db, {
      unitId: unit.id,
      customer,
      externalId: "contato-123",
      now: NOW,
    });

    assert.equal(created, true);
    assert.equal(conversation.mode, "BOT");
    assert.equal(conversation.customerId, customer.id);
    assert.equal(conversation.unitId, unit.id);
    assert.equal(conversation.channel, "WHATSAPP");
    assert.equal(conversation.externalId, "contato-123");
    assert.equal(conversation.assignedTo, null);
  });

  it("o mesmo identificador externo reaproveita a conversa", async () => {
    const { db, unit } = setup();
    const { customer } = await findOrCreateCustomer(db, { unitId: unit.id, phone: "11987654321" });
    const first = await findOrCreateConversation(db, { unitId: unit.id, customer, externalId: "abc" });
    const second = await findOrCreateConversation(db, { unitId: unit.id, customer, externalId: "abc" });

    assert.equal(second.created, false);
    assert.equal(second.conversation.id, first.conversation.id);
    assert.equal(db.conversations.length, 1);
  });

  it("sem identificador externo reaproveita a conversa mais recente do cliente", async () => {
    const { db, unit } = setup();
    const { customer } = await findOrCreateCustomer(db, { unitId: unit.id, phone: "11987654321" });
    const first = await findOrCreateConversation(db, { unitId: unit.id, customer });
    const second = await findOrCreateConversation(db, { unitId: unit.id, customer });
    assert.equal(second.conversation.id, first.conversation.id);
  });

  it("criações simultâneas com o mesmo identificador externo geram uma conversa só", async () => {
    const { db, unit } = setup();
    const { customer } = await findOrCreateCustomer(db, { unitId: unit.id, phone: "11987654321" });
    const results = await Promise.all([
      findOrCreateConversation(db, { unitId: unit.id, customer, externalId: "abc" }),
      findOrCreateConversation(db, { unitId: unit.id, customer, externalId: "abc" }),
    ]);
    assert.equal(db.conversations.length, 1);
    assert.equal(new Set(results.map((r) => r.conversation.id)).size, 1);
  });

  it("isolamento: o mesmo identificador externo em outra unidade é outra conversa", async () => {
    const { db, unit } = setup();
    const other = db.addUnit({ slug: "outra" });
    const { customer: a } = await findOrCreateCustomer(db, { unitId: unit.id, phone: "11987654321" });
    const { customer: b } = await findOrCreateCustomer(db, { unitId: other.id, phone: "11987654321" });

    const first = await findOrCreateConversation(db, { unitId: unit.id, customer: a, externalId: "abc" });
    const second = await findOrCreateConversation(db, { unitId: other.id, customer: b, externalId: "abc" });

    assert.notEqual(first.conversation.id, second.conversation.id);
    assert.equal(second.created, true);
  });

  it("um cliente pode ter várias conversas (ids externos diferentes)", async () => {
    const { db, unit } = setup();
    const { customer } = await findOrCreateCustomer(db, { unitId: unit.id, phone: "11987654321" });
    await findOrCreateConversation(db, { unitId: unit.id, customer, externalId: "a" });
    await findOrCreateConversation(db, { unitId: unit.id, customer, externalId: "b" });
    assert.equal(db.conversations.filter((c) => c.customerId === customer.id).length, 2);
  });
});

describe("BOT → HUMAN (passagem para a equipe)", () => {
  it("troca o modo e registra o Handoff com resumo, motivo e autor", async () => {
    const { db, unit } = setup();
    const conversation = await newConversation(db, unit.id);

    const result = await handoffToHuman(db, {
      conversationId: conversation.id,
      reason: "QUOTE_REQUEST",
      summary: validSummary,
      actor: AI,
      now: NOW,
    });

    assert.equal(result.conversation.mode, "HUMAN");
    assert.equal(db.conversations[0].mode, "HUMAN");
    assert.equal(db.handoffs.length, 1);
    const handoff = db.handoffs[0];
    assert.equal(handoff.id, result.handoffId);
    assert.equal(handoff.conversationId, conversation.id);
    assert.equal(handoff.reason, "QUOTE_REQUEST");
    assert.equal(handoff.status, "OPEN");
    assert.equal(handoff.requestedBy, "AI");
    assert.equal(handoff.claimedBy, null);
    assert.deepEqual(handoff.summary, validSummary);
  });

  it("uma pessoa que passa a conversa para HUMAN já a assume", async () => {
    const { db, unit } = setup();
    const conversation = await newConversation(db, unit.id);

    await handoffToHuman(db, {
      conversationId: conversation.id,
      reason: "HUMAN_TAKEOVER",
      summary: { headline: "Atendimento assumido manualmente" },
      actor: THAY,
      now: NOW,
    });

    assert.equal(db.handoffs[0].status, "CLAIMED");
    assert.equal(db.handoffs[0].claimedBy, "atendente-1");
    assert.equal(db.conversations[0].assignedTo, "atendente-1");
  });

  it("registra a mudança de forma auditável", async () => {
    const { db, unit } = setup();
    const conversation = await newConversation(db, unit.id);
    const result = await handoffToHuman(db, {
      conversationId: conversation.id,
      reason: "PAYMENT",
      summary: validSummary,
      actor: AI,
      now: NOW,
    });

    assert.equal(db.transitions.length, 1);
    const audit = db.transitions[0];
    assert.equal(audit.fromMode, "BOT");
    assert.equal(audit.toMode, "HUMAN");
    assert.equal(audit.actor, "AI");
    assert.equal(audit.reason, "PAYMENT");
    assert.equal(audit.handoffId, result.handoffId);
    assert.equal(audit.createdAt, NOW);
  });

  it("recusa resumo inválido e não muda nada (nem modo, nem handoff, nem auditoria)", async () => {
    const { db, unit } = setup();
    const conversation = await newConversation(db, unit.id);

    for (const summary of [{}, { headline: "" }, { headline: "x".repeat(201) }, { headline: "ok", cpf: "123" }, null]) {
      await assert.rejects(
        () =>
          handoffToHuman(db, { conversationId: conversation.id, reason: "OTHER", summary, actor: AI, now: NOW }),
        InvalidInputError,
      );
    }
    assert.equal(db.conversations[0].mode, "BOT");
    assert.equal(db.handoffs.length, 0);
    assert.equal(db.transitions.length, 0);
  });

  it("recusa motivo desconhecido", async () => {
    const { db, unit } = setup();
    const conversation = await newConversation(db, unit.id);
    await assert.rejects(
      () =>
        handoffToHuman(db, {
          conversationId: conversation.id,
          reason: "INVENTADO" as never,
          summary: validSummary,
          actor: AI,
        }),
      InvalidInputError,
    );
    assert.equal(db.conversations[0].mode, "BOT");
  });

  it("BOT → HUMAN sem handoff é recusado pela camada de transição", async () => {
    const { db, unit } = setup();
    const conversation = await newConversation(db, unit.id);
    await assert.rejects(
      () => db.transaction((repo) => applyTransition(repo, { conversationId: conversation.id, to: "HUMAN", actor: AI, now: NOW })),
      InvalidTransitionError,
    );
    assert.equal(db.conversations[0].mode, "BOT");
    assert.equal(db.handoffs.length, 0);
  });

  it("conversa inexistente", async () => {
    const { db } = setup();
    await assert.rejects(
      () => handoffToHuman(db, { conversationId: "nope", reason: "OTHER", summary: validSummary, actor: AI }),
      ConversationNotFoundError,
    );
  });

  it("uma pessoa sem identificação não pode agir (auditoria precisa saber quem)", async () => {
    const { db, unit } = setup();
    const conversation = await newConversation(db, unit.id);
    await assert.rejects(
      () =>
        handoffToHuman(db, {
          conversationId: conversation.id,
          reason: "OTHER",
          summary: validSummary,
          actor: { type: "HUMAN" },
        }),
      InvalidInputError,
    );
  });

  it("duas passagens simultâneas: só uma vence, com um único handoff", async () => {
    const { db, unit } = setup();
    const conversation = await newConversation(db, unit.id);

    const attempt = () =>
      handoffToHuman(db, { conversationId: conversation.id, reason: "CUSTOMER_REQUEST", summary: validSummary, actor: AI, now: NOW });
    const results = await Promise.allSettled([attempt(), attempt()]);

    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const failure = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    assert.ok(failure.reason instanceof TransitionConflictError);
    assert.equal(db.handoffs.length, 1);
    assert.equal(db.transitions.length, 1);
  });

  it("passar de novo quando já está em HUMAN é recusado", async () => {
    const { db, unit } = setup();
    const conversation = await newConversation(db, unit.id);
    await handoffToHuman(db, { conversationId: conversation.id, reason: "OTHER", summary: validSummary, actor: AI });
    await assert.rejects(
      () => handoffToHuman(db, { conversationId: conversation.id, reason: "OTHER", summary: validSummary, actor: AI }),
      InvalidTransitionError,
    );
    assert.equal(db.handoffs.length, 1);
  });
});

describe("HUMAN bloqueia respostas automáticas", () => {
  it("checkAiMayRespond: só permite em BOT", async () => {
    const { db, unit } = setup();
    const conversation = await newConversation(db, unit.id);

    assert.deepEqual(await checkAiMayRespond(db, conversation.id), { allowed: true, mode: "BOT" });
    await handoffToHuman(db, { conversationId: conversation.id, reason: "OTHER", summary: validSummary, actor: AI });
    assert.deepEqual(await checkAiMayRespond(db, conversation.id), { allowed: false, mode: "HUMAN" });
    await finishConversation(db, { conversationId: conversation.id, actor: THAY });
    assert.deepEqual(await checkAiMayRespond(db, conversation.id), { allowed: false, mode: "FINISHED" });
    await reopenConversation(db, { conversationId: conversation.id, actor: SYSTEM });
    assert.deepEqual(await checkAiMayRespond(db, conversation.id), { allowed: true, mode: "BOT" });
  });
});

describe("HUMAN → FINISHED → BOT", () => {
  async function inHuman() {
    const { db, unit } = setup();
    const conversation = await newConversation(db, unit.id);
    await handoffToHuman(db, { conversationId: conversation.id, reason: "SCHEDULING", summary: validSummary, actor: AI, now: NOW });
    return { db, conversation };
  }

  it("encerrar resolve o encaminhamento em aberto e limpa o responsável", async () => {
    const { db, conversation } = await inHuman();
    await claimHandoff(db, { conversationId: conversation.id, by: "atendente-1", now: NOW });

    const later = new Date(NOW.getTime() + 60_000);
    await finishConversation(db, { conversationId: conversation.id, actor: THAY, now: later });

    assert.equal(db.conversations[0].mode, "FINISHED");
    assert.equal(db.conversations[0].assignedTo, null);
    assert.equal(db.handoffs[0].status, "RESOLVED");
    assert.equal(db.handoffs[0].resolvedAt, later);
  });

  it("a IA não pode encerrar uma conversa que está com a equipe", async () => {
    const { db, conversation } = await inHuman();
    await assert.rejects(() => finishConversation(db, { conversationId: conversation.id, actor: AI }), InvalidTransitionError);
    assert.equal(db.conversations[0].mode, "HUMAN");
  });

  it("FINISHED → BOT permite a retomada futura da IA", async () => {
    const { db, conversation } = await inHuman();
    await finishConversation(db, { conversationId: conversation.id, actor: THAY });
    await reopenConversation(db, { conversationId: conversation.id, actor: SYSTEM, reason: "cliente voltou" });

    assert.equal(db.conversations[0].mode, "BOT");
    const last = db.transitions[db.transitions.length - 1];
    assert.equal(last.fromMode, "FINISHED");
    assert.equal(last.toMode, "BOT");
    assert.equal(last.reason, "cliente voltou");
  });

  it("a IA não se reativa sozinha", async () => {
    const { db, conversation } = await inHuman();
    await finishConversation(db, { conversationId: conversation.id, actor: THAY });
    await assert.rejects(() => reopenConversation(db, { conversationId: conversation.id, actor: AI }), InvalidTransitionError);
    assert.equal(db.conversations[0].mode, "FINISHED");
  });

  it("o ciclo completo deixa uma trilha de auditoria na ordem certa", async () => {
    const { db, conversation } = await inHuman();
    await finishConversation(db, { conversationId: conversation.id, actor: THAY });
    await reopenConversation(db, { conversationId: conversation.id, actor: SYSTEM });

    assert.deepEqual(
      db.transitions.map((t) => `${t.fromMode}>${t.toMode}:${t.actor}`),
      ["BOT>HUMAN:AI", "HUMAN>FINISHED:HUMAN", "FINISHED>BOT:SYSTEM"],
    );
  });

  it("transições arbitrárias são recusadas e nada é gravado", async () => {
    const { db, unit } = setup();
    const conversation = await newConversation(db, unit.id);

    // BOT → FINISHED, BOT → BOT
    for (const to of ["FINISHED", "BOT"] as const) {
      await assert.rejects(
        () => db.transaction((repo) => applyTransition(repo, { conversationId: conversation.id, to, actor: SYSTEM, now: NOW })),
        InvalidTransitionError,
      );
    }
    assert.equal(db.conversations[0].mode, "BOT");
    assert.equal(db.transitions.length, 0);
  });
});

describe("claimHandoff", () => {
  it("a equipe assume o encaminhamento em aberto e vira a responsável", async () => {
    const { db, unit } = setup();
    const conversation = await newConversation(db, unit.id);
    await handoffToHuman(db, { conversationId: conversation.id, reason: "OTHER", summary: validSummary, actor: AI });

    await claimHandoff(db, { conversationId: conversation.id, by: "atendente-2", now: NOW });

    assert.equal(db.handoffs[0].status, "CLAIMED");
    assert.equal(db.handoffs[0].claimedBy, "atendente-2");
    assert.equal(db.handoffs[0].claimedAt, NOW);
    assert.equal(db.conversations[0].assignedTo, "atendente-2");
  });

  it("não assume duas vezes nem fora do modo HUMAN", async () => {
    const { db, unit } = setup();
    const conversation = await newConversation(db, unit.id);

    await assert.rejects(() => claimHandoff(db, { conversationId: conversation.id, by: "x" }), HandoffNotClaimableError);

    await handoffToHuman(db, { conversationId: conversation.id, reason: "OTHER", summary: validSummary, actor: AI });
    await claimHandoff(db, { conversationId: conversation.id, by: "primeira" });
    await assert.rejects(() => claimHandoff(db, { conversationId: conversation.id, by: "segunda" }), HandoffNotClaimableError);
    assert.equal(db.handoffs[0].claimedBy, "primeira");
  });

  it("duas pessoas assumindo ao mesmo tempo: só uma fica", async () => {
    const { db, unit } = setup();
    const conversation = await newConversation(db, unit.id);
    await handoffToHuman(db, { conversationId: conversation.id, reason: "OTHER", summary: validSummary, actor: AI });

    const results = await Promise.allSettled([
      claimHandoff(db, { conversationId: conversation.id, by: "a" }),
      claimHandoff(db, { conversationId: conversation.id, by: "b" }),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  });

  it("exige identificar quem assume", async () => {
    const { db, unit } = setup();
    const conversation = await newConversation(db, unit.id);
    await assert.rejects(() => claimHandoff(db, { conversationId: conversation.id, by: "  " }), InvalidInputError);
  });
});

describe("resumo do handoff", () => {
  it("aceita só os campos previstos e formata em texto legível", () => {
    const summary = parseHandoffSummary(validSummary);
    const text = formatHandoffSummary(summary);
    assert.match(text, /Quer orçamento de microlocs/);
    assert.match(text, /- metodo: microlocs/);
    assert.match(text, /Pendências:/);
  });

  it("rejeita campos extras (ex.: dados sensíveis) e excesso de dados", () => {
    assert.throws(() => parseHandoffSummary({ headline: "ok", senha: "123" }), InvalidInputError);
    const collected = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`k${i}`, "v"]));
    assert.throws(() => parseHandoffSummary({ headline: "ok", collected }), InvalidInputError);
  });
});
