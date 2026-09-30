import type { Booking } from "@prisma/client";
import { getServiceBySlug } from "./services";
import { calculateDeposit } from "./pricing";
import { isOfferedStartTime } from "./schedule";
import { saoPauloDayAsUtcMidnight } from "./timezone";

// Núcleo da criação de agendamento, sem acesso direto ao banco: quem chama
// injeta o `store` (Prisma em produção, um fake nos testes).
//
// IMPORTANTE: `servicePrice` é confiado aqui. Ele só pode vir do servidor
// (ex.: o valor gravado no orçamento), NUNCA de um corpo de requisição
// público — por isso POST /api/bookings foi desativado.

export type CreateBookingInput = {
  serviceSlug: string;
  scheduledStart: Date;
  servicePrice: number;
  isOutOfTownSeason: boolean;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes?: string;
};

export type CreateBookingResult = { booking: Booking } | { error: string; status: number };

export type NewBookingData = {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  isOutOfTownSeason: boolean;
  servicePrice: number;
  depositAmount: number;
  depositIsPercentage: boolean;
  remainingAmount: number;
  notes?: string;
};

export interface BookingCreationRepo {
  findServiceIdBySlug(slug: string): Promise<string | null>;
  isFullDayBlocked(day: Date): Promise<boolean>;
  countActiveOverlapping(start: Date, end: Date, now: Date): Promise<number>;
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
const UNAVAILABLE = "Horário indisponível. Escolha outro horário.";

export async function createBooking(
  input: CreateBookingInput,
  store: BookingCreationStore,
  now: Date = new Date(),
): Promise<CreateBookingResult> {
  const serviceDefinition = getServiceBySlug(input.serviceSlug);
  if (!serviceDefinition) {
    return { error: "Serviço não encontrado", status: 404 };
  }

  if (!Number.isFinite(input.servicePrice) || input.servicePrice <= 0 || input.servicePrice > MAX_SERVICE_PRICE_BRL) {
    return { error: "Valor do serviço inválido", status: 400 };
  }

  const start = input.scheduledStart;
  if (Number.isNaN(start.getTime()) || start.getTime() <= now.getTime()) {
    return { error: "Escolha um horário futuro.", status: 400 };
  }

  // Só os horários que a agenda realmente oferece (dia aberto + 10h/15h de SP).
  if (!isOfferedStartTime(start, serviceDefinition.maxHours)) {
    return { error: UNAVAILABLE, status: 409 };
  }

  const end = new Date(start.getTime() + serviceDefinition.maxHours * 60 * 60 * 1000);

  try {
    return await store.transaction(async (repo): Promise<CreateBookingResult> => {
      const serviceId = await repo.findServiceIdBySlug(input.serviceSlug);
      if (!serviceId) {
        return { error: "Serviço não sincronizado no banco. Rode o seed.", status: 404 };
      }

      if (await repo.isFullDayBlocked(saoPauloDayAsUtcMidnight(start))) {
        return { error: UNAVAILABLE, status: 409 };
      }

      if ((await repo.countActiveOverlapping(start, end, now)) > 0) {
        return { error: UNAVAILABLE, status: 409 };
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
        serviceId,
        scheduledStart: start,
        scheduledEnd: end,
        isOutOfTownSeason: input.isOutOfTownSeason,
        servicePrice: input.servicePrice,
        depositAmount,
        depositIsPercentage,
        remainingAmount,
        notes: input.notes,
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
