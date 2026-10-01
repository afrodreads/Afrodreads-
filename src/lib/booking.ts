import { createBooking as createBookingCore, type CreateBookingInput, type CreateBookingResult } from "./bookingCreation";
import { prismaBookingCreationStore } from "./bookingStores";

export type { CreateBookingInput, CreateBookingResult };

/**
 * Cria um agendamento validando tudo no servidor (horário oferecido, data
 * bloqueada, conflito). `servicePrice` precisa vir de uma fonte confiável
 * (ex.: o orçamento gravado no banco), nunca de uma requisição pública.
 */
export function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  return createBookingCore(input, prismaBookingCreationStore);
}
