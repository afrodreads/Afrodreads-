import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { saoPauloDayAsUtcMidnight } from "@/lib/timezone";

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
