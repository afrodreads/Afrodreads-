import type { Prisma } from "@prisma/client";
import { activeBookingWhere } from "../bookingRules";
import { bookingPeriod } from "../schedule";
import { saoPauloDateKey, saoPauloDayAsUtcMidnight } from "../timezone";
import { checkAdd, type DayBooking, type RuleBook } from "./engine";
import { buildRuleBook } from "./ruleBook";

// Leitura das regras e dos agendamentos ativos do banco para o motor de capacidade.

type Db = Pick<Prisma.TransactionClient, "service" | "serviceCompanion" | "booking">;

export async function loadRuleBook(db: Db): Promise<RuleBook> {
  const [services, companions] = await Promise.all([
    db.service.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        active: true,
        chairs: true,
        staff: true,
        fullDay: true,
        maxPerPeriod: true,
        maxPerDay: true,
        startsMorning: true,
        startsAfternoon: true,
      },
    }),
    db.serviceCompanion.findMany({ select: { serviceId: true, companionId: true, sharesChair: true } }),
  ]);
  return buildRuleBook(services, companions);
}

/**
 * Agendamentos que ocupam a agenda (confirmados ou dentro do prazo de
 * pagamento), agrupados por dia de São Paulo ("AAAA-MM-DD").
 */
export async function loadActiveBookingsByDay(
  db: Db,
  range: { from: Date; to: Date },
  now: Date,
  excludeBookingId?: string,
): Promise<Map<string, DayBooking[]>> {
  const rows = await db.booking.findMany({
    where: {
      AND: [
        activeBookingWhere(now),
        { scheduledStart: { gte: range.from, lt: range.to } },
        ...(excludeBookingId ? [{ id: { not: excludeBookingId } }] : []),
      ],
    },
    select: { id: true, serviceId: true, scheduledStart: true, period: true, forced: true },
  });
  const byDay = new Map<string, DayBooking[]>();
  for (const row of rows) {
    const key = saoPauloDateKey(row.scheduledStart);
    const list = byDay.get(key) ?? [];
    list.push({ id: row.id, serviceId: row.serviceId, period: bookingPeriod(row), forced: row.forced });
    byDay.set(key, list);
  }
  return byDay;
}

/** Intervalo amplo o bastante para pegar todos os agendamentos do dia de calendário `day` (meia-noite UTC). */
export function dayRange(day: Date): { from: Date; to: Date } {
  // O dia de SP vai de 03h UTC a 03h UTC do dia seguinte; a margem cobre o horário de verão.
  return { from: new Date(day.getTime()), to: new Date(day.getTime() + 2 * 24 * 60 * 60 * 1000) };
}

/** Regras, agendamentos ativos e dias bloqueados de um mês (para o calendário). */
export async function loadMonthData(
  db: Db & Pick<Prisma.TransactionClient, "blockedDate">,
  days: readonly Date[],
  now: Date,
): Promise<{ book: RuleBook; bookingsByDay: Map<string, DayBooking[]>; blockedDays: Set<string>; now: Date }> {
  const from = days[0];
  const to = new Date(days[days.length - 1].getTime() + 2 * 24 * 60 * 60 * 1000);
  const [book, bookingsByDay, blocked] = await Promise.all([
    loadRuleBook(db),
    loadActiveBookingsByDay(db, { from, to }, now),
    db.blockedDate.findMany({ where: { date: { gte: from, lt: to }, fullDay: true }, select: { date: true } }),
  ]);
  return { book, bookingsByDay, blockedDays: new Set(blocked.map((row) => row.date.toISOString().slice(0, 10))), now };
}

/** Agendamentos ativos do dia de calendário `day` (meia-noite UTC). */
export async function loadDayBookings(db: Db, day: Date, now: Date, excludeBookingId?: string): Promise<DayBooking[]> {
  const byDay = await loadActiveBookingsByDay(db, dayRange(day), now, excludeBookingId);
  return byDay.get(day.toISOString().slice(0, 10)) ?? [];
}

/**
 * O agendamento ainda cabe na agenda do dia (sem contar ele mesmo)? Usado no
 * pagamento atrasado e na confirmação manual. Encaixes forçados sempre cabem.
 */
export async function bookingStillFits(
  db: Db,
  booking: { id: string; serviceId: string; scheduledStart: Date; period?: DayBooking["period"] | null; forced?: boolean },
  now: Date,
): Promise<boolean> {
  if (booking.forced) return true;
  const day = saoPauloDayAsUtcMidnight(booking.scheduledStart);
  const [rules, existing] = await Promise.all([loadRuleBook(db), loadDayBookings(db, day, now, booking.id)]);
  // Um serviço desativado depois da reserva não derruba quem já reservou.
  const rule = rules.get(booking.serviceId);
  const book = rule && !rule.active ? new Map(rules).set(booking.serviceId, { ...rule, active: true }) : rules;
  return checkAdd(book, existing, booking.serviceId, bookingPeriod(booking)).ok;
}

/**
 * Trava a agenda do dia até o fim da transação (pg_advisory_xact_lock): duas
 * reservas simultâneas para o mesmo dia são decididas uma depois da outra.
 */
export async function lockAgendaDay(db: Pick<Prisma.TransactionClient, "$queryRaw">, dayKey: string): Promise<void> {
  await db.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${`agenda:${dayKey}`}))) AS l`;
}
