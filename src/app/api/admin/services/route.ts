import { NextRequest, NextResponse } from "next/server";
import { serviceInputSchema } from "@/lib/serviceRegistry";
import { listServicesForAdmin, saveService } from "@/lib/serviceRegistryStore";

export async function GET() {
  return NextResponse.json({ services: await listServicesForAdmin() });
}

/** Cadastra um serviço novo (com as regras de capacidade). */
export async function POST(request: NextRequest) {
  const parsed = serviceInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  const service = await saveService(null, parsed.data);
  return NextResponse.json({ service }, { status: 201 });
}
