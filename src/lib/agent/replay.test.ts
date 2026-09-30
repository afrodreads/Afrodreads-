import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handoffToHuman } from "../conversations/conversation";
import { InvalidInputError } from "../conversations/errors";
import { NotShadowModeError } from "./config";
import { compareByPromptVersion } from "./metrics";
import { replayAgentRun, runAgentShadow } from "./orchestrator";
import { agentHarness, fixedPromptSource, HARNESS_NOW as NOW, promotion, replyWith, ScriptedModel } from "./testSupport";

const V3 = "# PROMPT DE TESTE V8\n\n# 1. IDENTIDADE E MISSÃO\n\nVocê é a atendente virtual, versão nova.\n";

async function withOriginalRun() {
  const model = replyWith("Resposta original. 💛", [{ name: "update_lead_data", arguments: { intent: "ORCAMENTO" } }]);
  const h = agentHarness(model);
  const first = await h.inbound("m1", "Quanto custa dread até a cintura?");
  const original = await runAgentShadow(h.live, { conversationId: first.conversationId, triggerMessageId: first.messageId, now: NOW });
  return { h, model, first, original };
}

describe("replay em sombra", () => {
  it("reexecuta a partir de um AgentRun e grava um novo AgentRun REPLAY ligado ao original", async () => {
    const { h, first, original } = await withOriginalRun();
    const model = replyWith("Resposta com o prompt novo. 💛", [], "modelo-roteirizado-v2");

    const replay = await replayAgentRun(h.replayDeps({ model, prompt: fixedPromptSource(V3) }), {
      sourceRunId: original.runId!,
      label: "comparacao-v8",
    });

    assert.equal(replay.outcome, "DRAFT_SAVED");
    const run = h.runs.runs.find((r) => r.id === replay.runId)!;
    assert.equal(run.trigger, "REPLAY");
    assert.equal(run.replayOfRunId, original.runId);
    assert.equal(run.replayLabel, "comparacao-v8");
    assert.equal(run.triggerMessageId, first.messageId);
    assert.equal(run.modelId, "modelo-roteirizado-v2");
    assert.equal(run.promptVersion?.name, "V8");
    assert.match(run.candidateText ?? "", /prompt novo/);
  });

  it("NÃO envia, NÃO altera conversa, booking, pagamento nem cria handoff real", async () => {
    const { h, original } = await withOriginalRun();
    const snapshot = JSON.stringify({ c: h.db.conversations, m: h.db.messages, hd: h.db.handoffs, t: h.db.transitions });
    const model = replyWith("Passo para a equipe.", [
      { name: "request_handoff", arguments: { reason: "QUOTE_REQUEST", summary: { headline: "Orçamento" } } },
      { name: "confirm_payment", arguments: {} },
    ]);

    await replayAgentRun(h.replayDeps({ model }), { sourceRunId: original.runId!, label: "sem-efeitos" });

    assert.equal(JSON.stringify({ c: h.db.conversations, m: h.db.messages, hd: h.db.handoffs, t: h.db.transitions }), snapshot);
    assert.equal(h.db.messages.filter((m) => m.direction === "OUTBOUND").length, 0);
  });

  it("é idempotente por (mensagem, versão do prompt, modelo, rótulo), inclusive em paralelo", async () => {
    const { h, first } = await withOriginalRun();
    const model = replyWith("Replay. 💛");
    const deps = h.replayDeps({ model });

    const results = await Promise.all([1, 2, 3].map(() => replayAgentRun(deps, { messageId: first.messageId, label: "lote-1" })));
    assert.equal(results.filter((r) => r.outcome === "DRAFT_SAVED").length, 1);
    assert.equal(results.filter((r) => r.outcome === "DUPLICATE").length, 2);
    assert.equal(model.calls.length, 1);

    // Rótulo diferente, prompt diferente ou modelo diferente = nova execução.
    await replayAgentRun(deps, { messageId: first.messageId, label: "lote-2" });
    await replayAgentRun(h.replayDeps({ model, prompt: fixedPromptSource(V3) }), { messageId: first.messageId, label: "lote-1" });
    await replayAgentRun(h.replayDeps({ model: replyWith("x", [], "outro-modelo") }), { messageId: first.messageId, label: "lote-1" });
    assert.equal(h.runs.runs.filter((r) => r.trigger === "REPLAY").length, 4);
  });

  it("reconstrói o contexto do momento: mensagens posteriores e a passagem para HUMAN depois não contam", async () => {
    const { h, first } = await withOriginalRun();
    const later = new Date(NOW.getTime() + 60_000);
    await handoffToHuman(h.db, { conversationId: first.conversationId, reason: "OTHER", summary: { headline: "x" }, actor: { type: "AI" }, now: later });
    await h.inbound("m2", "mensagem posterior", later);

    const model = replyWith("Replay do passado.");
    const replay = await replayAgentRun(h.replayDeps({ model }), { messageId: first.messageId, label: "historico" });

    assert.equal(replay.outcome, "DRAFT_SAVED"); // no momento da mensagem a conversa era BOT
    assert.equal(model.calls[0].messages.length, 1);
    assert.doesNotMatch(JSON.stringify(model.calls[0].messages), /posterior/);
  });

  it("mensagem que chegou com a conversa em HUMAN não é reexecutada (a IA não teria respondido)", async () => {
    const h = agentHarness(replyWith("x"));
    const first = await h.inbound("m1");
    const later = new Date(NOW.getTime() + 60_000);
    await handoffToHuman(h.db, { conversationId: first.conversationId, reason: "OTHER", summary: { headline: "x" }, actor: { type: "AI" }, now: later });
    const during = await h.inbound("m2", "e aí?", new Date(later.getTime() + 1000));

    const model = replyWith("não deveria");
    const result = await replayAgentRun(h.replayDeps({ model }), { messageId: during.messageId, label: "humano" });
    assert.equal(result.outcome, "SKIPPED_NOT_BOT");
    assert.equal(model.calls.length, 0);
    assert.equal(h.runs.runs.length, 0);
  });

  it("usa a data da mensagem para promoções (e não a data de hoje)", async () => {
    const h = agentHarness(replyWith("x"));
    h.reader.promotions = [promotion(h.unit.id)];
    const inOctober = await h.inbound("m1", "Tem promoção?", new Date("2026-10-20T10:00:00-03:00"));
    const model = replyWith("Temos a promoção!");
    await replayAgentRun(h.replayDeps({ model }), { messageId: inOctober.messageId, label: "promo" });
    assert.match(model.calls[0].system, /R\$ 750/);
  });

  it("só aceita mensagens do cliente, exige rótulo e modo sombra", async () => {
    const { h, first } = await withOriginalRun();
    await assert.rejects(() => replayAgentRun(h.replayDeps(), { messageId: first.messageId, label: "  " }), InvalidInputError);
    await assert.rejects(() => replayAgentRun(h.replayDeps(), { messageId: "nao-existe", label: "x" }), InvalidInputError);
    await assert.rejects(() => replayAgentRun(h.replayDeps(), { sourceRunId: "nao-existe", label: "x" }), InvalidInputError);
    h.db.messages.push({ ...h.db.messages[0], id: "out-1", direction: "OUTBOUND", sender: "HUMAN", externalId: null });
    await assert.rejects(() => replayAgentRun(h.replayDeps(), { messageId: "out-1", label: "x" }), InvalidInputError);
    await assert.rejects(
      () => replayAgentRun(h.replayDeps({ config: { mode: "live" } }), { messageId: first.messageId, label: "x" }),
      NotShadowModeError,
    );
  });
});

describe("comparação de versões para a mesma mensagem", () => {
  it("agrupa as execuções por versão do prompt (V7 original × V8 replay)", async () => {
    const { h, first } = await withOriginalRun();
    await replayAgentRun(h.replayDeps({ model: replyWith("v8 a"), prompt: fixedPromptSource(V3) }), { messageId: first.messageId, label: "a" });
    await replayAgentRun(h.replayDeps({ model: replyWith("v8 b"), prompt: fixedPromptSource(V3) }), { messageId: first.messageId, label: "b" });

    const groups = compareByPromptVersion(await h.runs.listForMessage(first.messageId));
    assert.deepEqual(groups.map((g) => [g.promptName, g.runs.length]), [["V7", 1], ["V8", 2]]);
    assert.notEqual(groups[0].promptSha256, groups[1].promptSha256);
  });

  it("a mesma versão de prompt é registrada uma vez só", async () => {
    const { h, first } = await withOriginalRun();
    await replayAgentRun(h.replayDeps({ model: new ScriptedModel(() => ({ text: "x", toolCalls: [] })) }), { messageId: first.messageId, label: "z" });
    assert.equal(h.prompts.versions.size, 1);
  });
});
