import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdd } from "@/lib/capacity/engine";
import { loadDayBookings, loadRuleBook } from "@/lib/capacity/store";
import { openPeriods, periodStart } from "@/lib/schedule";
import { parseDateKey } from "@/lib/timezone";

// Horários livres de um dia para um serviço: manhã (10h) e/ou tarde (15h),
// conforme as regras de capacidade do cadastro de serviços.
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

  const service = await prisma.service.findUnique({ where: { slug: serviceSlug }, select: { id: true, active: true } });
  if (!service || !service.active) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  // `date` é um dia de calendário (AAAA-MM-DD) de São Paulo, como meia-noite UTC.
  const date = parseDateKey(dateParam);
  if (!date) {
    return NextResponse.json({ error: "Data inválida. Use o formato AAAA-MM-DD." }, { status: 400 });
  }

  const now = new Date();
  const periods = openPeriods(date, now);
  if (periods.length === 0) return NextResponse.json({ slots: [] });

  const [blockedDate, rules, existing] = await Promise.all([
    prisma.blockedDate.findUnique({ where: { date } }),
    loadRuleBook(prisma),
    loadDayBookings(prisma, date, now),
  ]);
  if (blockedDate?.fullDay) return NextResponse.json({ slots: [] });

  const free = periods.filter((period) => checkAdd(rules, existing, service.id, period).ok);
  return NextResponse.json({
    slots: free.map((period) => periodStart(date, period).toISOString()),
    periods: free,
  });
}
