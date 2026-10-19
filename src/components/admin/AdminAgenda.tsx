"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarLegend, MonthGrid, monthLabel, shiftMonth, STATUS_STYLE, type CalendarDay } from "@/components/booking/MonthCalendar";

// Agenda do painel: cor de cada dia considerando o dia como um todo, os
// agendamentos com a cadeira de cada um e o encaixe manual (só administradores).

type AgendaBooking = {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  period: "MORNING" | "AFTERNOON";
  chairs: ("LYON" | "THAY")[] | null;
  status: string;
  forced: boolean;
  forcedReason: string | null;
  paymentOption: "DEPOSIT" | "FULL" | null;
  googleCalendarUrl: string | null;
};
type Agenda = { days: CalendarDay[]; bookings: Record<string, AgendaBooking[]> };
type ServiceOption = { slug: string; name: string; basePrice: number | null; active: boolean };

const PERIOD_LABEL = { MORNING: "Manhã (10h)", AFTERNOON: "Tarde (15h)" } as const;
const CHAIR_LABEL = { LYON: "Lyon", THAY: "Thay" } as const;
const STATUS_LABEL: Record<string, string> = { CONFIRMED: "Confirmado", PENDING_PAYMENT: "Aguardando pagamento" };

export function AdminAgenda({ initialMonth }: { initialMonth: string }) {
  const router = useRouter();
  const [month, setMonth] = useState(initialMonth);
  const [agenda, setAgenda] = useState<{ month: string; data: Agenda } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const loading = agenda?.month !== month;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/agenda?month=${month}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setAgenda({ month, data: { days: data.days ?? [], bookings: data.bookings ?? {} } });
      });
    return () => {
      cancelled = true;
    };
  }, [month, reload]);

  const days = agenda?.month === month ? agenda.data.days : [];
  const bookings = selected && agenda ? (agenda.data.bookings[selected] ?? []) : [];
  const selectedDay = days.find((day) => day.date === selected);

  return (
    <section className="mb-10 rounded-2xl border border-white/10 bg-brand-gray p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior" className="rounded-full px-3 py-1 text-lg text-brand-white/70 hover:text-brand-yellow">
          ‹
        </button>
        <h2 className="font-semibold text-brand-white">{monthLabel(month)}</h2>
        <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês" className="rounded-full px-3 py-1 text-lg text-brand-white/70 hover:text-brand-yellow">
          ›
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-brand-white/50">Carregando agenda...</p>
      ) : (
        <MonthGrid
          month={month}
          days={days}
          selected={selected}
          onSelect={setSelected}
          isSelectable={() => true}
          dayExtra={(day) => `${agenda?.data.bookings[day.date]?.length ?? 0} agendamento(s)`}
        />
      )}
      <CalendarLegend />
      <p className="mt-1 text-xs text-brand-white/40">
        No painel a cor considera o dia inteiro: amarelo = só 1 cadeira-período livre; vermelho = nenhum serviço ativo cabe mais.
      </p>

      {selected && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <h3 className="font-display text-xl uppercase text-brand-white">
            {selected.split("-").reverse().join("/")}{" "}
            <span className="text-sm font-normal normal-case text-brand-white/60">
              {selectedDay ? `${STATUS_STYLE[selectedDay.status].label}${selectedDay.freeCells !== undefined ? ` · ${selectedDay.freeCells} de 4 cadeiras-período livres` : ""}` : ""}
            </span>
          </h3>

          {(["MORNING", "AFTERNOON"] as const).map((period) => {
            const list = bookings.filter((booking) => booking.period === period);
            return (
              <div key={period} className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-white/50">{PERIOD_LABEL[period]}</p>
                {list.length === 0 && <p className="text-sm text-brand-white/40">Livre</p>}
                <ul className="space-y-1">
                  {list.map((booking) => (
                    <li key={booking.id} className="rounded-lg bg-brand-black/50 px-3 py-2 text-sm text-brand-white">
                      <span className="font-semibold">{booking.serviceName}</span> · {booking.clientName}{" "}
                      <span className="text-brand-white/60">({booking.clientPhone})</span>
                      <span className="block text-xs text-brand-white/60">
                        {booking.chairs ? `Cadeira: ${booking.chairs.map((chair) => CHAIR_LABEL[chair]).join(" + ")}` : "Acima da capacidade"} ·{" "}
                        {STATUS_LABEL[booking.status] ?? booking.status}
                        {booking.paymentOption === "FULL" && " · pago total"}
                        {booking.paymentOption === "DEPOSIT" && " · sinal pago"}
                        {booking.forced && ` · ENCAIXE${booking.forcedReason ? `: ${booking.forcedReason}` : ""}`}
                      </span>
                      {booking.googleCalendarUrl && (
                        <a href={booking.googleCalendarUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-yellow underline">
                          📅 Google Agenda
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <ForcedBookingForm
            date={selected}
            onDone={() => {
              setReload((value) => value + 1);
              router.refresh();
            }}
          />
        </div>
      )}
    </section>
  );
}

function ForcedBookingForm({ date, onDone }: { date: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [form, setForm] = useState({
    serviceSlug: "",
    period: "MORNING" as "MORNING" | "AFTERNOON",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    servicePrice: "",
    isOutOfTownSeason: false,
    status: "PENDING_PAYMENT" as "PENDING_PAYMENT" | "CONFIRMED",
    force: false,
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ error?: string; checkoutUrl?: string | null; ok?: boolean } | null>(null);

  useEffect(() => {
    if (!open || services.length) return;
    fetch("/api/admin/services")
      .then((res) => res.json())
      .then((data) => {
        const list: ServiceOption[] = data.services ?? [];
        setServices(list);
        setForm((current) => ({ ...current, serviceSlug: current.serviceSlug || list.find((s) => s.active)?.slug || "" }));
      });
  }, [open, services.length]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, date, servicePrice: Number(form.servicePrice), reason: form.reason || undefined }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setResult({ error: data?.error ?? "Não foi possível encaixar." });
        return;
      }
      setResult({ ok: true, checkoutUrl: data.checkoutUrl });
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  const input = "w-full rounded-lg border border-white/20 bg-brand-black px-3 py-2 text-sm text-brand-white";

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-5 rounded-full border border-brand-yellow/60 px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand-yellow hover:bg-brand-yellow/10">
        + Encaixe manual neste dia
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3 rounded-xl border border-white/10 bg-brand-black/40 p-4">
      <p className="text-sm font-semibold text-brand-white">Encaixe manual · {date.split("-").reverse().join("/")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <select className={input} value={form.serviceSlug} onChange={(e) => update("serviceSlug", e.target.value)} required>
          {services.map((service) => (
            <option key={service.slug} value={service.slug}>
              {service.name}
              {service.active ? "" : " (desativado)"}
            </option>
          ))}
        </select>
        <select className={input} value={form.period} onChange={(e) => update("period", e.target.value as "MORNING" | "AFTERNOON")}>
          <option value="MORNING">Manhã (10h)</option>
          <option value="AFTERNOON">Tarde (15h)</option>
        </select>
        <input className={input} placeholder="Nome do cliente" value={form.clientName} onChange={(e) => update("clientName", e.target.value)} required />
        <input className={input} placeholder="WhatsApp" value={form.clientPhone} onChange={(e) => update("clientPhone", e.target.value)} required />
        <input className={input} type="email" placeholder="E-mail" value={form.clientEmail} onChange={(e) => update("clientEmail", e.target.value)} required />
        <input className={input} type="number" min={0} step="0.01" placeholder="Valor do serviço (R$)" value={form.servicePrice} onChange={(e) => update("servicePrice", e.target.value)} required />
        <select className={input} value={form.status} onChange={(e) => update("status", e.target.value as "PENDING_PAYMENT" | "CONFIRMED")}>
          <option value="PENDING_PAYMENT">Aguardando pagamento (gera link de pagamento)</option>
          <option value="CONFIRMED">Confirmado (pago por fora)</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-brand-white/80">
          <input type="checkbox" className="accent-brand-yellow" checked={form.isOutOfTownSeason} onChange={(e) => update("isOutOfTownSeason", e.target.checked)} />
          Temporada fora de SP
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-amber-200">
        <input type="checkbox" className="accent-amber-400" checked={form.force} onChange={(e) => update("force", e.target.checked)} />
        Forçar encaixe fora das regras (ignora cadeiras, limites e bloqueio do dia)
      </label>
      {form.force && (
        <input className={input} placeholder="Motivo do encaixe (obrigatório)" value={form.reason} onChange={(e) => update("reason", e.target.value)} required minLength={5} />
      )}
      {result?.error && <p className="text-sm text-red-400">{result.error}</p>}
      {result?.ok && (
        <p className="text-sm text-emerald-300">
          Encaixe feito.{" "}
          {result.checkoutUrl && (
            <>
              Link de pagamento: <span className="break-all text-brand-yellow">{result.checkoutUrl}</span>
            </>
          )}
        </p>
      )}
      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="rounded-full bg-brand-yellow px-5 py-2 text-sm font-bold text-brand-black disabled:opacity-50">
          {submitting ? "Encaixando..." : "Encaixar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-brand-white/60 hover:text-brand-white">
          Fechar
        </button>
      </div>
    </form>
  );
}
