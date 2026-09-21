import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const cancelSchema = z.object({ action: z.literal("cancel") });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = cancelSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const quote = await prisma.quote.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  return NextResponse.json({ quote: { id: quote.id, status: quote.status } });
}
