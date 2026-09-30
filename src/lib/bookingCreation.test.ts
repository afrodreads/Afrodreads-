import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Booking } from "@prisma/client";
import {
  createBooking,
  SlotTakenError,
  type BookingCreationRepo,
  type BookingCreationStore,
  type CreateBookingInput,
  type NewBookingData,
} from "./bookingCreation";
import { isPaymentWindowOpen } from "./bookingRules";
import { makeBooking, sp } from "./testHelpers";

// "Agora" fixo: quarta-feira, 1º/10/2026, 09h em São Paulo.
const NOW = sp("2026-10-01T09:00:00");

class FakeStore implements BookingCreationStore {
  services = new Map<string, string>([["retwist", "service-retwist"], ["microlocs", "service-micro"]]);
  blockedDays = new Set<string>();
  bookings: Booking[] = [];
  created: NewBookingData[] = [];
  failWith: Error | null = null;

  async transaction<T>(fn: (repo: BookingCreationRepo) => Promise<T>): Promise<T> {
    if (this.failWith) throw this.failWith;
    return fn({
      findServiceIdBySlug: async (slug) => this.services.get(slug) ?? null,
      isFullDayBlocked: async (day) => this.blockedDays.has(day.toISOString()),
      countActiveOverlapping: async (start, end, now) =>
        this.bookings.filter((b) => {
          const active = b.status === "CONFIRMED" || isPaymentWindowOpen(b, now);
          return active && b.scheduledStart < end && b.scheduledEnd > start;
        }).length,
      create: async (data) => {
        this.created.push(data);
        const booking = makeBooking({
          ...data,
          servicePrice: data.servicePrice as unknown as Booking["servicePrice"],
          depositAmount: data.depositAmount as unknown as Booking["depositAmount"],
          remainingAmount: data.remainingAmount as unknown as Booking["remainingAmount"],
          notes: data.notes ?? null,
          status: "PENDING_PAYMENT",
          createdAt: NOW,
        });
        this.bookings.push(booking);
        return booking;
      },
    });
  }
}

const baseInput = (overrides: Partial<CreateBookingInput> = {}): CreateBookingInput => ({
  serviceSlug: "retwist", // 5h: horários das 10h e 15h
  scheduledStart: sp("2026-10-07T10:00:00"), // quarta
  servicePrice: 400,
  isOutOfTownSeason: false,
  clientName: "Maria",
  clientEmail: "maria@example.com",
  clientPhone: "11988887777",
  ...overrides,
});

describe("createBooking: criação válida", () => {
  it("cria o agendamento com sinal fixo de R$50 calculado no servidor", async () => {
    const store = new FakeStore();
    const result = await createBooking(baseInput(), store, NOW);
    assert.ok("booking" in result);
    assert.equal(store.created.length, 1);
    const data = store.created[0];
    assert.equal(data.servicePrice, 400);
    assert.equal(data.depositAmount, 50);
    assert.equal(data.depositIsPercentage, false);
    assert.equal(data.remainingAmount, 350);
    assert.equal(data.serviceId, "service-retwist");
  });

  it("o fim do atendimento é o início + duração máxima do serviço", async () => {
    const store = new FakeStore();
    await createBooking(baseInput(), store, NOW);
    assert.equal(store.created[0].scheduledEnd.toISOString(), sp("2026-10-07T15:00:00").toISOString());
  });

  it("agendamento novo nasce aguardando pagamento (nunca já confirmado)", async () => {
    const store = new FakeStore();
    const result = await createBooking(baseInput(), store, NOW);
    assert.ok("booking" in result);
    assert.equal(result.booking.status, "PENDING_PAYMENT");
  });

  it("dezembro cobra 50% de sinal", async () => {
    const store = new FakeStore();
    await createBooking(baseInput({ scheduledStart: sp("2026-12-09T10:00:00") }), store, NOW); // quarta
    assert.equal(store.created[0].depositAmount, 200);
    assert.equal(store.created[0].depositIsPercentage, true);
  });

  it("temporada fora de SP cobra 50% de sinal", async () => {
    const store = new FakeStore();
    await createBooking(baseInput({ isOutOfTownSeason: true }), store, NOW);
    assert.equal(store.created[0].depositAmount, 200);
  });
});

describe("createBooking: valor do serviço", () => {
  for (const price of [0, -10, Number.NaN, Number.POSITIVE_INFINITY, 1_000_000]) {
    it(`recusa valor inválido (${price})`, async () => {
      const store = new FakeStore();
      const result = await createBooking(baseInput({ servicePrice: price }), store, NOW);
      assert.deepEqual(result, { error: "Valor do serviço inválido", status: 400 });
      assert.equal(store.created.length, 0);
    });
  }

  it("o sinal é sempre derivado do valor informado pelo servidor, nunca maior que o serviço", async () => {
    const store = new FakeStore();
    await createBooking(baseInput({ servicePrice: 30 }), store, NOW);
    assert.equal(store.created[0].depositAmount, 30);
    assert.equal(store.created[0].remainingAmount, 0);
  });
});

describe("createBooking: horário e agenda", () => {
  it("recusa serviço desconhecido", async () => {
    const result = await createBooking(baseInput({ serviceSlug: "nao-existe" }), new FakeStore(), NOW);
    assert.deepEqual(result, { error: "Serviço não encontrado", status: 404 });
  });

  it("recusa horário no passado ou agora", async () => {
    const store = new FakeStore();
    for (const start of [sp("2026-09-30T10:00:00"), NOW]) {
      const result = await createBooking(baseInput({ scheduledStart: start }), store, NOW);
      assert.deepEqual(result, { error: "Escolha um horário futuro.", status: 400 });
    }
    assert.equal(store.created.length, 0);
  });

  it("recusa data inválida", async () => {
    const result = await createBooking(baseInput({ scheduledStart: new Date("lixo") }), new FakeStore(), NOW);
    assert.deepEqual(result, { error: "Escolha um horário futuro.", status: 400 });
  });

  it("recusa horários fora da grade (não é 10h nem 15h de SP)", async () => {
    const store = new FakeStore();
    const result = await createBooking(baseInput({ scheduledStart: sp("2026-10-07T03:00:00") }), store, NOW);
    assert.deepEqual(result, { error: "Horário indisponível. Escolha outro horário.", status: 409 });
    assert.equal(store.created.length, 0);
  });

  it("recusa dias em que o estúdio fecha (domingo e segunda)", async () => {
    const store = new FakeStore();
    for (const d of ["2026-10-04", "2026-10-05"]) {
      const result = await createBooking(baseInput({ scheduledStart: sp(`${d}T10:00:00`) }), store, NOW);
      assert.equal("error" in result && result.status, 409, d);
    }
  });

  it("recusa o horário das 15h em serviço longo (microlocs ocupa o dia)", async () => {
    const store = new FakeStore();
    const result = await createBooking(
      baseInput({ serviceSlug: "microlocs", scheduledStart: sp("2026-10-07T15:00:00") }),
      store,
      NOW,
    );
    assert.equal("error" in result && result.status, 409);
  });

  it("recusa datas bloqueadas pelo estúdio", async () => {
    const store = new FakeStore();
    store.blockedDays.add("2026-10-07T00:00:00.000Z");
    const result = await createBooking(baseInput(), store, NOW);
    assert.deepEqual(result, { error: "Horário indisponível. Escolha outro horário.", status: 409 });
    assert.equal(store.created.length, 0);
  });

  it("recusa horário já confirmado por outro cliente", async () => {
    const store = new FakeStore();
    store.bookings.push(makeBooking({ status: "CONFIRMED", scheduledStart: sp("2026-10-07T10:00:00"), scheduledEnd: sp("2026-10-07T15:00:00") }));
    const result = await createBooking(baseInput(), store, NOW);
    assert.equal("error" in result && result.status, 409);
    assert.equal(store.created.length, 0);
  });

  it("recusa horário segurado por pagamento pendente ainda dentro do prazo", async () => {
    const store = new FakeStore();
    store.bookings.push(
      makeBooking({
        status: "PENDING_PAYMENT",
        createdAt: new Date(NOW.getTime() - 30 * 60 * 1000),
        scheduledStart: sp("2026-10-07T10:00:00"),
        scheduledEnd: sp("2026-10-07T15:00:00"),
      }),
    );
    const result = await createBooking(baseInput(), store, NOW);
    assert.equal("error" in result && result.status, 409);
  });

  it("libera o horário de um pagamento pendente que passou do prazo", async () => {
    const store = new FakeStore();
    store.bookings.push(
      makeBooking({
        status: "PENDING_PAYMENT",
        createdAt: new Date(NOW.getTime() - 61 * 60 * 1000),
        scheduledStart: sp("2026-10-07T10:00:00"),
        scheduledEnd: sp("2026-10-07T15:00:00"),
      }),
    );
    const result = await createBooking(baseInput(), store, NOW);
    assert.ok("booking" in result);
  });

  it("não considera agendamentos cancelados ou expirados como ocupados", async () => {
    const store = new FakeStore();
    for (const status of ["CANCELLED", "EXPIRED"] as const) {
      store.bookings.push(makeBooking({ status, scheduledStart: sp("2026-10-07T10:00:00"), scheduledEnd: sp("2026-10-07T15:00:00") }));
    }
    assert.ok("booking" in (await createBooking(baseInput(), store, NOW)));
  });

  it("duas reservas simultâneas: a que perde a disputa no banco recebe 409", async () => {
    const store = new FakeStore();
    store.failWith = new SlotTakenError();
    const result = await createBooking(baseInput(), store, NOW);
    assert.deepEqual(result, { error: "Horário indisponível. Escolha outro horário.", status: 409 });
  });

  it("propaga erros inesperados do banco (não os engole)", async () => {
    const store = new FakeStore();
    store.failWith = new Error("banco fora do ar");
    await assert.rejects(() => createBooking(baseInput(), store, NOW), /banco fora do ar/);
  });

  it("serviço ausente no banco devolve mensagem clara", async () => {
    const store = new FakeStore();
    store.services.clear();
    const result = await createBooking(baseInput(), store, NOW);
    assert.equal("error" in result && result.status, 404);
  });
});
