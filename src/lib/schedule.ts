// Dias em que o estúdio atende. 0 = domingo ... 6 = sábado.
const OPEN_WEEKDAYS = new Set([2, 3, 4, 5, 6]);

// A agenda tem só dois horários fixos por dia: 10h e 15h. O segundo horário
// só é oferecido quando o procedimento dura menos de 8h — serviços de 8h ou
// mais tomam o dia inteiro, então só cabe um atendimento.
export const FIRST_SLOT_TIME = "10:00";
export const SECOND_SLOT_TIME = "15:00";
export const LONG_SERVICE_THRESHOLD_HOURS = 8;

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
