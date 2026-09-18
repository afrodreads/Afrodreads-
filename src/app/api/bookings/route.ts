import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServiceBySlug } from "@/lib/services";
import { calculateDeposit } from "@/lib/pricing";

const createBookingSchema = z.object({
  serviceSlug: z.string(),
  scheduledStart: z.string().datetime(),
  servicePrice: z.number().positive(),
  isOutOfTownSeason: z.boolean().default(false),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().min(8),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = createBookingSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const serviceDefinition = getServiceBySlug(data.serviceSlug);
  if (!serviceDefinition) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  const service = await prisma.service.findUnique({ where: { slug: data.serviceSlug } });
  if (!service) {
    return NextResponse.json(
      { error: "Serviço não sincronizado no banco. Rode o seed." },
      { status: 404 },
    );
  }

  const scheduledStart = new Date(data.scheduledStart);
  const scheduledEnd = new Date(
    scheduledStart.getTime() + serviceDefinition.maxHours * 60 * 60 * 1000,
  );

  const conflict = await prisma.booking.findFirst({
    where: {
      status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
    },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "Horário indisponível. Escolha outro horário." },
      { status: 409 },
    );
  }

  const { depositAmount, depositIsPercentage, remainingAmount } = calculateDeposit({
    servicePrice: data.servicePrice,
    scheduledStart,
    isOutOfTownSeason: data.isOutOfTownSeason,
  });

  const booking = await prisma.booking.create({
    data: {
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      serviceId: service.id,
      scheduledStart,
      scheduledEnd,
      isOutOfTownSeason: data.isOutOfTownSeason,
      servicePrice: data.servicePrice,
      depositAmount,
      depositIsPercentage,
      remainingAmount,
      notes: data.notes,
    },
  });

  return NextResponse.json({ booking }, { status: 201 });
}
