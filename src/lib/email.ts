import { Resend } from "resend";
import type { Booking, Service } from "@prisma/client";
import { formatBRL, formatDateTimeBR } from "@/lib/format";

let resendClient: Resend | undefined;

// Inicialização preguiçosa: evita quebrar `next build` quando a env var
// ainda não está configurada no ambiente (mesmo padrão de src/lib/mercadopago.ts).
function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY não configurado");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendBookingConfirmationEmail(
  booking: Booking & { service: Service },
): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "Afro Dreads <contato@afrodreads.com.br>";

  await getResendClient().emails.send({
    from,
    to: booking.clientEmail,
    subject: "Seu agendamento na Afro Dreads está confirmado!",
    html: `
      <div style="font-family: sans-serif; color: #111; max-width: 480px;">
        <h1 style="font-size: 20px;">Agendamento confirmado, ${escapeHtml(booking.clientName)}!</h1>
        <p>Recebemos seu sinal e seu horário está garantido.</p>
        <table style="width: 100%; margin-top: 16px; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #555;">Serviço</td><td style="padding: 8px 0; text-align: right;">${escapeHtml(booking.service.name)}</td></tr>
          <tr><td style="padding: 8px 0; color: #555;">Data e horário</td><td style="padding: 8px 0; text-align: right;">${formatDateTimeBR(booking.scheduledStart)}</td></tr>
          <tr><td style="padding: 8px 0; color: #555;">Sinal pago</td><td style="padding: 8px 0; text-align: right;">${formatBRL(Number(booking.depositAmount))}</td></tr>
          <tr><td style="padding: 8px 0; color: #555;">Restante no dia</td><td style="padding: 8px 0; text-align: right;">${formatBRL(Number(booking.remainingAmount))}</td></tr>
        </table>
        <p style="margin-top: 16px; color: #555; font-size: 14px;">
          Qualquer dúvida, fale com a gente pelo WhatsApp. Até breve!
        </p>
      </div>
    `,
  });
}

const GOOGLE_REVIEW_URL = "https://g.page/r/CUFwpwTBzXTjEBM/review";

export async function sendReviewRequestEmail(
  booking: Pick<Booking, "clientName" | "clientEmail">,
): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "Afro Dreads <contato@afrodreads.com.br>";

  await getResendClient().emails.send({
    from,
    to: booking.clientEmail,
    subject: "Como foi seu atendimento na Afro Dreads?",
    html: `
      <div style="font-family: sans-serif; color: #111; max-width: 480px;">
        <p>Oi, ${booking.clientName}! Ficamos muito felizes por ter você com a gente na Afro Dreads! 💛</p>
        <p>Sua opinião é muito importante para o nosso trabalho. Se puder, deixe uma avaliação no Google contando como foi o seu atendimento (por exemplo, o serviço que você fez). Isso ajuda outras pessoas a nos encontrarem.</p>
        <p>É só clicar no link abaixo:</p>
        <p><a href="${GOOGLE_REVIEW_URL}">${GOOGLE_REVIEW_URL}</a></p>
        <p>Agradecemos demais pelo apoio!</p>
        <p>Com carinho,<br>Equipe Afro Dreads 💛</p>
      </div>
    `,
  });
}
