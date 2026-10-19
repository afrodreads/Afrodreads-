import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activeBookingWhere } from "@/lib/bookingRules";
import { adminMonth, monthDays } from "@/lib/capacity/calendar";
import { assignChairs } from "@/lib/capacity/engine";
import { loadMonthData } from "@/lib/capacity/store";
import { bookingPeriod } from "@/lib/schedule";
import { googleCalendarLink } from "@/lib/calendarFeed";
import { saoPauloDateKey } from "@/lib/timezone";

// Agenda do painel: cor de cada dia (o dia como um todo) e os agendamentos
// que ocupam a agenda, com a cadeira (Lyon/Thay) de cada um.
export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month") ?? "";
  const days = monthDays(month);
  if (!days) {
    return NextResponse.json({ error: "Mês inválido. Use o formato AAAA-MM." }, { status: 400 });
  }

  const now = new Date();
  const data = await loadMonthData(prisma, days, now);
  const from = days[0];
  const to = new Date(days[days.length - 1].getTime() + 2 * 24 * 60 * 60 * 1000);
  const rows = await prisma.booking.findMany({
    where: { AND: [activeBookingWhere(now), { scheduledStart: { gte: from, lt: to } }] },
    orderBy: { scheduledStart: "asc" },
    include: { service: { select: { name: true } } },
  });

  const bookings: Record<string, unknown[]> = {};
  for (const [date, dayBookings] of data.bookingsByDay) {
    if (!date.startsWith(month)) continue;
    const assignment = assignChairs(data.book, dayBookings);
    bookings[date] = rows
      .filter((row) => saoPauloDateKey(row.scheduledStart) === date)
      .map((row) => ({
        id: row.id,
        clientName: row.clientName,
        clientPhone: row.clientPhone,
        serviceName: row.service.name,
        period: bookingPeriod(row),
        chairs: assignment?.get(row.id) ?? null,
        status: row.status,
        forced: row.forced,
        forcedReason: row.forcedReason,
        paymentOption: row.paymentOption,
        scheduledStart: row.scheduledStart.toISOString(),
        googleCalendarUrl:
          row.status === "CONFIRMED"
            ? googleCalendarLink({
                id: row.id,
                serviceName: row.service.name,
                clientName: row.clientName,
                clientPhone: row.clientPhone,
                scheduledStart: row.scheduledStart,
                scheduledEnd: row.scheduledEnd,
                paymentOption: row.paymentOption,
                remainingAmount: Number(row.remainingAmount),
                forced: row.forced,
                notes: row.notes,
                updatedAt: row.updatedAt,
              })
            : null,
      }));
  }

  return NextResponse.json({ month, days: adminMonth(days, data), bookings }, { headers: { "Cache-Control": "no-store" } });
}
