import { isOpenWeekday, openPeriods } from "../schedule";
import { adminDayColor, freeCells, remainingFor, serviceDayColor, type DayBooking, type DayColor, type RuleBook } from "./engine";

// Calendário do mês: cor de cada dia para o cliente (pelo serviço escolhido)
// e para o painel (o dia como um todo). Puro: os dados vêm de quem chama.

export type DayStatus = DayColor | "closed" | "past" | "blocked";

export type CalendarDay = {
  date: string; // AAAA-MM-DD
  status: DayStatus;
  /** Cliente: quantas vagas do serviço escolhido ainda cabem. */
  remaining?: number;
  /** Painel: cadeiras-período livres (de 4). */
  freeCells?: number;
};

export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  green: "Com vagas",
  yellow: "Poucas vagas",
  red: "Esgotado",
  closed: "Fechado",
  past: "Indisponível",
  blocked: "Fechado",
};

/** "AAAA-MM" válido → dias do mês (meia-noite UTC). */
export function monthDays(month: string): Date[] | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const [year, monthIndex] = [Number(match[1]), Number(match[2]) - 1];
  if (monthIndex < 0 || monthIndex > 11) return null;
  const days: Date[] = [];
  for (let d = new Date(Date.UTC(year, monthIndex, 1)); d.getUTCMonth() === monthIndex; d = new Date(d.getTime() + 86_400_000)) {
    days.push(d);
  }
  return days;
}

export type MonthData = {
  book: RuleBook;
  bookingsByDay: ReadonlyMap<string, DayBooking[]>;
  blockedDays: ReadonlySet<string>;
  now: Date;
};

const keyOf = (day: Date) => day.toISOString().slice(0, 10);

function baseStatus(day: Date, data: MonthData): DayStatus | null {
  if (!isOpenWeekday(day)) return "closed";
  if (openPeriods(day, data.now).length === 0) return "past";
  if (data.blockedDays.has(keyOf(day))) return "blocked";
  return null;
}

/**
 * Calendário do cliente para o serviço escolhido:
 *  - vermelho: nenhuma vaga deste serviço no dia;
 *  - amarelo: já tem cliente marcado no dia e ainda cabe o serviço;
 *  - verde: ninguém marcado e cabe o serviço (mesmo que o serviço só caiba 1 por dia).
 */
export function clientMonth(days: readonly Date[], serviceId: string, data: MonthData): CalendarDay[] {
  return days.map((day) => {
    const date = keyOf(day);
    const status = baseStatus(day, data);
    if (status) return { date, status };
    const existing = data.bookingsByDay.get(date) ?? [];
    const remaining = remainingFor(data.book, existing, serviceId, openPeriods(day, data.now));
    if (serviceDayColor(remaining) === "red") return { date, status: "red", remaining };
    return { date, status: existing.length > 0 ? "yellow" : "green", remaining };
  });
}

/** Calendário do painel (o dia como um todo). */
export function adminMonth(days: readonly Date[], data: MonthData): CalendarDay[] {
  return days.map((day) => {
    const date = keyOf(day);
    const existing = data.bookingsByDay.get(date) ?? [];
    const status = baseStatus(day, data);
    if (status) return { date, status, freeCells: freeCells(data.book, existing) };
    return { date, status: adminDayColor(data.book, existing, openPeriods(day, data.now)), freeCells: freeCells(data.book, existing) };
  });
}
