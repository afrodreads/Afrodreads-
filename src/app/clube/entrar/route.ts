import { NextResponse } from "next/server";
import { grupoAtual } from "@/lib/clube";

// Leva para o grupo do Clube que está recebendo gente agora (ver src/lib/clube.ts).
// Sempre dinâmico e sem cache, para a troca de grupo valer na hora.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.redirect(grupoAtual(), {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
