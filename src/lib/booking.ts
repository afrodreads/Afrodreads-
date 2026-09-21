import { prisma } from "@/lib/prisma";
import { getServiceBySlug } from "@/lib/services";
import { calculateDeposit } from "@/lib/pricing";
import type { Booking } from "@prisma/client";

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

export type CreateBookingResult =
  | { booking: Booking }
  | { error: string; status: number };

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const serviceDefinition = getServiceBySlug(input.serviceSlug);
  if (!serviceDefinition) {
    return { error: "Serviço não encontrado", status: 404 };
  }

  const service = await prisma.service.findUnique({ where: { slug: input.serviceSlug } });
  if (!service) {
    return { error: "Serviço não sincronizado no banco. Rode o seed.", status: 404 };
  }

  const scheduledEnd = new Date(
    input.scheduledStart.getTime() + serviceDefinition.maxHours * 60 * 60 * 1000,
  );

  const conflict = await prisma.booking.findFirst({
    where: {
      status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: input.scheduledStart },
    },
  });
  if (conflict) {
    return { error: "Horário indisponível. Escolha outro horário.", status: 409 };
  }

  const { depositAmount, depositIsPercentage, remainingAmount } = calculateDeposit({
    servicePrice: input.servicePrice,
    scheduledStart: input.scheduledStart,
    isOutOfTownSeason: input.isOutOfTownSeason,
  });

  const booking = await prisma.booking.create({
    data: {
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone,
      serviceId: service.id,
      scheduledStart: input.scheduledStart,
      scheduledEnd,
      isOutOfTownSeason: input.isOutOfTownSeason,
      servicePrice: input.servicePrice,
      depositAmount,
      depositIsPercentage,
      remainingAmount,
      notes: input.notes,
    },
  });

  return { booking };
}
