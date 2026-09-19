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

// Horários de início permitidos para agendamento — o estúdio só recebe
// clientes nesses horários, mesmo com o expediente indo até mais tarde.
export const ALLOWED_START_TIMES = ["10:00", "11:00", "13:00", "14:00"];

// America/Sao_Paulo está em UTC-3 o ano todo desde a extincao do horario de
// verao no Brasil em 2019. `date` chega como meia-noite UTC do dia
// solicitado (ver api/availability), entao usamos os campos UTC para achar
// o dia da semana e somamos o offset para gerar os instantes corretos.
const SAO_PAULO_UTC_OFFSET_HOURS = 3;

type ExistingBooking = { scheduledStart: Date; scheduledEnd: Date };

export function getAvailableStartTimes(
  date: Date,
  serviceDurationHours: number,
  existingBookings: ExistingBooking[],
): Date[] {
  const hours = BUSINESS_HOURS[date.getUTCDay()];
  if (!hours) return [];

  const dayEnd = combineDateAndTime(date, hours.end);
  const durationMs = serviceDurationHours * 60 * 60 * 1000;

  const slots: Date[] = [];

  for (const time of ALLOWED_START_TIMES) {
    const start = combineDateAndTime(date, time);
    const candidateEnd = new Date(start.getTime() + durationMs);
    if (candidateEnd.getTime() > dayEnd.getTime()) continue;

    const overlaps = existingBookings.some((booking) =>
      rangesOverlap(start, candidateEnd, booking.scheduledStart, booking.scheduledEnd),
    );

    if (!overlaps) slots.push(start);
  }

  return slots;
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hours + SAO_PAULO_UTC_OFFSET_HOURS,
      minutes,
    ),
  );
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
