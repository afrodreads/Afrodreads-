import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  basePrice: z.number().positive().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = await prisma.service.update({
    where: { id },
    data: { basePrice: parsed.data.basePrice },
  });

  return NextResponse.json({
    service: {
      id: service.id,
      basePrice: service.basePrice ? Number(service.basePrice) : null,
    },
  });
}
