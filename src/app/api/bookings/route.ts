import { NextResponse } from "next/server";

// Desativada de propósito. Esta rota recebia o valor do serviço no corpo da
// requisição pública, o que permitia a qualquer pessoa criar um agendamento
// com o preço que quisesse. Hoje os agendamentos só nascem de um orçamento
// individual (POST /api/quotes/[token]/complete), onde o valor vem do banco.
export async function POST() {
  return NextResponse.json(
    { error: "Agendamento online direto foi desativado. Fale com a Afro Dreads pelo WhatsApp." },
    { status: 410 },
  );
}
