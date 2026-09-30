import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findOrCreateCustomer } from "./customer";
import { InvalidPhoneError } from "./errors";
import { resolveUnit } from "./unit";
import { UnitNotFoundError, UnitRequiredError } from "./errors";
import { setup } from "./testSupport";

describe("findOrCreateCustomer: criação e reutilização", () => {
  it("cria o cliente com telefone normalizado, nome e unidade", async () => {
    const { db, unit } = setup();
    const { customer, created } = await findOrCreateCustomer(db, {
      unitId: unit.id,
      phone: "(11) 98765-4321",
      name: "  Maria Silva ",
    });

    assert.equal(created, true);
    assert.equal(customer.phone, "+5511987654321");
    assert.equal(customer.name, "Maria Silva");
    assert.equal(customer.unitId, unit.id);
    assert.equal(db.customers.length, 1);
  });

  it("o mesmo telefone em formatos diferentes reaproveita o mesmo cliente", async () => {
    const { db, unit } = setup();
    const first = await findOrCreateCustomer(db, { unitId: unit.id, phone: "11987654321" });
    const second = await findOrCreateCustomer(db, { unitId: unit.id, phone: "+55 (11) 9 8765-4321" });
    const third = await findOrCreateCustomer(db, { unitId: unit.id, phone: "11 8765-4321" });

    assert.equal(second.created, false);
    assert.equal(third.created, false);
    assert.equal(second.customer.id, first.customer.id);
    assert.equal(third.customer.id, first.customer.id);
    assert.equal(db.customers.length, 1);
  });

  it("preenche o nome só quando o cliente ainda não tem nome", async () => {
    const { db, unit } = setup();
    await findOrCreateCustomer(db, { unitId: unit.id, phone: "11987654321" });
    const named = await findOrCreateCustomer(db, { unitId: unit.id, phone: "11987654321", name: "Maria" });
    assert.equal(named.customer.name, "Maria");

    const again = await findOrCreateCustomer(db, { unitId: unit.id, phone: "11987654321", name: "Outro Nome" });
    assert.equal(again.customer.name, "Maria");
    assert.equal(db.customers[0].name, "Maria");
  });

  it("nome vazio ou só espaços é ignorado", async () => {
    const { db, unit } = setup();
    const { customer } = await findOrCreateCustomer(db, { unitId: unit.id, phone: "11987654321", name: "   " });
    assert.equal(customer.name, null);
  });

  it("recusa telefone inválido sem criar nada", async () => {
    const { db, unit } = setup();
    await assert.rejects(() => findOrCreateCustomer(db, { unitId: unit.id, phone: "abc" }), InvalidPhoneError);
    assert.equal(db.customers.length, 0);
  });
});

describe("findOrCreateCustomer: unicidade", () => {
  it("duas chamadas simultâneas para o mesmo telefone geram um único cliente", async () => {
    const { db, unit } = setup();
    const results = await Promise.all([
      findOrCreateCustomer(db, { unitId: unit.id, phone: "11987654321", name: "Maria" }),
      findOrCreateCustomer(db, { unitId: unit.id, phone: "(11) 98765-4321", name: "Maria" }),
      findOrCreateCustomer(db, { unitId: unit.id, phone: "+5511987654321" }),
    ]);

    assert.equal(db.customers.length, 1);
    assert.equal(new Set(results.map((r) => r.customer.id)).size, 1);
    assert.equal(results.filter((r) => r.created).length, 1);
  });
});

describe("isolamento entre unidades", () => {
  it("o mesmo telefone em unidades diferentes são clientes diferentes", async () => {
    const { db, unit } = setup();
    const other = db.addUnit({ slug: "outra" });

    const a = await findOrCreateCustomer(db, { unitId: unit.id, phone: "11987654321", name: "Maria" });
    const b = await findOrCreateCustomer(db, { unitId: other.id, phone: "11987654321", name: "Maria B" });

    assert.notEqual(a.customer.id, b.customer.id);
    assert.equal(b.created, true);
    assert.equal(db.customers.length, 2);
    assert.equal(a.customer.name, "Maria");
    assert.equal(b.customer.name, "Maria B");
  });

  it("encontrar um cliente numa unidade nunca devolve o de outra", async () => {
    const { db, unit } = setup();
    const other = db.addUnit({ slug: "outra" });
    await findOrCreateCustomer(db, { unitId: other.id, phone: "11987654321" });

    const { customer, created } = await findOrCreateCustomer(db, { unitId: unit.id, phone: "11987654321" });
    assert.equal(created, true);
    assert.equal(customer.unitId, unit.id);
  });
});

describe("resolveUnit", () => {
  it("com uma única unidade ativa, não precisa de indicação", async () => {
    const { db, unit } = setup();
    assert.equal((await resolveUnit(await repoOf(db))).id, unit.id);
  });

  it("com várias unidades ativas, exige que se diga qual", async () => {
    const { db } = setup();
    db.addUnit({ slug: "outra" });
    await assert.rejects(async () => resolveUnit(await repoOf(db)), UnitRequiredError);
  });

  it("resolve por id ou slug e recusa inexistente ou inativa", async () => {
    const { db, unit } = setup();
    const inactive = db.addUnit({ slug: "fechada", active: false });
    const repo = await repoOf(db);

    assert.equal((await resolveUnit(repo, { unitId: unit.id })).slug, "principal");
    assert.equal((await resolveUnit(repo, { slug: "principal" })).id, unit.id);
    await assert.rejects(() => resolveUnit(repo, { unitId: inactive.id }), UnitNotFoundError);
    await assert.rejects(() => resolveUnit(repo, { slug: "nao-existe" }), UnitNotFoundError);
  });

  it("sem nenhuma unidade ativa falha com erro claro", async () => {
    const { db, unit } = setup();
    unit.active = false;
    await assert.rejects(async () => resolveUnit(await repoOf(db)), UnitNotFoundError);
  });
});

// Extrai o repositório da fake para usar o resolveUnit diretamente.
function repoOf(db: ReturnType<typeof setup>["db"]) {
  return db.transaction(async (repo) => repo);
}
