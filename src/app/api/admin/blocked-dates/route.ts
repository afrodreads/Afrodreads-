import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const blockedDates = await prisma.blockedDate.findMany({
    where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
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
        date: new Date(`${parsed.data.date}T00:00:00`),
        reason: parsed.data.reason,
      },
    });
    return NextResponse.json({ blockedDate }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Essa data já está bloqueada" }, { status: 409 });
  }
}
