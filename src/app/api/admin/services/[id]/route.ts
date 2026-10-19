import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serviceInputSchema } from "@/lib/serviceRegistry";
import { saveService } from "@/lib/serviceRegistryStore";

/** Edita (ou desativa, com `active: false`) um serviço e suas regras. Serviços nunca são apagados. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = serviceInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  const exists = await prisma.service.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }
  const service = await saveService(id, parsed.data);
  return NextResponse.json({ service });
}
