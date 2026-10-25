import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { refundPayment, refundPaymentPartially } from "./mercadopago";
import { SlotTakenError, type BookingCreationRepo, type BookingCreationStore } from "./bookingCreation";
import { bookingStillFits, loadDayBookings, loadRuleBook, lockAgendaDay } from "./capacity/store";
import { cancelBooking, type CancelInitiator, type CancellationStore, type RefundGateway } from "./cancellation";
import { expireStaleBookings, type ExpiryStore } from "./bookingExpiry";
import { processApprovedPayment, type PaymentProcessingStore } from "./paymentProcessing";

// Adaptadores de produção (Prisma + Mercado Pago) para os núcleos de regra de
// negócio. A lógica em si fica nos módulos puros, que são testados com fakes.

function makeCreationRepo(db: Prisma.TransactionClient): BookingCreationRepo {
  return {
    findService: (slug) =>
      db.service.findUnique({ where: { slug }, select: { id: true, slug: true, maxHours: true, active: true } }),
    lockDay: (dayKey) => lockAgendaDay(db, dayKey),
    async isFullDayBlocked(day) {
      const blocked = await db.blockedDate.findUnique({ where: { date: day } });
      return Boolean(blocked?.fullDay);
    },
    loadRuleBook: () => loadRuleBook(db),
    listActiveDayBookings: (day, now) => loadDayBookings(db, day, now),
    create(data) {
      return db.booking.create({ data });
    },
  };
}

// A agenda do dia é travada (pg_advisory_xact_lock) dentro da transação: duas
// reservas simultâneas para o mesmo dia são decididas uma depois da outra.
// P2034 (conflito de serialização) continua tratado por segurança.
export const prismaBookingCreationStore: BookingCreationStore = {
  async transaction(fn) {
    try {
      return await prisma.$transaction((tx) => fn(makeCreationRepo(tx)), { timeout: 15_000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new SlotTakenError();
      }
      throw error;
    }
  },
};

export const mercadoPagoRefundGateway: RefundGateway = {
  async refund(mpPaymentId, idempotencyKey) {
    await refundPayment(mpPaymentId, idempotencyKey);
  },
  async refundPartial(mpPaymentId, amount, idempotencyKey) {
    await refundPaymentPartially(mpPaymentId, amount, idempotencyKey);
  },
};

const prismaCancellationStore: CancellationStore = {
  findBooking: (id) => prisma.booking.findUnique({ where: { id } }),
  async findApprovedDeposit(bookingId) {
    // Sinal ou valor total aprovado (duplicidades já são estornadas no webhook).
    const payment = await prisma.payment.findFirst({
      where: { bookingId, type: { in: ["DEPOSIT", "FULL"] }, status: "APPROVED", mpPaymentId: { not: null } },
      orderBy: { createdAt: "asc" },
    });
    if (!payment?.mpPaymentId) return null;
    return {
      id: payment.id,
      mpPaymentId: payment.mpPaymentId,
      type: payment.type === "FULL" ? "FULL" : "DEPOSIT",
      amount: Number(payment.amount),
      refundedAmount: payment.refundedAmount === null ? 0 : Number(payment.refundedAmount),
    };
  },
  async markPartialRefund(paymentId, refundedTotal) {
    await prisma.payment.update({ where: { id: paymentId }, data: { refundedAmount: refundedTotal } });
  },
  async claimCancellation(bookingId, data) {
    const { count } = await prisma.booking.updateMany({
      where: { id: bookingId, status: { in: ["PENDING_PAYMENT", "CONFIRMED"] } },
      data: {
        status: "CANCELLED",
        cancelledAt: data.cancelledAt,
        cancellationRefundedDeposit: data.refundEligible,
      },
    });
    if (count === 0) return null;
    return prisma.booking.findUnique({ where: { id: bookingId } });
  },
  async markDepositRefunded(paymentId) {
    await prisma.payment.updateMany({
      where: { id: paymentId, status: { not: "REFUNDED" } },
      data: { status: "REFUNDED" },
    });
  },
};

export function cancelBookingById(bookingId: string, initiator: CancelInitiator = "client") {
  return cancelBooking({ bookingId, initiator }, prismaCancellationStore, mercadoPagoRefundGateway);
}

const prismaExpiryStore: ExpiryStore = {
  async findPendingCreatedUntil(cutoff) {
    const bookings = await prisma.booking.findMany({
      where: { status: "PENDING_PAYMENT", createdAt: { lte: cutoff } },
      select: {
        id: true,
        paymentDueAt: true,
        payments: { where: { status: "APPROVED" }, select: { id: true }, take: 1 },
      },
    });
    return bookings.map((b) => ({
      id: b.id,
      hasApprovedPayment: b.payments.length > 0,
      paymentDueAt: b.paymentDueAt,
    }));
  },
  async expire(bookingId, now) {
    const { count } = await prisma.booking.updateMany({
      // Nunca expira um agendamento cujo prazo foi estendido e ainda vale.
      where: {
        id: bookingId,
        status: "PENDING_PAYMENT",
        OR: [{ paymentDueAt: null }, { paymentDueAt: { lte: now } }],
      },
      data: { status: "EXPIRED" },
    });
    return count > 0;
  },
};

export function expireStaleBookingsNow(now: Date = new Date()) {
  return expireStaleBookings(prismaExpiryStore, now);
}

const prismaPaymentProcessingStore: PaymentProcessingStore = {
  findBooking: (id) => prisma.booking.findUnique({ where: { id } }),
  async confirmIfPending(bookingId) {
    const { count } = await prisma.booking.updateMany({
      where: { id: bookingId, status: "PENDING_PAYMENT" },
      data: { status: "CONFIRMED" },
    });
    return count > 0;
  },
  async hasOtherActiveBooking(booking, now) {
    return !(await bookingStillFits(prisma, booking, now));
  },
  async reactivate(bookingId) {
    const { count } = await prisma.booking.updateMany({
      where: { id: bookingId, status: { in: ["PENDING_PAYMENT", "EXPIRED"] } },
      data: { status: "CONFIRMED" },
    });
    return count > 0;
  },
  findPaymentByMpId: (mpPaymentId) =>
    prisma.payment.findUnique({ where: { mpPaymentId }, select: { id: true, status: true } }),
  async markPaymentRefunded(paymentId) {
    await prisma.payment.updateMany({
      where: { id: paymentId, status: { not: "REFUNDED" } },
      data: { status: "REFUNDED" },
    });
  },
};

export function processApprovedPaymentNow(
  params: { bookingId: string; mpPaymentId: string },
  gateway: RefundGateway = mercadoPagoRefundGateway,
) {
  return processApprovedPayment(params, prismaPaymentProcessingStore, gateway);
}
