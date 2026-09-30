import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  activeBookingWhere,
  BOOKING_PAYMENT_TTL_MINUTES,
  isPaymentWindowOpen,
  paymentDeadline,
  pendingPaymentCutoff,
} from "./bookingRules";

const now = new Date("2026-10-01T15:00:00Z");
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000);

describe("prazo de pagamento", () => {
  it("o prazo é de 60 minutos", () => {
    assert.equal(BOOKING_PAYMENT_TTL_MINUTES, 60);
    assert.equal(paymentDeadline(new Date("2026-10-01T14:00:00Z")).toISOString(), "2026-10-01T15:00:00.000Z");
  });

  it("o corte é 'agora' menos o prazo", () => {
    assert.equal(pendingPaymentCutoff(now).toISOString(), "2026-10-01T14:00:00.000Z");
  });

  it("aguardando pagamento dentro do prazo segura o horário", () => {
    assert.equal(isPaymentWindowOpen({ status: "PENDING_PAYMENT", createdAt: minutesAgo(59) }, now), true);
  });

  it("aguardando pagamento fora do prazo não segura mais o horário", () => {
    assert.equal(isPaymentWindowOpen({ status: "PENDING_PAYMENT", createdAt: minutesAgo(60) }, now), false);
    assert.equal(isPaymentWindowOpen({ status: "PENDING_PAYMENT", createdAt: minutesAgo(600) }, now), false);
  });

  it("só PENDING_PAYMENT tem janela de pagamento aberta", () => {
    for (const status of ["CONFIRMED", "CANCELLED", "EXPIRED", "COMPLETED", "NO_SHOW"]) {
      assert.equal(isPaymentWindowOpen({ status, createdAt: minutesAgo(1) }, now), false, status);
    }
  });
});

describe("activeBookingWhere", () => {
  it("considera ativos os confirmados e os pendentes criados depois do corte", () => {
    assert.deepEqual(activeBookingWhere(now), {
      OR: [
        { status: "CONFIRMED" },
        { status: "PENDING_PAYMENT", createdAt: { gt: new Date("2026-10-01T14:00:00.000Z") } },
      ],
    });
  });
});
