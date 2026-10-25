import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildIcs, eventText, feedToken, googleCalendarLink, isValidFeedToken, type CalendarBooking } from "./calendarFeed";

const booking = (overrides: Partial<CalendarBooking> = {}): CalendarBooking => ({
  id: "b1",
  serviceName: "Manutenção completa (cabeça toda)",
  clientName: "Maria, da Silva",
  clientPhone: "11 98765-4321",
  scheduledStart: new Date("2026-12-09T13:00:00Z"), // 10h em São Paulo
  scheduledEnd: new Date("2026-12-09T18:00:00Z"),
  paymentOption: "DEPOSIT",
  remainingAmount: 200,
  forced: false,
  notes: null,
  updatedAt: new Date("2026-10-19T12:00:00Z"),
  ...overrides,
});

describe("Google Agenda: link privado do feed", () => {
  it("o token é estável, depende do segredo e é conferido em tempo constante", () => {
    assert.equal(feedToken("segredo"), feedToken("segredo"));
    assert.notEqual(feedToken("segredo"), feedToken("outro"));
    assert.equal(feedToken("segredo").length, 40);
    assert.equal(isValidFeedToken(feedToken("segredo"), "segredo"), true);
    assert.equal(isValidFeedToken("errado", "segredo"), false);
    assert.equal(isValidFeedToken(feedToken("segredo"), undefined), false);
    assert.equal(isValidFeedToken(null, "segredo"), false);
  });
});

describe("Google Agenda: conteúdo do compromisso", () => {
  it("título com serviço e cliente; descrição com WhatsApp e quanto cobrar no dia", () => {
    const { title, details } = eventText(booking());
    assert.equal(title, "Manutenção completa (cabeça toda) — Maria, da Silva");
    assert.match(details, /WhatsApp: 11 98765-4321/);
    assert.match(details, /cobrar no dia: R\$\s?200,00/);
  });

  it("pagamento total: nada a cobrar no dia; encaixe e observações aparecem", () => {
    const { details } = eventText(booking({ paymentOption: "FULL", remainingAmount: 0, forced: true, notes: "Traz foto" }));
    assert.match(details, /Pago o valor total/);
    assert.match(details, /Encaixe feito pelo painel/);
    assert.match(details, /Observações: Traz foto/);
  });
});

describe("Google Agenda: arquivo iCalendar", () => {
  it("um evento por agendamento, com horário UTC, texto escapado e linhas curtas", () => {
    const ics = buildIcs([booking(), booking({ id: "b2" })], new Date("2026-10-19T12:00:00Z"));
    assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
    assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
    assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 2);
    assert.match(ics, /UID:b1@afrodreads\.com\.br/);
    assert.match(ics, /DTSTART:20261209T130000Z/);
    assert.match(ics, /DTEND:20261209T180000Z/);
    assert.match(ics, /Maria\\, da Silva/); // vírgula escapada
    for (const line of ics.split("\r\n")) assert.ok(Buffer.byteLength(line, "utf8") <= 75, line);
  });

  it("sem agendamentos: calendário vazio válido", () => {
    const ics = buildIcs([], new Date("2026-10-19T12:00:00Z"));
    assert.equal(ics.includes("BEGIN:VEVENT"), false);
    assert.match(ics, /X-WR-CALNAME:Afro Dreads - Agendamentos/);
  });
});

describe("Google Agenda: link de um clique", () => {
  it("abre o Google Agenda com o compromisso preenchido", () => {
    const url = new URL(googleCalendarLink(booking()));
    assert.equal(url.origin + url.pathname, "https://calendar.google.com/calendar/render");
    assert.equal(url.searchParams.get("action"), "TEMPLATE");
    assert.equal(url.searchParams.get("dates"), "20261209T130000Z/20261209T180000Z");
    assert.equal(url.searchParams.get("text"), "Manutenção completa (cabeça toda) — Maria, da Silva");
  });
});
