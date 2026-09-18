import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServiceBySlug } from "@/lib/services";
import { getAvailableStartTimes } from "@/lib/schedule";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const serviceSlug = searchParams.get("service");
  const dateParam = searchParams.get("date");

  if (!serviceSlug || !dateParam) {
    return NextResponse.json(
      { error: "Parâmetros 'service' e 'date' são obrigatórios" },
      { status: 400 },
    );
  }

  const serviceDefinition = getServiceBySlug(serviceSlug);
  if (!serviceDefinition) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  const date = new Date(`${dateParam}T00:00:00`);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const [existingBookings, blockedDate] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
        scheduledStart: { gte: date, lt: nextDay },
      },
      select: { scheduledStart: true, scheduledEnd: true },
    }),
    prisma.blockedDate.findUnique({ where: { date } }),
  ]);

  if (blockedDate?.fullDay) {
    return NextResponse.json({ slots: [] });
  }

  const slots = getAvailableStartTimes(
    date,
    serviceDefinition.maxHours,
    existingBookings,
  );

  return NextResponse.json({ slots: slots.map((slot) => slot.toISOString()) });
}
