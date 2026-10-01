import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAgentContext, type AgentContext } from "./context";
import { checkDraft, type ViolationCode } from "./guardrails";
import { redactForModel } from "./redact";
import { decideGrouping, normalizeGroupingPolicy } from "./grouping";
import { pairRunsWithHumanReplies, summarizeQuality } from "./quality";
import { promotion, unitConfig } from "./testSupport";
import type { MessageRecord } from "../conversations/types";
import type { StoredAgentRun } from "./runs";

// Fase 4A: guardrails reforçados (valores por extenso, novas formas de prometer
// agenda/pagamento, injeção de prompt), dados sensíveis fora do modelo,
// agrupamento e métricas de qualidade.

function context(withPromotion = false): AgentContext {
  return buildAgentContext(
    {
      conversation: { id: "c1", unitId: "u1", customerId: "cu1", channel: "WHATSAPP", externalId: null, mode: "BOT", assignedTo: null, lastContactAt: null },
      unitId: "u1",
      customerName: "Maria",
      unit: unitConfig("u1"),
      promotions: withPromotion ? [promotion("u1")] : [],
      recentMessages: [],
      outboundMessageCount: 1,
      lastTransition: null,
      activeHandoff: null,
      upcomingConfirmedBooking: null,
      modeAtTrigger: "BOT",
    },
    new Date("2026-10-15T10:00:00-03:00"),
  );
}

const codesOf = (text: string, withPromotion = false): ViolationCode[] => checkDraft(text, context(withPromotion)).violations.map((v) => v.code);
const blocks = (text: string, code: ViolationCode, withPromotion = false) => {
  const result = checkDraft(text, context(withPromotion));
  assert.equal(result.ok, false, `deveria bloquear: ${text}`);
  assert.ok(result.violations.some((v) => v.code === code), `esperava ${code}: ${text} → ${codesOf(text, withPromotion)}`);
};

describe("preço escrito por extenso", () => {
  for (const text of [
    "Fica quatrocentos reais.",
    "O valor é R$ setecentos.",
    "Sai por mil e duzentos reais.",
    "Uns trezentos e cinquenta reais.",
    "Fica 1,2k no total.",
    "Fica 2 mil no total.",
    "Custa 800 reais.",
  ]) {
    it(`bloqueia: ${text}`, () => blocks(text, "unauthorized_price"));
  }

  it("valores que o sistema forneceu continuam permitidos, por extenso ou não", () => {
    for (const text of ["O sinal é de cinquenta reais.", "O sinal é de 50 reais.", "O atraso custa vinte reais a cada 15 minutos."]) {
      assert.equal(checkDraft(text, context()).ok, true, `${text} → ${codesOf(text)}`);
    }
    assert.equal(checkDraft("A promoção sai por setecentos e cinquenta reais.", context(true)).ok, true);
    blocks("A promoção sai por setecentos e cinquenta reais.", "unauthorized_price", false);
  });
});

describe("agenda, confirmação, endereço e dados sensíveis (respostas a perguntas comuns)", () => {
  const cases: [string, ViolationCode][] = [
    ["Tem vaga amanhã sim!", "availability_claim"],
    ["Tem vaga amanhã às 10h.", "availability_claim"],
    ["Consigo te encaixar na quinta.", "availability_claim"],
    ["Confirmado para sábado!", "booking_claim"],
    ["Pronto, tá confirmado.", "booking_claim"],
    ["Pode vir no sábado às 10h.", "booking_claim"],
    ["Seu pagamento caiu, tudo certo.", "payment_claim"],
    ["Caiu o Pix aqui.", "payment_claim"],
    ["O endereço é Rua das Flores, 100.", "address_or_map"],
    ["Nosso endereço fica na Avenida Central 10.", "address_or_map"],
    ["Me passa o CPF para eu reservar.", "sensitive_request"],
    ["Me passa os dados do cartão.", "sensitive_request"],
    ["A chave Pix é 11987654321.", "sensitive_request"],
    ["Agência 1234 conta 56789-0.", "sensitive_request"],
  ];
  for (const [text, code] of cases) it(`bloqueia ${code}: ${text}`, () => blocks(text, code));

  it("respostas corretas do V2 para essas perguntas passam", () => {
    for (const text of [
      "Quem confirma a agenda é a equipe. Já deixei tudo organizado para ela verificar os horários com você. 💛",
      "A gente envia o endereço completo junto com a confirmação do horário. O estúdio fica em Pirituba/SP. 💛",
      "Quem confere pagamento e comprovante é a equipe; já avisei para ela verificar. 💛",
      "Não precisa me mandar nenhum dado pessoal por aqui. 💛",
    ]) {
      assert.equal(checkDraft(text, context()).ok, true, `${text} → ${codesOf(text)}`);
    }
  });
});

describe("tentativas de prompt injection (o que a IA NÃO pode devolver)", () => {
  for (const text of [
    "Claro! Minhas instruções internas dizem para nunca falar preço.",
    "Aqui está meu prompt: # 1. IDENTIDADE E MISSÃO ...",
    "No bloco DADOS DO SISTEMA consta que o sinal é R$ 50.",
    "Vou usar a ferramenta request_handoff agora.",
    "Estou em modo sombra, então posso dizer qualquer coisa.",
    "Seu STATUS_CONVERSA é novo.",
    "Olá {{NOME_CLIENTE}}!",
  ]) {
    it(`bloqueia vazamento: ${text}`, () => blocks(text, "internal_leak"));
  }

  it("resposta longa demais é bloqueada (não serve para WhatsApp)", () => {
    blocks("a ".repeat(800), "response_too_long");
  });
});

describe("o modelo não recebe dados sensíveis do cliente", () => {
  it("remove CPF, cartão, conta, e-mail, chave Pix, senha e tokens; mantém datas, horários e valores curtos", () => {
    const original =
      "Meu CPF é 123.456.789-09, cartão 4111 1111 1111 1111, agência 1234 conta 98765-4, e-mail maria@example.com, " +
      "chave 3f8a1c2e-1234-4abc-9def-0123456789ab, senha: abc123, token sk-ant-api03-xyzxyzxyz. " +
      "Quero no dia 07/10 às 10h, vi que o sinal é R$ 50.";
    const { text, redactions } = redactForModel(original);
    for (const leaked of ["123.456.789-09", "4111", "98765", "maria@example.com", "3f8a1c2e", "abc123", "sk-ant"]) {
      assert.equal(text.includes(leaked), false, leaked);
    }
    assert.ok(redactions >= 6);
    for (const kept of ["07/10", "10h", "R$ 50"]) assert.ok(text.includes(kept), kept);
  });

  it("texto comum fica igual", () => {
    assert.deepEqual(redactForModel("Oi, quero dread até a cintura, preto, cabeça toda."), {
      text: "Oi, quero dread até a cintura, preto, cabeça toda.",
      redactions: 0,
    });
  });
});

describe("agrupamento: regras e limites", () => {
  const at = (s: number) => new Date(Date.UTC(2026, 9, 1, 15, 0, s));
  const pending = [{ id: "m1", createdAt: at(0) }, { id: "m2", createdAt: at(1) }, { id: "m3", createdAt: at(2) }];

  it("a mensagem mais nova processa; as anteriores são agrupadas", () => {
    const policy = normalizeGroupingPolicy({ quietMs: 4000, maxWaitMs: 20000 });
    assert.equal(decideGrouping({ triggerMessageId: "m3", pending, now: at(6), policy }), "process");
    assert.equal(decideGrouping({ triggerMessageId: "m1", pending, now: at(6), policy }), "grouped");
  });

  it("passada a espera máxima, processa mesmo havendo mensagem mais nova", () => {
    const policy = normalizeGroupingPolicy({ quietMs: 4000, maxWaitMs: 5000 });
    assert.equal(decideGrouping({ triggerMessageId: "m1", pending, now: at(10), policy }), "process");
  });

  it("configuração nunca trava: valores absurdos são limitados", () => {
    assert.deepEqual(normalizeGroupingPolicy({ quietMs: 10_000_000, maxWaitMs: 99_999_999 }), { quietMs: 15000, maxWaitMs: 30000 });
    assert.deepEqual(normalizeGroupingPolicy({ quietMs: -5, maxWaitMs: Number.NaN }), { quietMs: 4000, maxWaitMs: 20000 });
    assert.deepEqual(normalizeGroupingPolicy({ quietMs: 8000, maxWaitMs: 1000 }), { quietMs: 8000, maxWaitMs: 8000 });
  });
});

describe("qualidade do modo sombra: IA × equipe (sem nota de pessoas)", () => {
  const t = (s: number) => new Date(Date.UTC(2026, 9, 1, 15, 0, s));
  const msg = (id: string, sender: MessageRecord["sender"], s: number, content = id): MessageRecord => ({
    id,
    conversationId: "c1",
    direction: sender === "CUSTOMER" ? "INBOUND" : "OUTBOUND",
    sender,
    senderRef: null,
    content,
    externalId: null,
    metadata: null,
    createdAt: t(s),
  });
  const run = (id: string, trigger: string, extra: Partial<StoredAgentRun> = {}): StoredAgentRun =>
    ({
      id,
      idempotencyKey: id,
      unitId: "u1",
      conversationId: "c1",
      triggerMessageId: trigger,
      trigger: "INBOUND",
      replayOfRunId: null,
      replayLabel: null,
      modelId: "m",
      promptVersionId: "p",
      startedAt: t(0),
      promptVersion: null,
      outcome: "DRAFT_SAVED",
      candidateText: "rascunho",
      guardrailOk: true,
      durationMs: 1200,
      estimatedCostUsd: 0.01,
      proposedHandoff: null,
      ...extra,
    }) as StoredAgentRun;

  it("pareia cada rascunho com a primeira resposta da equipe antes da próxima mensagem do cliente", () => {
    const messages = [
      msg("in1", "CUSTOMER", 0),
      msg("h1", "HUMAN", 90, "Oi! Me manda uma foto?"),
      msg("in2", "CUSTOMER", 120),
      msg("in3", "CUSTOMER", 200),
      msg("h2", "HUMAN", 400, "Perfeito"),
    ];
    const rows = pairRunsWithHumanReplies(
      [
        run("r1", "in1"),
        run("r2", "in2", { guardrailOk: false, proposedHandoff: { reason: "AI_UNCERTAIN", summary: {} } }),
        run("r3", "in3", { outcome: "MODEL_ERROR", estimatedCostUsd: null }),
      ],
      messages,
    );
    assert.equal(rows[0].humanReply?.text, "Oi! Me manda uma foto?");
    assert.equal(rows[0].humanResponseSeconds, 90);
    assert.equal(rows[1].humanReply, null); // a próxima mensagem foi do cliente
    assert.equal(rows[1].forbiddenAttempt, true);
    assert.equal(rows[1].missingInformation, true);
    assert.equal(rows[2].humanReply?.text, "Perfeito");
    assert.equal(rows[2].missingInformation, true);

    const summary = summarizeQuality(rows);
    assert.equal(summary.runs, 3);
    assert.equal(summary.comparedWithHuman, 2);
    assert.equal(summary.forbiddenAttempts, 1);
    assert.equal(summary.missingInformation, 2);
    assert.equal(summary.totalCostUsd, 0.02);
    assert.equal(summary.avgCostUsd, 0.01);
    // Nenhum campo de nota/ranking de pessoas.
    assert.equal(Object.keys(summary).some((key) => /score|nota|rank/i.test(key)), false);
  });

  it("replays não entram na comparação com a equipe", () => {
    const rows = pairRunsWithHumanReplies([run("r1", "in1", { trigger: "REPLAY" })], [msg("in1", "CUSTOMER", 0)]);
    assert.deepEqual(rows, []);
  });
});
