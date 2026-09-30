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

function getFrom(): string {
  return process.env.EMAIL_FROM ?? "Afro Dreads <contato@afrodreads.com.br>";
}

// O SDK do Resend NÃO lança exceção quando a API recusa o envio (domínio não
// verificado, destinatário inválido, limite excedido...): ele devolve
// `{ data, error }`. Sem checar `error`, o envio falha em silêncio.
async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  const { error } = await getResendClient().emails.send({
    from: getFrom(),
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo,
  });
  if (error) {
    throw new Error(`Resend recusou o envio (${error.name}): ${error.message}`);
  }
}

export async function sendBookingConfirmationEmail(
  booking: Booking & { service: Service },
): Promise<void> {
  await sendEmail({
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

// Aviso interno: a equipe recebe os dados do cliente e do serviço assim que o
// sinal é confirmado. Endereço configurável por TEAM_NOTIFICATION_EMAIL.
export async function sendTeamBookingNotificationEmail(
  booking: Booking & { service: Service },
): Promise<void> {
  const to = process.env.TEAM_NOTIFICATION_EMAIL ?? "afrodreadsofc@gmail.com";
  const row = (label: string, value: string) =>
    `<tr><td style="padding: 6px 12px 6px 0; color: #555; vertical-align: top;">${label}</td><td style="padding: 6px 0;">${value}</td></tr>`;

  await sendEmail({
    to,
    replyTo: booking.clientEmail,
    subject: `Novo agendamento confirmado: ${booking.clientName} — ${formatDateTimeBR(booking.scheduledStart)}`,
    html: `
      <div style="font-family: sans-serif; color: #111; max-width: 520px;">
        <h1 style="font-size: 20px;">Novo agendamento confirmado</h1>
        <p>O sinal foi pago e o horário está garantido.</p>
        <table style="border-collapse: collapse; margin-top: 12px;">
          ${row("Cliente", escapeHtml(booking.clientName))}
          ${row("WhatsApp", escapeHtml(booking.clientPhone))}
          ${row("E-mail", escapeHtml(booking.clientEmail))}
          ${row("Serviço", escapeHtml(booking.service.name))}
          ${row("Data e horário", formatDateTimeBR(booking.scheduledStart))}
          ${row("Valor do serviço", formatBRL(Number(booking.servicePrice)))}
          ${row("Sinal pago", formatBRL(Number(booking.depositAmount)))}
          ${row("Restante no dia", formatBRL(Number(booking.remainingAmount)))}
          ${booking.isOutOfTownSeason ? row("Temporada", "Atendimento por temporada fora de SP") : ""}
          ${booking.notes ? row("Observações", escapeHtml(booking.notes)) : ""}
          ${row("Código", escapeHtml(booking.id))}
        </table>
        <p style="margin-top: 16px; color: #555; font-size: 14px;">
          Responder este e-mail responde direto ao cliente.
        </p>
      </div>
    `,
  });
}

const GOOGLE_REVIEW_URL = "https://g.page/r/CUFwpwTBzXTjEBM/review";

export async function sendReviewRequestEmail(
  booking: Pick<Booking, "clientName" | "clientEmail">,
): Promise<void> {
  await sendEmail({
    to: booking.clientEmail,
    subject: "Como foi seu atendimento na Afro Dreads?",
    html: `
      <div style="font-family: sans-serif; color: #111; max-width: 480px;">
        <p>Oi, ${escapeHtml(booking.clientName)}! Ficamos muito felizes por ter você com a gente na Afro Dreads! 💛</p>
        <p>Sua opinião é muito importante para o nosso trabalho. Se puder, deixe uma avaliação no Google contando como foi o seu atendimento (por exemplo, o serviço que você fez). Isso ajuda outras pessoas a nos encontrarem.</p>
        <p>É só clicar no link abaixo:</p>
        <p><a href="${GOOGLE_REVIEW_URL}">${GOOGLE_REVIEW_URL}</a></p>
        <p>Agradecemos demais pelo apoio!</p>
        <p>Com carinho,<br>Equipe Afro Dreads 💛</p>
      </div>
    `,
  });
}
