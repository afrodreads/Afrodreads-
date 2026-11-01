import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { blockedPeriodsOf, blockRowFor, fitsLocks, lockLabel, lockStateOf } from "./blockedPeriods";
import { defaultRuleBook } from "./capacity/ruleBook";

describe("travas da agenda (dia ou período)", () => {
  it("dia inteiro trava manhã e tarde; período trava só ele; sem linha não trava nada", () => {
    assert.deepEqual(blockedPeriodsOf({ fullDay: true, period: null }), ["MORNING", "AFTERNOON"]);
    assert.deepEqual(blockedPeriodsOf({ fullDay: false, period: "MORNING" }), ["MORNING"]);
    assert.deepEqual(blockedPeriodsOf({ fullDay: false, period: "AFTERNOON" }), ["AFTERNOON"]);
    assert.deepEqual(blockedPeriodsOf(null), []);
    assert.deepEqual(blockedPeriodsOf({ fullDay: false, period: null }), []);
  });

  it("os botões viram a linha certa (manhã + tarde = dia inteiro; nada = apagar)", () => {
    assert.deepEqual(blockRowFor({ morning: true, afternoon: true }), { fullDay: true, period: null });
    assert.deepEqual(blockRowFor({ morning: true, afternoon: false }), { fullDay: false, period: "MORNING" });
    assert.deepEqual(blockRowFor({ morning: false, afternoon: true }), { fullDay: false, period: "AFTERNOON" });
    assert.equal(blockRowFor({ morning: false, afternoon: false }), null);
  });

  it("ida e volta: linha → botões → linha", () => {
    for (const row of [
      { fullDay: true, period: null },
      { fullDay: false, period: "MORNING" as const },
      { fullDay: false, period: "AFTERNOON" as const },
    ]) {
      assert.deepEqual(blockRowFor(lockStateOf(row)), row);
    }
  });

  it("serviço de dia inteiro não cabe com manhã ou tarde travada; os de um período só olham o próprio período", () => {
    const book = defaultRuleBook();
    assert.equal(fitsLocks(book.get("microlocs"), "MORNING", ["AFTERNOON"]), false);
    assert.equal(fitsLocks(book.get("microlocs"), "MORNING", []), true);
    assert.equal(fitsLocks(book.get("manutencao-completa"), "MORNING", ["AFTERNOON"]), true);
    assert.equal(fitsLocks(book.get("manutencao-completa"), "AFTERNOON", ["AFTERNOON"]), false);
  });

  it("rótulo do painel", () => {
    assert.equal(lockLabel({ morning: true, afternoon: true }), "Dia travado");
    assert.equal(lockLabel({ morning: true, afternoon: false }), "Manhã travada");
    assert.equal(lockLabel({ morning: false, afternoon: true }), "Tarde travada");
    assert.equal(lockLabel({ morning: false, afternoon: false }), null);
  });
});
