import type { Period } from "./capacity/engine";
import { getSaoPauloParts, saoPauloDayAsUtcMidnight, zonedTimeToUtc } from "./timezone";

// Grade da agenda: terça a sábado, dois períodos por dia (horário de São Paulo).
// Quem cabe em cada período é decidido pelo motor de capacidade
// (src/lib/capacity/engine.ts) com as regras do cadastro de serviços.

// Dias em que o estúdio atende. 0 = domingo ... 6 = sábado.
const OPEN_WEEKDAYS = new Set([2, 3, 4, 5, 6]);

export const PERIOD_START_TIME: Record<Period, string> = { MORNING: "10:00", AFTERNOON: "15:00" };
export const PERIOD_LABEL: Record<Period, string> = { MORNING: "Manhã", AFTERNOON: "Tarde" };

/** `day` = meia-noite UTC do dia de calendário (formato da API de agenda e de BlockedDate). */
export function isOpenWeekday(day: Date): boolean {
  return OPEN_WEEKDAYS.has(day.getUTCDay());
}

/** Instante real de início do período no dia de calendário `day`. */
export function periodStart(day: Date, period: Period): Date {
  const [hour, minute] = PERIOD_START_TIME[period].split(":").map(Number);
  return zonedTimeToUtc({
    year: day.getUTCFullYear(),
    month: day.getUTCMonth() + 1,
    day: day.getUTCDate(),
    hour,
    minute,
  });
}

/** Período de um horário de início (10h = manhã, 15h = tarde); `null` fora da grade. */
export function periodOfStart(start: Date): Period | null {
  const p = getSaoPauloParts(start);
  const time = `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
  if (time === PERIOD_START_TIME.MORNING) return "MORNING";
  if (time === PERIOD_START_TIME.AFTERNOON) return "AFTERNOON";
  return null;
}

/** Período de um agendamento existente (agendamentos antigos não gravaram o período). */
export function bookingPeriod(booking: { period?: Period | null; scheduledStart: Date }): Period {
  return booking.period ?? periodOfStart(booking.scheduledStart) ?? (getSaoPauloParts(booking.scheduledStart).hour < 13 ? "MORNING" : "AFTERNOON");
}

/** O horário pertence à grade (dia aberto + 10h ou 15h)? Devolve o período. */
export function offeredPeriod(start: Date): Period | null {
  const period = periodOfStart(start);
  if (!period || !isOpenWeekday(saoPauloDayAsUtcMidnight(start))) return null;
  return period;
}

/** Períodos ainda oferecíveis no dia: dia aberto e horário ainda no futuro. */
export function openPeriods(day: Date, now: Date): Period[] {
  if (!isOpenWeekday(day)) return [];
  return (["MORNING", "AFTERNOON"] as const).filter((period) => periodStart(day, period).getTime() > now.getTime());
}
