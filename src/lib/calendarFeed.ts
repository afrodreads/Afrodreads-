import { createHmac, timingSafeEqual } from "node:crypto";

// Agendamentos no Google Agenda, sem credenciais do Google:
//  - feed iCalendar privado (o estúdio assina uma vez no Google Agenda e os
//    agendamentos confirmados aparecem sozinhos);
//  - link "Adicionar ao Google Agenda" por agendamento (instantâneo).
// O feed tem dados de clientes: o endereço dele é secreto (token derivado do
// segredo de sessão do admin, que só existe no servidor).

export type CalendarBooking = {
  id: string;
  serviceName: string;
  clientName: string;
  clientPhone: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  paymentOption: "DEPOSIT" | "FULL" | null;
  remainingAmount: number;
  forced: boolean;
  notes: string | null;
  updatedAt: Date;
};

const TOKEN_LABEL = "afrodreads-agenda-feed-v1";

/** Token do link privado do feed (estável enquanto o segredo do admin não mudar). */
export function feedToken(secret: string): string {
  return createHmac("sha256", secret).update(TOKEN_LABEL).digest("hex").slice(0, 40);
}

export function isValidFeedToken(provided: string | null | undefined, secret: string | undefined): boolean {
  if (!provided || !secret) return false;
  const expected = Buffer.from(feedToken(secret));
  const received = Buffer.from(provided);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Título e descrição do compromisso. */
export function eventText(booking: CalendarBooking): { title: string; details: string } {
  const title = `${booking.serviceName} — ${booking.clientName}`;
  const payment =
    booking.paymentOption === "FULL"
      ? "Pago o valor total (nada a cobrar no dia)"
      : `Sinal pago · cobrar no dia: ${brl(booking.remainingAmount)}`;
  const lines = [`Cliente: ${booking.clientName}`, `WhatsApp: ${booking.clientPhone}`, payment];
  if (booking.forced) lines.push("Encaixe feito pelo painel");
  if (booking.notes) lines.push(`Observações: ${booking.notes}`);
  return { title, details: lines.join("\n") };
}

/** 20261209T130000Z */
function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Quebra linhas longas (RFC 5545: até 75 octetos, continuação começa com espaço). */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    if (Buffer.byteLength(current + char, "utf8") > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** Arquivo iCalendar com os agendamentos (o Google Agenda assina este endereço). */
export function buildIcs(bookings: readonly CalendarBooking[], now: Date): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Afro Dreads//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Afro Dreads - Agendamentos",
    "X-WR-TIMEZONE:America/Sao_Paulo",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const booking of bookings) {
    const { title, details } = eventText(booking);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${booking.id}@afrodreads.com.br`,
      `DTSTAMP:${icsDate(now)}`,
      `LAST-MODIFIED:${icsDate(booking.updatedAt)}`,
      `DTSTART:${icsDate(booking.scheduledStart)}`,
      `DTEND:${icsDate(booking.scheduledEnd)}`,
      `SUMMARY:${escapeIcs(title)}`,
      `DESCRIPTION:${escapeIcs(details)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** Link que abre o Google Agenda com o compromisso preenchido (um clique para salvar). */
export function googleCalendarLink(booking: CalendarBooking): string {
  const { title, details } = eventText(booking);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${icsDate(booking.scheduledStart)}/${icsDate(booking.scheduledEnd)}`,
    details,
    ctz: "America/Sao_Paulo",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
