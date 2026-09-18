// Configuração provisória de horário de funcionamento — ajuste conforme a
// rotina real do estúdio. 0 = domingo ... 6 = sábado.
export const BUSINESS_HOURS: Record<number, { start: string; end: string } | null> = {
  0: null,
  1: null,
  2: { start: "09:00", end: "18:00" },
  3: { start: "09:00", end: "18:00" },
  4: { start: "09:00", end: "18:00" },
  5: { start: "09:00", end: "18:00" },
  6: { start: "09:00", end: "16:00" },
};

export const SLOT_STEP_MINUTES = 60;

type ExistingBooking = { scheduledStart: Date; scheduledEnd: Date };

export function getAvailableStartTimes(
  date: Date,
  serviceDurationHours: number,
  existingBookings: ExistingBooking[],
): Date[] {
  const hours = BUSINESS_HOURS[date.getDay()];
  if (!hours) return [];

  const dayStart = combineDateAndTime(date, hours.start);
  const dayEnd = combineDateAndTime(date, hours.end);
  const durationMs = serviceDurationHours * 60 * 60 * 1000;

  const slots: Date[] = [];
  let cursor = dayStart;

  while (cursor.getTime() + durationMs <= dayEnd.getTime()) {
    const candidateEnd = new Date(cursor.getTime() + durationMs);
    const overlaps = existingBookings.some((booking) =>
      rangesOverlap(cursor, candidateEnd, booking.scheduledStart, booking.scheduledEnd),
    );

    if (!overlaps) slots.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + SLOT_STEP_MINUTES * 60 * 1000);
  }

  return slots;
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
