import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { expireStaleBookings, type ExpiryStore, type PendingBooking } from "./bookingExpiry";
import { sp } from "./testHelpers";

type Row = { id: string; status: string; createdAt: Date; hasApprovedPayment: boolean };

class FakeStore implements ExpiryStore {
  constructor(public rows: Row[]) {}
  lastCutoff: Date | null = null;
  async findPendingCreatedUntil(cutoff: Date): Promise<PendingBooking[]> {
    this.lastCutoff = cutoff;
    return this.rows
      .filter((r) => r.status === "PENDING_PAYMENT" && r.createdAt <= cutoff)
      .map((r) => ({ id: r.id, hasApprovedPayment: r.hasApprovedPayment }));
  }
  async expire(id: string) {
    const row = this.rows.find((r) => r.id === id);
    if (!row || row.status !== "PENDING_PAYMENT") return false;
    row.status = "EXPIRED";
    return true;
  }
}

const NOW = sp("2026-10-01T12:00:00");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60 * 1000);
const row = (id: string, status: string, minutes: number, hasApprovedPayment = false): Row => ({
  id,
  status,
  createdAt: minutesAgo(minutes),
  hasApprovedPayment,
});

describe("expireStaleBookings", () => {
  it("expira só o que passou de 60 minutos aguardando pagamento", async () => {
    const store = new FakeStore([row("velho", "PENDING_PAYMENT", 120), row("recente", "PENDING_PAYMENT", 10)]);
    const report = await expireStaleBookings(store, NOW);

    assert.deepEqual(report, { checked: 1, expired: 1, skippedPaid: 0 });
    assert.equal(store.rows.find((r) => r.id === "velho")?.status, "EXPIRED");
    assert.equal(store.rows.find((r) => r.id === "recente")?.status, "PENDING_PAYMENT");
  });

  it("usa exatamente o corte de 60 minutos antes de agora", async () => {
    const store = new FakeStore([]);
    await expireStaleBookings(store, NOW);
    assert.equal(store.lastCutoff?.toISOString(), minutesAgo(60).toISOString());
  });

  it("o limite exato (60 minutos) já conta como vencido, igual à regra da agenda", async () => {
    const store = new FakeStore([row("limite", "PENDING_PAYMENT", 60), row("quase", "PENDING_PAYMENT", 59)]);
    await expireStaleBookings(store, NOW);
    assert.equal(store.rows.find((r) => r.id === "limite")?.status, "EXPIRED");
    assert.equal(store.rows.find((r) => r.id === "quase")?.status, "PENDING_PAYMENT");
  });

  it("NUNCA expira agendamento que já tem pagamento aprovado", async () => {
    const store = new FakeStore([row("pago", "PENDING_PAYMENT", 500, true)]);
    const report = await expireStaleBookings(store, NOW);

    assert.deepEqual(report, { checked: 1, expired: 0, skippedPaid: 1 });
    assert.equal(store.rows[0].status, "PENDING_PAYMENT");
  });

  it("não mexe em agendamentos confirmados, cancelados ou já expirados", async () => {
    const store = new FakeStore([
      row("c", "CONFIRMED", 500),
      row("x", "CANCELLED", 500),
      row("e", "EXPIRED", 500),
    ]);
    const report = await expireStaleBookings(store, NOW);

    assert.deepEqual(report, { checked: 0, expired: 0, skippedPaid: 0 });
    assert.deepEqual(store.rows.map((r) => r.status), ["CONFIRMED", "CANCELLED", "EXPIRED"]);
  });

  it("é idempotente: rodar duas vezes não expira nada novo na segunda", async () => {
    const store = new FakeStore([row("velho", "PENDING_PAYMENT", 120)]);
    await expireStaleBookings(store, NOW);
    const second = await expireStaleBookings(store, NOW);
    assert.deepEqual(second, { checked: 0, expired: 0, skippedPaid: 0 });
  });

  it("se o status mudou no meio do caminho (pagou agora), não expira", async () => {
    const store = new FakeStore([row("corrida", "PENDING_PAYMENT", 120)]);
    const originalFind = store.findPendingCreatedUntil.bind(store);
    store.findPendingCreatedUntil = async (cutoff) => {
      const found = await originalFind(cutoff);
      store.rows[0].status = "CONFIRMED"; // o webhook confirmou entre a consulta e a troca
      return found;
    };
    const report = await expireStaleBookings(store, NOW);
    assert.deepEqual(report, { checked: 1, expired: 0, skippedPaid: 0 });
    assert.equal(store.rows[0].status, "CONFIRMED");
  });
});
