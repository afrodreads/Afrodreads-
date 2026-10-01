import { getSaoPauloParts, zonedTimeToUtc } from "./timezone";

// Dias em que o estúdio atende. 0 = domingo ... 6 = sábado.
const OPEN_WEEKDAYS = new Set([2, 3, 4, 5, 6]);

// A agenda tem só dois horários fixos por dia: 10h e 15h (horário de São
// Paulo). O segundo horário só é oferecido quando o procedimento dura menos
// de 8h — serviços de 8h ou mais tomam o dia inteiro, então só cabe um
// atendimento.
export const FIRST_SLOT_TIME = "10:00";
export const SECOND_SLOT_TIME = "15:00";
export const LONG_SERVICE_THRESHOLD_HOURS = 8;

type ExistingBooking = { scheduledStart: Date; scheduledEnd: Date };

/**
 * `date` é a meia-noite UTC do dia de calendário consultado (formato usado
 * pela API de agenda e por BlockedDate). Os horários devolvidos são instantes
 * reais, calculados no fuso de São Paulo.
 */
export function getAvailableStartTimes(
  date: Date,
  serviceDurationHours: number,
  existingBookings: ExistingBooking[],
): Date[] {
  if (!OPEN_WEEKDAYS.has(date.getUTCDay())) return [];

  const candidateTimes = [FIRST_SLOT_TIME];
  if (serviceDurationHours < LONG_SERVICE_THRESHOLD_HOURS) {
    candidateTimes.push(SECOND_SLOT_TIME);
  }

  const durationMs = serviceDurationHours * 60 * 60 * 1000;
  const slots: Date[] = [];

  for (const time of candidateTimes) {
    const start = combineDateAndTime(date, time);
    const candidateEnd = new Date(start.getTime() + durationMs);

    const overlaps = existingBookings.some((booking) =>
      rangesOverlap(start, candidateEnd, booking.scheduledStart, booking.scheduledEnd),
    );

    if (!overlaps) slots.push(start);
  }

  return slots;
}

/**
 * Diz se `start` é um horário que a agenda oferece para o serviço (dia da
 * semana aberto e um dos horários fixos), ignorando reservas existentes.
 */
export function isOfferedStartTime(start: Date, serviceDurationHours: number): boolean {
  const p = getSaoPauloParts(start);
  const day = new Date(Date.UTC(p.year, p.month - 1, p.day));
  return getAvailableStartTimes(day, serviceDurationHours, []).some(
    (slot) => slot.getTime() === start.getTime(),
  );
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  return zonedTimeToUtc({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: hours,
    minute: minutes,
  });
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
