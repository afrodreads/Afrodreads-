import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import type { RefundGateway } from "./cancellation";
import type { EmailSender, MercadoPagoPayment, PaymentWebhookDeps } from "./paymentWebhook";

// Teste com banco de verdade (Postgres): só roda quando INTEGRATION_DATABASE_URL
// aponta para um banco LOCAL descartável. Em `npm test` normal ele é ignorado.
//   INTEGRATION_DATABASE_URL=postgresql://postgres@127.0.0.1:54330/agenda npm test
const url = process.env.INTEGRATION_DATABASE_URL;
const isLocal = !!url && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
const skip = !isLocal && "defina INTEGRATION_DATABASE_URL com um banco local para rodar";

describe("webhook do Mercado Pago (banco de verdade)", { skip }, () => {
  let db: PrismaClient;
  let applyMercadoPagoPayment: typeof import("./paymentWebhook").applyMercadoPagoPayment;
  let processApprovedPaymentNow: typeof import("./bookingStores").processApprovedPaymentNow;
  let serviceId: string;
  let seq = 0;

  const refunds: string[] = [];
  const sentEmails: string[] = [];
  const gateway: RefundGateway = {
    async refund(mpPaymentId) {
      refunds.push(mpPaymentId);
    },
    async refundPartial() {
      throw new Error("não esperado");
    },
  };
  const emailSenders: EmailSender[] = [
    { label: "cliente", send: async (b) => void sentEmails.push(`cliente:${b.id}`) },
    { label: "equipe", send: async (b) => void sentEmails.push(`equipe:${b.id}`) },
  ];
  let deps: PaymentWebhookDeps;

  before(async () => {
    process.env.DATABASE_URL = url;
    process.env.DIRECT_URL = url;
    ({ prisma: db } = await import("./prisma"));
    ({ applyMercadoPagoPayment } = await import("./paymentWebhook"));
    ({ processApprovedPaymentNow } = await import("./bookingStores"));
    deps = {
      db,
      refundGateway: gateway,
      processApproved: (params) => processApprovedPaymentNow(params, gateway),
      emailSenders,
    };
    const service = await db.service.create({
      data: { slug: `teste-webhook-${Date.now()}`, name: "Teste webhook", minHours: 1, maxHours: 2, basePrice: 400 },
    });
    serviceId = service.id;
  });

  after(async () => {
    if (!db) return;
    const bookings = await db.booking.findMany({ where: { serviceId }, select: { id: true } });
    const ids = bookings.map((b) => b.id);
    await db.payment.deleteMany({ where: { bookingId: { in: ids } } });
    await db.booking.deleteMany({ where: { id: { in: ids } } });
    await db.service.delete({ where: { id: serviceId } });
    await db.$disconnect();
  });

  /** Agendamento de R$ 400 com sinal de R$ 50, aguardando pagamento. */
  async function makeBooking(overrides: { status?: "PENDING_PAYMENT" | "EXPIRED"; createdAt?: Date } = {}) {
    seq += 1;
    const start = new Date(Date.UTC(2027, 2, 10 + seq * 7, 13, 0, 0)); // quartas, 10h em SP
    return db.booking.create({
      data: {
        clientName: "Cliente Teste",
        clientEmail: `cliente${seq}@example.com`,
        clientPhone: "11999990000",
        serviceId,
        scheduledStart: start,
        scheduledEnd: new Date(start.getTime() + 5 * 3600_000),
        servicePrice: 400,
        depositAmount: 50,
        remainingAmount: 350,
        period: "MORNING",
        status: overrides.status ?? "PENDING_PAYMENT",
        ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
      },
    });
  }

  const mp = (bookingId: string, id: number, amount: number, status = "approved"): MercadoPagoPayment => ({
    id,
    status,
    external_reference: bookingId,
    transaction_amount: amount,
    payment_type_id: "pix",
  });

  const reset = () => {
    refunds.length = 0;
    sentEmails.length = 0;
  };

  const state = async (bookingId: string) => {
    const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    const payments = await db.payment.findMany({ where: { bookingId }, orderBy: { mpPaymentId: "asc" } });
    return { booking, payments };
  };

  it("sinal aprovado: confirma, mostra o restante a pagar e envia os dois e-mails", async () => {
    reset();
    const b = await makeBooking();
    assert.equal(await applyMercadoPagoPayment(mp(b.id, 9100001, 50), deps), "confirmed");
    const { booking, payments } = await state(b.id);
    assert.equal(booking.status, "CONFIRMED");
    assert.equal(booking.paymentOption, "DEPOSIT");
    assert.equal(Number(booking.remainingAmount), 350);
    assert.deepEqual(payments.map((p) => [p.type, p.status, Number(p.amount)]), [["DEPOSIT", "APPROVED", 50]]);
    assert.deepEqual(sentEmails, [`cliente:${b.id}`, `equipe:${b.id}`]);
    assert.deepEqual(refunds, []);
  });

  it("valor total aprovado: confirma e não sobra nada a pagar no dia", async () => {
    reset();
    const b = await makeBooking();
    assert.equal(await applyMercadoPagoPayment(mp(b.id, 9100002, 400), deps), "confirmed");
    const { booking, payments } = await state(b.id);
    assert.equal(booking.status, "CONFIRMED");
    assert.equal(booking.paymentOption, "FULL");
    assert.equal(Number(booking.remainingAmount), 0);
    assert.deepEqual(payments.map((p) => [p.type, p.status]), [["FULL", "APPROVED"]]);
    assert.equal(sentEmails.length, 2);
  });

  it("usa a linha pendente criada na hora de pagar, sem duplicar o registro", async () => {
    reset();
    const b = await makeBooking();
    await db.payment.create({ data: { bookingId: b.id, type: "FULL", status: "PENDING", amount: 400, mpPreferenceId: "pref-1" } });
    await applyMercadoPagoPayment(mp(b.id, 9100003, 400), deps);
    const { payments } = await state(b.id);
    assert.equal(payments.length, 1);
    assert.equal(payments[0].mpPaymentId, "9100003");
    assert.equal(payments[0].status, "APPROVED");
    assert.equal(payments[0].mpPreferenceId, "pref-1");
  });

  it("pagamento pendente ou recusado só é registrado: o agendamento segue aguardando", async () => {
    reset();
    const b = await makeBooking();
    assert.equal(await applyMercadoPagoPayment(mp(b.id, 9100004, 50, "pending"), deps), "recorded");
    const { booking, payments } = await state(b.id);
    assert.equal(booking.status, "PENDING_PAYMENT");
    assert.equal(payments[0].status, "PENDING");
    assert.deepEqual(sentEmails, []);
  });

  it("sinal e depois total: fica o total e o sinal é estornado, sem repetir e-mail", async () => {
    reset();
    const b = await makeBooking();
    await applyMercadoPagoPayment(mp(b.id, 9100005, 50), deps);
    sentEmails.length = 0;
    assert.equal(await applyMercadoPagoPayment(mp(b.id, 9100006, 400), deps), "settled");
    const { booking, payments } = await state(b.id);
    assert.deepEqual(refunds, ["9100005"]);
    assert.deepEqual(payments.map((p) => [p.mpPaymentId, p.type, p.status]), [
      ["9100005", "DEPOSIT", "REFUNDED"],
      ["9100006", "FULL", "APPROVED"],
    ]);
    assert.equal(booking.paymentOption, "FULL");
    assert.equal(Number(booking.remainingAmount), 0);
    assert.deepEqual(sentEmails, []);
  });

  it("total e depois sinal (ordem invertida): o sinal que chegou depois é estornado", async () => {
    reset();
    const b = await makeBooking();
    await applyMercadoPagoPayment(mp(b.id, 9100007, 400), deps);
    sentEmails.length = 0;
    assert.equal(await applyMercadoPagoPayment(mp(b.id, 9100008, 50), deps), "duplicate_refunded");
    const { booking, payments } = await state(b.id);
    assert.deepEqual(refunds, ["9100008"]);
    assert.deepEqual(payments.map((p) => [p.mpPaymentId, p.status]), [
      ["9100007", "APPROVED"],
      ["9100008", "REFUNDED"],
    ]);
    assert.equal(booking.paymentOption, "FULL");
    assert.deepEqual(sentEmails, []);
  });

  it("webhook repetido: não estorna de novo, não reenvia e-mail e um estornado não volta a aprovado", async () => {
    reset();
    const b = await makeBooking();
    await applyMercadoPagoPayment(mp(b.id, 9100009, 50), deps);
    await applyMercadoPagoPayment(mp(b.id, 9100010, 400), deps); // estorna o 9100009
    assert.deepEqual(refunds, ["9100009"]);
    sentEmails.length = 0;

    assert.equal(await applyMercadoPagoPayment(mp(b.id, 9100010, 400), deps), "settled"); // repetiu o total
    assert.equal(await applyMercadoPagoPayment(mp(b.id, 9100009, 50), deps), "recorded"); // chegou o "approved" antigo do sinal
    const { payments } = await state(b.id);
    assert.deepEqual(refunds, ["9100009"], "nenhum estorno novo");
    assert.deepEqual(sentEmails, []);
    assert.deepEqual(payments.map((p) => [p.mpPaymentId, p.status]), [
      ["9100009", "REFUNDED"],
      ["9100010", "APPROVED"],
    ]);
  });

  it("dois webhooks iguais ao mesmo tempo: um registro, um agendamento confirmado, e-mails uma vez", async () => {
    reset();
    const b = await makeBooking();
    await Promise.all([
      applyMercadoPagoPayment(mp(b.id, 9100011, 50), deps),
      applyMercadoPagoPayment(mp(b.id, 9100011, 50), deps),
    ]);
    const { booking, payments } = await state(b.id);
    assert.equal(payments.length, 1);
    assert.equal(booking.status, "CONFIRMED");
    assert.deepEqual(sentEmails.sort(), [`cliente:${b.id}`, `equipe:${b.id}`]);
    assert.deepEqual(refunds, []);
  });

  it("falha no e-mail não derruba o webhook", async () => {
    reset();
    const b = await makeBooking();
    const broken: PaymentWebhookDeps = {
      ...deps,
      emailSenders: [
        { label: "cliente", send: async () => { throw new Error("Resend fora do ar"); } },
        emailSenders[1],
      ],
    };
    assert.equal(await applyMercadoPagoPayment(mp(b.id, 9100012, 50), broken), "confirmed");
    assert.deepEqual(sentEmails, [`equipe:${b.id}`]);
  });

  it("pagamento fora do prazo com o horário livre: reconfirma o agendamento", async () => {
    reset();
    const b = await makeBooking({ status: "EXPIRED", createdAt: new Date(Date.now() - 5 * 3600_000) });
    assert.equal(await applyMercadoPagoPayment(mp(b.id, 9100013, 400), deps), "reconfirmed");
    const { booking } = await state(b.id);
    assert.equal(booking.status, "CONFIRMED");
    assert.equal(booking.paymentOption, "FULL");
    assert.equal(sentEmails.length, 2);
  });

  it("agendamento desconhecido ou sem referência: ignora", async () => {
    assert.equal(await applyMercadoPagoPayment(mp("nao-existe", 9100014, 50), deps), "no_booking");
    assert.equal(await applyMercadoPagoPayment({ id: 9100015, status: "approved" }, deps), "no_booking");
  });
});
