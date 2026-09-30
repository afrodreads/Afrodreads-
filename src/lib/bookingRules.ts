import type { Prisma } from "@prisma/client";

// Quanto tempo um agendamento "aguardando pagamento" segura o horário na
// agenda. Passado o prazo, o horário volta a ficar livre (mesmo que a rotina
// diária ainda não tenha marcado o agendamento como EXPIRED) — a agenda e a
// criação de agendamentos sempre consultam `activeBookingWhere`.
export const BOOKING_PAYMENT_TTL_MINUTES = 60;

const MINUTE_MS = 60 * 1000;

export function paymentDeadline(createdAt: Date): Date {
  return new Date(createdAt.getTime() + BOOKING_PAYMENT_TTL_MINUTES * MINUTE_MS);
}

/** Agendamentos aguardando pagamento criados até este instante já passaram do prazo. */
export function pendingPaymentCutoff(now: Date): Date {
  return new Date(now.getTime() - BOOKING_PAYMENT_TTL_MINUTES * MINUTE_MS);
}

export function isPaymentWindowOpen(booking: { status: string; createdAt: Date }, now: Date): boolean {
  return booking.status === "PENDING_PAYMENT" && paymentDeadline(booking.createdAt).getTime() > now.getTime();
}

/** Agendamentos que realmente ocupam horário: confirmados ou ainda dentro do prazo de pagamento. */
export function activeBookingWhere(now: Date): Prisma.BookingWhereInput {
  return {
    OR: [
      { status: "CONFIRMED" },
      { status: "PENDING_PAYMENT", createdAt: { gt: pendingPaymentCutoff(now) } },
    ],
  };
}
