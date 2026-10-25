import type { Booking } from "@prisma/client";
import { calculateDeposit } from "./pricing";
import { offeredPeriod, periodOfStart } from "./schedule";
import { saoPauloDateKey, saoPauloDayAsUtcMidnight } from "./timezone";
import { checkAdd, type DayBooking, type Period, type Rejection, type RuleBook } from "./capacity/engine";

// Núcleo da criação de agendamento, sem acesso direto ao banco: quem chama
// injeta o `store` (Prisma em produção, um fake nos testes).
//
// IMPORTANTE: `servicePrice` é confiado aqui. Ele só pode vir do servidor
// (ex.: o valor gravado no orçamento), NUNCA de um corpo de requisição
// público — por isso POST /api/bookings foi desativado.
//
// Capacidade: quem decide se o serviço cabe no dia é o motor de capacidade
// (src/lib/capacity/engine.ts) com as regras do cadastro de serviços. A agenda
// do dia fica travada durante a transação, então duas clientes nunca reservam
// a última vaga ao mesmo tempo.

/** Encaixe pelo painel (só administradores): `force` ignora as regras de capacidade. */
export type AdminBookingOptions = {
  force: boolean;
  reason: string | null;
  status: "PENDING_PAYMENT" | "CONFIRMED";
};

export type CreateBookingInput = {
  serviceSlug: string;
  scheduledStart: Date;
  servicePrice: number;
  isOutOfTownSeason: boolean;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes?: string;
  admin?: AdminBookingOptions;
};

export type CreateBookingResult =
  | { booking: Booking }
  | { error: string; status: number; reason?: Rejection | "blocked_day" | "outside_grid" };

export type NewBookingData = {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  period: Period;
  isOutOfTownSeason: boolean;
  servicePrice: number;
  depositAmount: number;
  depositIsPercentage: boolean;
  remainingAmount: number;
  notes?: string;
  status: "PENDING_PAYMENT" | "CONFIRMED";
  forced: boolean;
  forcedReason: string | null;
};

export type ServiceForBooking = { id: string; slug: string; maxHours: number; active: boolean };

export interface BookingCreationRepo {
  findService(slug: string): Promise<ServiceForBooking | null>;
  /** Trava a agenda do dia ("AAAA-MM-DD") até o fim da transação. */
  lockDay(dayKey: string): Promise<void>;
  isFullDayBlocked(day: Date): Promise<boolean>;
  loadRuleBook(): Promise<RuleBook>;
  /** Agendamentos que ocupam a agenda no dia de calendário `day` (meia-noite UTC). */
  listActiveDayBookings(day: Date, now: Date): Promise<DayBooking[]>;
  create(data: NewBookingData): Promise<Booking>;
}

export interface BookingCreationStore {
  transaction<T>(fn: (repo: BookingCreationRepo) => Promise<T>): Promise<T>;
}

/** Lançado pelo store quando o banco detecta duas reservas concorrentes para o mesmo horário. */
export class SlotTakenError extends Error {
  constructor() {
    super("Horário já reservado");
    this.name = "SlotTakenError";
  }
}

const MAX_SERVICE_PRICE_BRL = 100_000;
export const UNAVAILABLE = "Horário indisponível. Escolha outro horário.";

export async function createBooking(
  input: CreateBookingInput,
  store: BookingCreationStore,
  now: Date = new Date(),
): Promise<CreateBookingResult> {
  const forced = input.admin?.force === true;

  if (!Number.isFinite(input.servicePrice) || input.servicePrice <= 0 || input.servicePrice > MAX_SERVICE_PRICE_BRL) {
    return { error: "Valor do serviço inválido", status: 400 };
  }

  const start = input.scheduledStart;
  if (Number.isNaN(start.getTime()) || start.getTime() <= now.getTime()) {
    return { error: "Escolha um horário futuro.", status: 400 };
  }

  // Cliente: só a grade (terça a sábado, 10h ou 15h). Encaixe: qualquer dia, mas 10h ou 15h.
  const period = forced ? periodOfStart(start) : offeredPeriod(start);
  if (!period) return { error: UNAVAILABLE, status: 409, reason: "outside_grid" };

  const day = saoPauloDayAsUtcMidnight(start);

  try {
    return await store.transaction(async (repo): Promise<CreateBookingResult> => {
      const service = await repo.findService(input.serviceSlug);
      if (!service) return { error: "Serviço não encontrado", status: 404 };
      if (!service.active && !forced) return { error: "Serviço indisponível no momento.", status: 409, reason: "inactive_service" };

      await repo.lockDay(saoPauloDateKey(start));

      if (!forced) {
        if (await repo.isFullDayBlocked(day)) return { error: UNAVAILABLE, status: 409, reason: "blocked_day" };
        const [rules, existing] = await Promise.all([repo.loadRuleBook(), repo.listActiveDayBookings(day, now)]);
        const check = checkAdd(rules, existing, service.id, period);
        if (!check.ok) return { error: UNAVAILABLE, status: 409, reason: check.reason };
      }

      const { depositAmount, depositIsPercentage, remainingAmount } = calculateDeposit({
        servicePrice: input.servicePrice,
        scheduledStart: start,
        isOutOfTownSeason: input.isOutOfTownSeason,
      });

      const booking = await repo.create({
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        clientPhone: input.clientPhone,
        serviceId: service.id,
        scheduledStart: start,
        scheduledEnd: new Date(start.getTime() + service.maxHours * 60 * 60 * 1000),
        period,
        isOutOfTownSeason: input.isOutOfTownSeason,
        servicePrice: input.servicePrice,
        depositAmount,
        depositIsPercentage,
        remainingAmount,
        notes: input.notes,
        status: input.admin?.status ?? "PENDING_PAYMENT",
        forced,
        forcedReason: forced ? input.admin?.reason?.trim() || null : null,
      });

      return { booking };
    });
  } catch (error) {
    if (error instanceof SlotTakenError) {
      return { error: UNAVAILABLE, status: 409 };
    }
    throw error;
  }
}
