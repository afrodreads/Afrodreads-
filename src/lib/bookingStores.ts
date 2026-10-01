import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { refundPayment } from "./mercadopago";
import { activeBookingWhere } from "./bookingRules";
import { SlotTakenError, type BookingCreationRepo, type BookingCreationStore } from "./bookingCreation";
import { cancelBooking, type CancelInitiator, type CancellationStore, type RefundGateway } from "./cancellation";
import { expireStaleBookings, type ExpiryStore } from "./bookingExpiry";
import { processApprovedPayment, type PaymentProcessingStore } from "./paymentProcessing";

// Adaptadores de produção (Prisma + Mercado Pago) para os núcleos de regra de
// negócio. A lógica em si fica nos módulos puros, que são testados com fakes.

function overlapping(start: Date, end: Date): Prisma.BookingWhereInput {
  return { scheduledStart: { lt: end }, scheduledEnd: { gt: start } };
}

function makeCreationRepo(db: Prisma.TransactionClient): BookingCreationRepo {
  return {
    async findServiceIdBySlug(slug) {
      const service = await db.service.findUnique({ where: { slug }, select: { id: true } });
      return service?.id ?? null;
    },
    async isFullDayBlocked(day) {
      const blocked = await db.blockedDate.findUnique({ where: { date: day } });
      return Boolean(blocked?.fullDay);
    },
    countActiveOverlapping(start, end, now) {
      return db.booking.count({ where: { AND: [activeBookingWhere(now), overlapping(start, end)] } });
    },
    create(data) {
      return db.booking.create({ data });
    },
  };
}

// Serializable: duas reservas simultâneas para o mesmo horário não passam as
// duas pela checagem de conflito; o banco recusa uma delas (P2034).
export const prismaBookingCreationStore: BookingCreationStore = {
  async transaction(fn) {
    try {
      return await prisma.$transaction((tx) => fn(makeCreationRepo(tx)), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
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
};

const prismaCancellationStore: CancellationStore = {
  findBooking: (id) => prisma.booking.findUnique({ where: { id } }),
  async findApprovedDeposit(bookingId) {
    const payment = await prisma.payment.findFirst({
      where: { bookingId, type: "DEPOSIT", status: "APPROVED", mpPaymentId: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    return payment?.mpPaymentId ? { id: payment.id, mpPaymentId: payment.mpPaymentId } : null;
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
    const count = await prisma.booking.count({
      where: {
        AND: [
          { id: { not: booking.id } },
          activeBookingWhere(now),
          overlapping(booking.scheduledStart, booking.scheduledEnd),
        ],
      },
    });
    return count > 0;
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

export function processApprovedPaymentNow(params: { bookingId: string; mpPaymentId: string }) {
  return processApprovedPayment(params, prismaPaymentProcessingStore, mercadoPagoRefundGateway);
}
