import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { saoPauloDayAsUtcMidnight } from "@/lib/timezone";
import { blockRowFor, lockStateOf, NO_LOCK } from "@/lib/blockedPeriods";

export async function GET() {
  const blockedDates = await prisma.blockedDate.findMany({
    // BlockedDate.date é a meia-noite UTC do dia de calendário de São Paulo.
    where: { date: { gte: saoPauloDayAsUtcMidnight(new Date()) } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ blockedDates });
}

const schema = z.object({
  date: z.string().date(),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const blockedDate = await prisma.blockedDate.create({
      data: {
        date: new Date(`${parsed.data.date}T00:00:00Z`),
        reason: parsed.data.reason,
      },
    });
    return NextResponse.json({ blockedDate }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Essa data já está bloqueada" }, { status: 409 });
  }
}

// Botões do painel (travar manhã / tarde / dia inteiro): grava exatamente o
// estado escolhido para o dia. Manhã + tarde = dia inteiro; nada = destrava.
// Agendamentos já marcados no período continuam valendo; só novos são barrados.
const lockSchema = z.object({
  date: z.string().date(),
  morning: z.boolean(),
  afternoon: z.boolean(),
  reason: z.string().trim().max(200).optional(),
});

export async function PUT(request: NextRequest) {
  const parsed = lockSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe a data e o que travar." }, { status: 400 });
  }
  const { morning, afternoon, reason } = parsed.data;
  const date = new Date(`${parsed.data.date}T00:00:00Z`);
  const row = blockRowFor({ morning, afternoon });

  if (!row) {
    await prisma.blockedDate.deleteMany({ where: { date } });
    return NextResponse.json({ lock: NO_LOCK, blockedDate: null });
  }

  const blockedDate = await prisma.blockedDate.upsert({
    where: { date },
    create: { date, ...row, reason: reason || null },
    update: { ...row, ...(reason !== undefined ? { reason: reason || null } : {}) },
  });
  return NextResponse.json({ lock: lockStateOf(blockedDate), blockedDate });
}
