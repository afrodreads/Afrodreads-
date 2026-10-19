import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { companionRows, serviceInputSchema, slugify, uniqueSlug, type ServiceInput } from "./serviceRegistry";

const valid: ServiceInput = {
  name: "Manutenção no topo",
  description: null,
  minHours: 3,
  maxHours: 5,
  basePrice: null,
  active: true,
  chairs: 1,
  staff: "ANY",
  fullDay: false,
  maxPerPeriod: 2,
  maxPerDay: 4,
  startsMorning: true,
  startsAfternoon: true,
  rulesPending: false,
  rulesNote: null,
  allowSameDay: true,
  companions: [],
};

describe("cadastro de serviços: validação", () => {
  it("aceita um serviço completo", () => {
    assert.ok(serviceInputSchema.safeParse(valid).success);
  });

  it("recusa regras impossíveis", () => {
    for (const bad of [
      { minHours: 6, maxHours: 5 },
      { startsMorning: false, startsAfternoon: false },
      { fullDay: true, startsMorning: false },
      { chairs: 3 },
      { maxPerPeriod: 0 },
      { name: " " },
      { staff: "MARIA" },
    ]) {
      assert.equal(serviceInputSchema.safeParse({ ...valid, ...bad }).success, false, JSON.stringify(bad));
    }
  });
});

describe("cadastro de serviços: slug", () => {
  it("gera slug sem acentos e único", () => {
    assert.equal(slugify("Manutenção no Topo!"), "manutencao-no-topo");
    assert.equal(uniqueSlug("Retwist", new Set(["retwist", "retwist-2"])), "retwist-3");
    assert.equal(slugify("***"), "servico");
  });
});

describe("cadastro de serviços: pode dividir o dia (sempre nos dois sentidos)", () => {
  it("grava A→B e B→A, o próprio serviço quando repete no dia, e ignora ids inexistentes ou repetidos", () => {
    const rows = companionRows(
      "mt",
      {
        allowSameDay: true,
        companions: [
          { serviceId: "rt", sharesChair: false },
          { serviceId: "rt", sharesChair: false },
          { serviceId: "fantasma", sharesChair: false },
          { serviceId: "mt", sharesChair: false },
        ],
      },
      new Set(["mt", "rt"]),
    );
    assert.deepEqual(rows, [
      { serviceId: "mt", companionId: "mt", sharesChair: false },
      { serviceId: "mt", companionId: "rt", sharesChair: false },
      { serviceId: "rt", companionId: "mt", sharesChair: false },
    ]);
  });
});
