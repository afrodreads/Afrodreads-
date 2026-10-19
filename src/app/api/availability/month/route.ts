import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientMonth, monthDays } from "@/lib/capacity/calendar";
import { loadMonthData } from "@/lib/capacity/store";

// Calendário do cliente: a cor de cada dia do mês para o serviço escolhido
// (verde = com vagas, amarelo = última vaga, vermelho = esgotado).
const MAX_MONTHS_AHEAD = 18;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const serviceSlug = searchParams.get("service");
  const month = searchParams.get("month");
  if (!serviceSlug || !month) {
    return NextResponse.json({ error: "Parâmetros 'service' e 'month' são obrigatórios" }, { status: 400 });
  }

  const days = monthDays(month);
  if (!days) {
    return NextResponse.json({ error: "Mês inválido. Use o formato AAAA-MM." }, { status: 400 });
  }
  const now = new Date();
  const monthsAhead =
    (days[0].getUTCFullYear() - now.getUTCFullYear()) * 12 + (days[0].getUTCMonth() - now.getUTCMonth());
  if (monthsAhead < -1 || monthsAhead > MAX_MONTHS_AHEAD) {
    return NextResponse.json({ error: "Mês fora do período da agenda." }, { status: 400 });
  }

  const service = await prisma.service.findUnique({ where: { slug: serviceSlug }, select: { id: true, active: true } });
  if (!service || !service.active) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  const data = await loadMonthData(prisma, days, now);
  return NextResponse.json(
    { month, days: clientMonth(days, service.id, data) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
