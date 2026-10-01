import type { Prisma } from "@prisma/client";

// Quanto tempo um agendamento "aguardando pagamento" segura o horário na
// agenda. Passado o prazo, o horário volta a ficar livre (mesmo que a rotina
// diária ainda não tenha marcado o agendamento como EXPIRED) — a agenda e a
// criação de agendamentos sempre consultam `activeBookingWhere`.
//
// Exceção (Fase 3): a equipe pode estender o prazo de UM agendamento
// (PaymentHold), gravando o novo prazo em `Booking.paymentDueAt`. Nulo = vale a
// regra geral. A extensão nunca encurta o prazo geral.
export const BOOKING_PAYMENT_TTL_MINUTES = 60;

const MINUTE_MS = 60 * 1000;

export function paymentDeadline(createdAt: Date): Date {
  return new Date(createdAt.getTime() + BOOKING_PAYMENT_TTL_MINUTES * MINUTE_MS);
}

type PaymentWindowBooking = { createdAt: Date; paymentDueAt?: Date | null };

/** Prazo que vale para o agendamento: o maior entre a regra geral e a extensão da equipe. */
export function effectivePaymentDeadline(booking: PaymentWindowBooking): Date {
  const general = paymentDeadline(booking.createdAt);
  const extended = booking.paymentDueAt;
  return extended && extended.getTime() > general.getTime() ? extended : general;
}

/** Agendamentos aguardando pagamento criados até este instante já passaram do prazo geral. */
export function pendingPaymentCutoff(now: Date): Date {
  return new Date(now.getTime() - BOOKING_PAYMENT_TTL_MINUTES * MINUTE_MS);
}

export function isPaymentWindowOpen(booking: PaymentWindowBooking & { status: string }, now: Date): boolean {
  return booking.status === "PENDING_PAYMENT" && effectivePaymentDeadline(booking).getTime() > now.getTime();
}

/** Agendamentos que realmente ocupam horário: confirmados ou ainda dentro do prazo de pagamento. */
export function activeBookingWhere(now: Date): Prisma.BookingWhereInput {
  return {
    OR: [
      { status: "CONFIRMED" },
      { status: "PENDING_PAYMENT", createdAt: { gt: pendingPaymentCutoff(now) } },
      { status: "PENDING_PAYMENT", paymentDueAt: { gt: now } },
    ],
  };
}
