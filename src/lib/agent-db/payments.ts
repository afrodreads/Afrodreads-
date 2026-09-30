import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { UniqueConflictError } from "../conversations/errors";
import { activeBookingWhere } from "../bookingRules";
import type { StaffDirectory } from "../agent/actors";
import type { ManualPaymentRecord, ManualPaymentStore } from "../agent/manualPayment";
import type { PaymentHoldRecord, PaymentHoldStore } from "../agent/paymentHold";
import { isUniqueViolation } from "./shared";

// Persistência da confirmação manual de pagamento e da extensão de prazo. Cada
// ação é UMA transação: status/prazo do agendamento + auditoria (+ evento SYSTEM
// na fila, no caso da confirmação). Nada aqui é chamado pela IA.

export const prismaStaffDirectory: StaffDirectory = {
  findStaff: (id) =>
    prisma.staffUser.findUnique({ where: { id }, select: { id: true, name: true, role: true, unitId: true, active: true } }),
};

function toConfirmation(row: {
  bookingId: string;
  amount: Prisma.Decimal;
  method: ManualPaymentRecord["method"];
  confirmedById: string;
  confirmedAt: Date;
  reference: string | null;
  previousStatus: string;
  idempotencyKey: string;
}): ManualPaymentRecord {
  return {
    bookingId: row.bookingId,
    amountBrl: Number(row.amount),
    method: row.method,
    confirmedById: row.confirmedById,
    confirmedAt: row.confirmedAt,
    reference: row.reference,
    previousStatus: row.previousStatus,
    newStatus: "CONFIRMED",
    idempotencyKey: row.idempotencyKey,
  };
}

export const prismaManualPaymentStore: ManualPaymentStore = {
  ...prismaStaffDirectory,

  async findBooking(id) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        unitId: true,
        depositAmount: true,
        createdAt: true,
        paymentDueAt: true,
        scheduledStart: true,
        scheduledEnd: true,
      },
    });
    return booking ? { ...booking, depositAmountBrl: Number(booking.depositAmount) } : null;
  },

  async findConfirmationByIdempotencyKey(key) {
    const row = await prisma.paymentConfirmation.findUnique({ where: { idempotencyKey: key } });
    return row ? toConfirmation(row) : null;
  },

  async hasOtherActiveBooking(booking, now) {
    const count = await prisma.booking.count({
      where: {
        AND: [
          { id: { not: booking.id } },
          activeBookingWhere(now),
          { scheduledStart: { lt: booking.scheduledEnd }, scheduledEnd: { gt: booking.scheduledStart } },
        ],
      },
    });
    return count > 0;
  },

  async confirm({ fromStatuses, record, event }) {
    try {
      return await prisma.$transaction(async (tx) => {
        const { count } = await tx.booking.updateMany({
          where: { id: record.bookingId, status: { in: fromStatuses } },
          data: { status: "CONFIRMED" },
        });
        if (count === 0) return false;
        await tx.paymentConfirmation.create({
          data: {
            idempotencyKey: record.idempotencyKey,
            bookingId: record.bookingId,
            amount: record.amountBrl,
            method: record.method,
            confirmedById: record.confirmedById,
            confirmedAt: record.confirmedAt,
            reference: record.reference,
            previousStatus: record.previousStatus as Prisma.PaymentConfirmationCreateInput["previousStatus"],
            newStatus: record.newStatus,
          },
        });
        // Outbox: o evento entra na fila na MESMA transação (um por agendamento).
        await tx.systemEvent.upsert({
          where: { idempotencyKey: event.idempotencyKey },
          create: { ...event },
          update: {},
        });
        return true;
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new UniqueConflictError();
      throw error;
    }
  },
};

function toHold(row: {
  bookingId: string;
  previousDeadline: Date;
  newDeadline: Date;
  reason: string;
  extendedById: string;
  createdAt: Date;
  idempotencyKey: string;
}): PaymentHoldRecord {
  return {
    bookingId: row.bookingId,
    previousDeadline: row.previousDeadline,
    newDeadline: row.newDeadline,
    reason: row.reason,
    extendedById: row.extendedById,
    extendedAt: row.createdAt,
    idempotencyKey: row.idempotencyKey,
  };
}

export const prismaPaymentHoldStore: PaymentHoldStore = {
  ...prismaStaffDirectory,

  findBooking: (id) =>
    prisma.booking.findUnique({
      where: { id },
      select: { id: true, status: true, unitId: true, createdAt: true, scheduledStart: true, paymentDueAt: true },
    }),

  async findHoldByIdempotencyKey(key) {
    const row = await prisma.paymentHold.findUnique({ where: { idempotencyKey: key } });
    return row ? toHold(row) : null;
  },

  async applyHold({ expectedDueAt, record }) {
    try {
      return await prisma.$transaction(async (tx) => {
        const { count } = await tx.booking.updateMany({
          where: { id: record.bookingId, status: "PENDING_PAYMENT", paymentDueAt: expectedDueAt },
          data: { paymentDueAt: record.newDeadline },
        });
        if (count === 0) return false;
        await tx.paymentHold.create({
          data: {
            idempotencyKey: record.idempotencyKey,
            bookingId: record.bookingId,
            previousDeadline: record.previousDeadline,
            newDeadline: record.newDeadline,
            reason: record.reason,
            extendedById: record.extendedById,
            createdAt: record.extendedAt,
          },
        });
        return true;
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new UniqueConflictError();
      throw error;
    }
  },
};
