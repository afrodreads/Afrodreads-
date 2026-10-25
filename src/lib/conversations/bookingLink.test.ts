import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { linkBookingToCustomer } from "./bookingLink";
import { findOrCreateCustomer } from "./customer";
import { UnitRequiredError } from "./errors";
import { receiveInboundMessage } from "./message";
import { NOW, setup } from "./testSupport";

describe("linkBookingToCustomer: Customer → Booking", () => {
  it("cria o cliente a partir do telefone do agendamento e vincula (com a unidade)", async () => {
    const { db, unit } = setup();
    const booking = db.addBooking({ clientName: "Maria Silva", clientPhone: "(11) 98765-4321" });

    const result = await linkBookingToCustomer(db, { bookingId: booking.id });

    assert.equal(result.kind, "linked");
    assert.equal(db.customers.length, 1);
    assert.equal(db.customers[0].phone, "+5511987654321");
    assert.equal(db.customers[0].name, "Maria Silva");
    assert.equal(db.bookings[0].customerId, db.customers[0].id);
    assert.equal(db.bookings[0].unitId, unit.id);
  });

  it("vários agendamentos do mesmo telefone ficam no mesmo cliente", async () => {
    const { db } = setup();
    const a = db.addBooking({ clientPhone: "11987654321" });
    const b = db.addBooking({ clientPhone: "+55 11 98765-4321" });
    const c = db.addBooking({ clientPhone: "11 8765-4321" });

    for (const booking of [a, b, c]) await linkBookingToCustomer(db, { bookingId: booking.id });

    assert.equal(db.customers.length, 1);
    assert.deepEqual(new Set(db.bookings.map((x) => x.customerId)), new Set([db.customers[0].id]));
  });

  it("reaproveita o cliente que já veio de uma conversa", async () => {
    const { db, unit } = setup();
    const inboundResult = await receiveInboundMessage(
      db,
      { unitId: unit.id, phone: "11987654321", externalMessageId: "m1", content: "Oi" },
      NOW,
    );
    const booking = db.addBooking({ clientPhone: "(11) 98765-4321" });

    const result = await linkBookingToCustomer(db, { bookingId: booking.id });

    assert.equal(result.kind === "linked" && result.customerId, inboundResult.customerId);
    assert.equal(result.kind === "linked" && result.customerCreated, false);
    assert.equal(db.customers.length, 1);
  });

  it("um cliente tem vários agendamentos e várias conversas", async () => {
    const { db, unit } = setup();
    const { customer } = await findOrCreateCustomer(db, { unitId: unit.id, phone: "11987654321" });
    const a = db.addBooking({ clientPhone: "11987654321" });
    const b = db.addBooking({ clientPhone: "11987654321" });
    await linkBookingToCustomer(db, { bookingId: a.id });
    await linkBookingToCustomer(db, { bookingId: b.id });
    await receiveInboundMessage(db, { unitId: unit.id, phone: "11987654321", externalConversationId: "x", content: "a" }, NOW);
    await receiveInboundMessage(db, { unitId: unit.id, phone: "11987654321", externalConversationId: "y", content: "b" }, NOW);

    assert.equal(db.bookings.filter((x) => x.customerId === customer.id).length, 2);
    assert.equal(db.conversations.filter((x) => x.customerId === customer.id).length, 2);
  });

  it("vincular duas vezes (ou em paralelo) não troca nem duplica o vínculo", async () => {
    const { db } = setup();
    const booking = db.addBooking({ clientPhone: "11987654321" });

    const results = await Promise.all([
      linkBookingToCustomer(db, { bookingId: booking.id }),
      linkBookingToCustomer(db, { bookingId: booking.id }),
    ]);
    const again = await linkBookingToCustomer(db, { bookingId: booking.id });

    assert.equal(results.filter((r) => r.kind === "linked").length, 1);
    assert.equal(again.kind, "already_linked");
    assert.equal(db.customers.length, 1);
  });
});

describe("compatibilidade com agendamentos antigos", () => {
  it("agendamento sem cliente continua existindo com customerId e unitId nulos", () => {
    const { db } = setup();
    const legacy = db.addBooking({ clientPhone: "11987654321" });
    assert.equal(legacy.customerId, null);
    assert.equal(legacy.unitId, null);
    assert.equal(db.customers.length, 0);
  });

  it("telefone antigo que não dá para normalizar não quebra: fica sem vínculo e intacto", async () => {
    const { db } = setup();
    const weird = db.addBooking({ clientName: "Fulano", clientPhone: "ligar depois das 18h" });

    const result = await linkBookingToCustomer(db, { bookingId: weird.id });

    assert.deepEqual(result, { kind: "skipped", reason: "invalid_phone" });
    assert.equal(db.bookings[0].customerId, null);
    assert.equal(db.bookings[0].clientName, "Fulano");
    assert.equal(db.bookings[0].clientPhone, "ligar depois das 18h");
    assert.equal(db.customers.length, 0);
  });

  it("agendamento que já tinha um cliente não é revinculado", async () => {
    const { db, unit } = setup();
    const { customer } = await findOrCreateCustomer(db, { unitId: unit.id, phone: "11911112222" });
    const booking = db.addBooking({ clientPhone: "11987654321", customerId: customer.id, unitId: unit.id });

    const result = await linkBookingToCustomer(db, { bookingId: booking.id });

    assert.deepEqual(result, { kind: "already_linked", customerId: customer.id });
    assert.equal(db.customers.length, 1);
  });

  it("agendamento inexistente", async () => {
    const { db } = setup();
    assert.deepEqual(await linkBookingToCustomer(db, { bookingId: "nope" }), { kind: "not_found" });
  });
});

describe("isolamento entre unidades (agendamentos)", () => {
  it("com várias unidades ativas é preciso dizer qual (não adivinha)", async () => {
    const { db } = setup();
    db.addUnit({ slug: "outra" });
    const booking = db.addBooking({ clientPhone: "11987654321" });

    await assert.rejects(() => linkBookingToCustomer(db, { bookingId: booking.id }), UnitRequiredError);
    assert.equal(db.bookings[0].customerId, null);
  });

  it("vincula ao cliente da unidade indicada, separado do mesmo telefone em outra unidade", async () => {
    const { db, unit } = setup();
    const other = db.addUnit({ slug: "outra" });
    const a = db.addBooking({ clientPhone: "11987654321" });
    const b = db.addBooking({ clientPhone: "11987654321" });

    await linkBookingToCustomer(db, { bookingId: a.id, unitId: unit.id });
    await linkBookingToCustomer(db, { bookingId: b.id, unitId: other.id });

    assert.equal(db.customers.length, 2);
    assert.notEqual(db.bookings[0].customerId, db.bookings[1].customerId);
    assert.equal(db.bookings[0].unitId, unit.id);
    assert.equal(db.bookings[1].unitId, other.id);
  });

  it("usa a unidade que o agendamento já tem", async () => {
    const { db } = setup();
    const other = db.addUnit({ slug: "outra" });
    const booking = db.addBooking({ clientPhone: "11987654321", unitId: other.id });

    const result = await linkBookingToCustomer(db, { bookingId: booking.id });

    assert.equal(result.kind === "linked" && result.unitId, other.id);
  });
});
