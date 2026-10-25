import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { allowedTargets, canAiRespond, evaluateTransition } from "./stateMachine";
import type { ActorType, ConversationMode } from "./types";

const MODES: ConversationMode[] = ["BOT", "HUMAN", "FINISHED"];
const ACTORS: ActorType[] = ["AI", "HUMAN", "SYSTEM"];

describe("evaluateTransition: caminhos permitidos", () => {
  it("BOT → HUMAN exige encaminhamento e aceita IA, equipe e sistema", () => {
    for (const type of ACTORS) {
      const verdict = evaluateTransition("BOT", "HUMAN", { type });
      assert.deepEqual(verdict, { ok: true, requiresHandoff: true }, type);
    }
  });

  it("HUMAN → FINISHED: equipe e sistema podem; a IA não", () => {
    assert.equal(evaluateTransition("HUMAN", "FINISHED", { type: "HUMAN" }).ok, true);
    assert.equal(evaluateTransition("HUMAN", "FINISHED", { type: "SYSTEM" }).ok, true);
    assert.equal(evaluateTransition("HUMAN", "FINISHED", { type: "AI" }).ok, false);
  });

  it("FINISHED → BOT: equipe e sistema podem; a IA não se reativa sozinha", () => {
    assert.equal(evaluateTransition("FINISHED", "BOT", { type: "HUMAN" }).ok, true);
    assert.equal(evaluateTransition("FINISHED", "BOT", { type: "SYSTEM" }).ok, true);
    assert.equal(evaluateTransition("FINISHED", "BOT", { type: "AI" }).ok, false);
  });

  it("HUMAN → FINISHED e FINISHED → BOT não exigem encaminhamento", () => {
    assert.deepEqual(evaluateTransition("HUMAN", "FINISHED", { type: "HUMAN" }), { ok: true, requiresHandoff: false });
    assert.deepEqual(evaluateTransition("FINISHED", "BOT", { type: "SYSTEM" }), { ok: true, requiresHandoff: false });
  });
});

describe("evaluateTransition: nada arbitrário", () => {
  it("de todas as 9 combinações só existem 3 caminhos", () => {
    const allowed: string[] = [];
    for (const from of MODES) {
      for (const to of MODES) {
        // SYSTEM é o ator mais permissivo: se nem ele passa, ninguém passa.
        if (evaluateTransition(from, to, { type: "SYSTEM" }).ok) allowed.push(`${from}>${to}`);
      }
    }
    assert.deepEqual(allowed.sort(), ["BOT>HUMAN", "FINISHED>BOT", "HUMAN>FINISHED"]);
  });

  it("recusa ficar no mesmo estado e saltos como BOT → FINISHED, HUMAN → BOT e FINISHED → HUMAN", () => {
    for (const [from, to] of [
      ["BOT", "BOT"],
      ["HUMAN", "HUMAN"],
      ["FINISHED", "FINISHED"],
      ["BOT", "FINISHED"],
      ["HUMAN", "BOT"],
      ["FINISHED", "HUMAN"],
    ] as const) {
      for (const type of ACTORS) {
        assert.equal(evaluateTransition(from, to, { type }).ok, false, `${from}>${to} ${type}`);
      }
    }
  });

  it("allowedTargets lista só o próximo passo de cada estado", () => {
    assert.deepEqual(allowedTargets("BOT"), ["HUMAN"]);
    assert.deepEqual(allowedTargets("HUMAN"), ["FINISHED"]);
    assert.deepEqual(allowedTargets("FINISHED"), ["BOT"]);
  });
});

describe("canAiRespond", () => {
  it("a IA só responde em BOT", () => {
    assert.equal(canAiRespond("BOT"), true);
    assert.equal(canAiRespond("HUMAN"), false);
    assert.equal(canAiRespond("FINISHED"), false);
  });
});
