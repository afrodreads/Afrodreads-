import type { Booking } from "@prisma/client";

// Utilitários só dos testes (este arquivo não é importado pelo app).

/** Instante explícito no horário de São Paulo (-03:00). */
export const sp = (iso: string) => new Date(`${iso}-03:00`);

let counter = 0;

export function makeBooking(overrides: Partial<Booking> = {}): Booking {
  counter += 1;
  return {
    id: `booking-${counter}`,
    clientName: "Cliente Teste",
    clientEmail: "cliente@example.com",
    clientPhone: "11999999999",
    serviceId: "service-1",
    scheduledStart: sp("2026-10-07T10:00:00"),
    scheduledEnd: sp("2026-10-07T15:00:00"),
    isOutOfTownSeason: false,
    servicePrice: 400 as unknown as Booking["servicePrice"],
    depositAmount: 50 as unknown as Booking["depositAmount"],
    depositIsPercentage: false,
    remainingAmount: 350 as unknown as Booking["remainingAmount"],
    status: "CONFIRMED",
    notes: null,
    cancelledAt: null,
    cancellationRefundedDeposit: null,
    createdAt: sp("2026-09-20T12:00:00"),
    updatedAt: sp("2026-09-20T12:00:00"),
    ...overrides,
  } as Booking;
}
