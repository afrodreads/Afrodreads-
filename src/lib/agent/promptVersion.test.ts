import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { normalizePromptContent, promptName, promptSha256, promptSpecFrom, shortSha } from "./promptVersion";
import { fileSystemPromptSource } from "./promptSourceFs";
import { summarizeRuns } from "./metrics";
import { sanitizeError } from "./runs";
import { MemoryPromptRegistry, V2_PATH } from "./testSupport";

describe("versão do prompt: nome + hash do conteúdo", () => {
  it("o mesmo texto tem o mesmo hash com LF, CRLF ou BOM (Windows × Linux/Vercel)", () => {
    const lf = "# PROMPT V2\n\nlinha 1\nlinha 2\n";
    const crlf = lf.replace(/\n/g, "\r\n");
    assert.equal(promptSha256(lf), promptSha256(crlf));
    assert.equal(promptSha256(lf), promptSha256(`﻿${lf}`));
    assert.match(promptSha256(lf), /^[0-9a-f]{64}$/);
  });

  it("qualquer mudança real de texto muda o hash", () => {
    assert.notEqual(promptSha256("# PROMPT V2\n\nA"), promptSha256("# PROMPT V2\n\nB"));
    assert.notEqual(promptSha256("# PROMPT V2\n\nA"), promptSha256("# PROMPT V2\n\nA "));
  });

  it("o nome vem do título do arquivo; sem versão declarada fica 'sem-versao'", () => {
    assert.equal(promptName("# PROMPT DO AGENTE DE WHATSAPP — AFRO DREADS V2\n"), "V2");
    assert.equal(promptName("# PROMPT V3\n"), "V3");
    assert.equal(promptName("# SEM VERSÃO\n"), "sem-versao");
  });

  it("o conteúdo guardado é o normalizado", () => {
    const spec = promptSpecFrom("# PROMPT V9\r\n\r\ntexto\r\n", "x.md");
    assert.equal(spec.content, "# PROMPT V9\n\ntexto\n");
    assert.equal(spec.content, normalizePromptContent(spec.content));
    assert.equal(shortSha(spec.sha256).length, 12);
  });

  it("o registro reaproveita a versão pelo hash (V2 → V3 → V2 = duas versões)", async () => {
    const registry = new MemoryPromptRegistry();
    const v2 = await registry.ensure(promptSpecFrom("# PROMPT V2\n\na", "a.md"));
    const v3 = await registry.ensure(promptSpecFrom("# PROMPT V3\n\nb", "b.md"));
    const again = await registry.ensure(promptSpecFrom("# PROMPT V2\r\n\r\na", "outro-nome.md"));
    assert.equal(again, v2);
    assert.notEqual(v2, v3);
    assert.equal(registry.versions.size, 2);
  });

  it("o V2 versionado no git é lido com nome V2 e hash estável", { skip: !existsSync(V2_PATH) && "V2 ausente" }, async () => {
    const spec = await fileSystemPromptSource(V2_PATH).load();
    assert.equal(spec.name, "V2");
    assert.equal(spec.sha256, promptSha256(readFileSync(V2_PATH, "utf8")));
  });
});

describe("erros guardados sem segredos", () => {
  it("remove chaves, tokens, senhas e URLs de banco", () => {
    const safe = sanitizeError(
      new Error("x sk-live_abcdef123456 Bearer abc.def.ghi api_key=XYZ token: 123 postgresql://u:p@host/db senha=segredo"),
    );
    for (const leaked of ["sk-live", "abc.def.ghi", "XYZ", "u:p@host", "segredo"]) {
      assert.equal(safe.message.includes(leaked), false, leaked);
    }
    assert.equal(safe.code, "Error");
    assert.ok(sanitizeError(new Error("a".repeat(1000))).message.length <= 300);
  });
});

describe("métricas de sombra (medem o agente, nunca o cliente)", () => {
  it("taxa de handoff, bloqueio, sem resposta, erros, intenções e tempo", () => {
    const run = (outcome: string, extra: Record<string, unknown> = {}) =>
      ({ outcome, intent: null, durationMs: 100, proposedHandoff: null, candidateText: "x", trigger: "INBOUND", ...extra }) as never;
    const metrics = summarizeRuns([
      run("DRAFT_SAVED", { intent: "ORCAMENTO", proposedHandoff: { reason: "QUOTE_REQUEST" }, durationMs: 50 }),
      run("DRAFT_SAVED", { intent: "INFORMACAO", durationMs: 150 }),
      run("DRAFT_BLOCKED", { intent: "ORCAMENTO", proposedHandoff: { reason: "AI_UNCERTAIN" }, durationMs: 400 }),
      run("MODEL_ERROR", { candidateText: null, durationMs: 1000 }),
      run("NOTHING_TO_ANSWER", { candidateText: null, durationMs: 10 }),
      { outcome: undefined, intent: null, durationMs: undefined, proposedHandoff: null, candidateText: null, trigger: "INBOUND" } as never,
    ]);

    assert.equal(metrics.total, 6);
    assert.equal(metrics.completed, 5);
    assert.equal(metrics.drafts, 3);
    assert.equal(metrics.handoffRate, 66.7);
    assert.equal(metrics.guardrailBlockRate, 33.3);
    assert.equal(metrics.withoutCandidate, 2);
    assert.equal(metrics.errors, 1);
    assert.deepEqual(metrics.intents, { ORCAMENTO: 2, INFORMACAO: 1 });
    assert.equal(metrics.durationMs.max, 1000);
    assert.equal(metrics.durationMs.avg, 322);
    assert.deepEqual(Object.keys(metrics).sort(), [
      "byOutcome", "completed", "drafts", "durationMs", "errors", "guardrailBlockRate", "handoffRate", "intents", "total", "withoutCandidate",
    ]);
  });

  it("sem execuções, as taxas ficam indefinidas (null), não zero", () => {
    const metrics = summarizeRuns([]);
    assert.equal(metrics.handoffRate, null);
    assert.equal(metrics.durationMs.avg, null);
  });
});
