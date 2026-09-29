import { Resend } from "resend";
import type { Booking, Service } from "@prisma/client";
import { formatBRL, formatDateTimeBR } from "@/lib/format";
import { GOOGLE_REVIEW_URL } from "@/lib/contact";

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
        <h1 style="font-size: 20px;">Agendamento confirmado, ${booking.clientName}!</h1>
        <p>Recebemos seu sinal e seu horário está garantido.</p>
        <table style="width: 100%; margin-top: 16px; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #555;">Serviço</td><td style="padding: 8px 0; text-align: right;">${booking.service.name}</td></tr>
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Pedido de avaliação no Google enviado no dia seguinte ao atendimento.
// Tom neutro de propósito: vai para todos os clientes atendidos, sem filtrar
// quem gostou (o Google desaconselha pedir avaliação só a quem ficou satisfeito).
export async function sendReviewRequestEmail(
  booking: Booking & { service: Service },
): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "Afro Dreads <contato@afrodreads.com.br>";
  const name = escapeHtml(booking.clientName);
  const service = escapeHtml(booking.service.name);

  await getResendClient().emails.send({
    from,
    to: booking.clientEmail,
    subject: "Como foi seu atendimento na Afro Dreads?",
    html: `
      <div style="font-family: sans-serif; color: #111; max-width: 480px;">
        <h1 style="font-size: 20px;">Oi, ${name}! 💛</h1>
        <p>Ficamos muito felizes por ter você com a gente na Afro Dreads!</p>
        <p>
          Sua opinião é muito importante para o nosso trabalho. Se puder, deixe uma avaliação
          no Google contando como foi o seu atendimento (por exemplo, o serviço que você fez:
          ${service}). Isso ajuda outras pessoas a nos encontrarem.
        </p>
        <p style="margin: 24px 0;">
          <a href="${GOOGLE_REVIEW_URL}" style="background: #f1bb09; color: #000; text-decoration: none; padding: 12px 20px; border-radius: 999px; font-weight: bold;">
            Avaliar a Afro Dreads
          </a>
        </p>
        <p>Agradecemos demais pelo apoio!<br />Com carinho,<br />Equipe Afro Dreads 💛</p>
        <p style="margin-top: 24px; color: #777; font-size: 12px;">
          Você recebeu este e-mail porque fez um atendimento na Afro Dreads. Se não quiser
          receber mais mensagens como esta, é só responder este e-mail.
        </p>
      </div>
    `,
  });
}
