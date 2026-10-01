import { NextRequest, NextResponse } from "next/server";
import { expireStaleBookingsNow } from "@/lib/bookingStores";

// Mesma proteção do cron de avaliações: a Vercel envia o CRON_SECRET no header
// Authorization, então a rota não pode ser disparada por quem só conhece a URL.
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

// Marca como EXPIRED os agendamentos que ficaram aguardando pagamento além do
// prazo. Nunca mexe em agendamentos com pagamento aprovado. A agenda já ignora
// esses horários por conta própria; esta rotina só organiza o status.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const report = await expireStaleBookingsNow();
  if (report.skippedPaid > 0) {
    console.error("Agendamentos aguardando pagamento que já têm pagamento aprovado", report);
  }
  return NextResponse.json(report);
}
