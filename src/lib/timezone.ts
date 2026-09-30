// Toda regra de negócio baseada em data/hora (sinal de dezembro, prazo de
// devolução, agenda, "hoje" no painel) usa o relógio de São Paulo, nunca o
// fuso do servidor: na Vercel o runtime roda em UTC.
export const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

export type SaoPauloParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  weekday: number; // 0 = domingo ... 6 = sábado
};

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SAO_PAULO_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  weekday: "short",
});

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function getSaoPauloParts(date: Date): SaoPauloParts {
  const values: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(date)) values[part.type] = part.value;
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour) % 24,
    minute: Number(values.minute),
    weekday: WEEKDAY_INDEX[values.weekday],
  };
}

function wallClockAsUtc(date: Date): number {
  const p = getSaoPauloParts(date);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
}

/** Converte um horário "de parede" de São Paulo para o instante UTC correspondente. */
export function zonedTimeToUtc(wall: { year: number; month: number; day: number; hour?: number; minute?: number }): Date {
  const guess = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour ?? 0, wall.minute ?? 0);
  const firstOffset = wallClockAsUtc(new Date(guess)) - guess;
  let result = guess - firstOffset;
  const secondOffset = wallClockAsUtc(new Date(result)) - result;
  if (secondOffset !== firstOffset) result = guess - secondOffset;
  return new Date(result);
}

/** Meia-noite (00:00) de São Paulo do dia em que `date` cai. */
export function startOfSaoPauloDay(date: Date): Date {
  const p = getSaoPauloParts(date);
  return zonedTimeToUtc({ year: p.year, month: p.month, day: p.day });
}

/** Dias de calendário (em SP) de `from` até `to`. Negativo se `to` for antes. */
export function saoPauloCalendarDaysBetween(from: Date, to: Date): number {
  const a = getSaoPauloParts(from);
  const b = getSaoPauloParts(to);
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / dayMs);
}

/** "AAAA-MM-DD" do dia de São Paulo em que `date` cai. */
export function saoPauloDateKey(date: Date): string {
  const p = getSaoPauloParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Meia-noite UTC do dia de calendário de SP (formato usado por BlockedDate e pela API de agenda). */
export function saoPauloDayAsUtcMidnight(date: Date): Date {
  const p = getSaoPauloParts(date);
  return new Date(Date.UTC(p.year, p.month - 1, p.day));
}

/** Valida "AAAA-MM-DD" e devolve a meia-noite UTC desse dia, ou null se for inválido. */
export function parseDateKey(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? date : null;
}
