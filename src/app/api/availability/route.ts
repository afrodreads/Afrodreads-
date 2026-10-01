import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServiceBySlug } from "@/lib/services";
import { getAvailableStartTimes } from "@/lib/schedule";
import { activeBookingWhere } from "@/lib/bookingRules";
import { parseDateKey } from "@/lib/timezone";

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

  // `date` é um dia de calendário (AAAA-MM-DD) de São Paulo, como meia-noite UTC.
  const date = parseDateKey(dateParam);
  if (!date) {
    return NextResponse.json({ error: "Data inválida. Use o formato AAAA-MM-DD." }, { status: 400 });
  }
  const nextDay = new Date(date);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const now = new Date();
  const [existingBookings, blockedDate] = await Promise.all([
    prisma.booking.findMany({
      where: {
        AND: [activeBookingWhere(now), { scheduledStart: { gte: date, lt: nextDay } }],
      },
      select: { scheduledStart: true, scheduledEnd: true },
    }),
    prisma.blockedDate.findUnique({ where: { date } }),
  ]);

  if (blockedDate?.fullDay) {
    return NextResponse.json({ slots: [] });
  }

  // Horários que já passaram não são oferecidos.
  const slots = getAvailableStartTimes(
    date,
    serviceDefinition.maxHours,
    existingBookings,
  ).filter((slot) => slot.getTime() > now.getTime());

  return NextResponse.json({ slots: slots.map((slot) => slot.toISOString()) });
}
