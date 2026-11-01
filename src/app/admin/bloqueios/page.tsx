"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { lockLabel, lockStateOf, type LockState } from "@/lib/blockedPeriods";

type BlockedDate = {
  id: string;
  date: string;
  reason: string | null;
  fullDay: boolean;
  period: "MORNING" | "AFTERNOON" | null;
};

// A trava é gravada como meia-noite UTC do dia de calendário: formatar em UTC
// (no fuso de São Paulo ela cairia no dia anterior).
const formatLockDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const CHOICES: { key: string; label: string; hint: string; state: LockState }[] = [
  { key: "day", label: "Dia inteiro", hint: "10h e 15h", state: { morning: true, afternoon: true } },
  { key: "morning", label: "Só a manhã", hint: "10h", state: { morning: true, afternoon: false } },
  { key: "afternoon", label: "Só a tarde", hint: "15h", state: { morning: false, afternoon: true } },
];

export default function AdminBlockedDatesPage() {
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState("");
  const [choice, setChoice] = useState("day");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    fetch("/api/admin/blocked-dates")
      .then((res) => res.json())
      .then((data) => setBlockedDates(data.blockedDates ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function save(date: string, state: LockState, why?: string) {
    const response = await fetch("/api/admin/blocked-dates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, ...state, ...(why !== undefined ? { reason: why } : {}) }),
    });
    if (!response.ok) throw new Error();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const selected = CHOICES.find((option) => option.key === choice) ?? CHOICES[0];
      await save(newDate, selected.state, reason);
      setNewDate("");
      setReason("");
      load();
    } catch {
      setError("Não foi possível travar essa data. Tente de novo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(blocked: BlockedDate) {
    try {
      await save(blocked.date.slice(0, 10), { morning: false, afternoon: false });
    } finally {
      load();
    }
  }

  return (
    <AdminShell>
      <h1 className="font-display text-3xl uppercase text-brand-white">Travar datas e horários</h1>
      <p className="mt-2 text-sm text-brand-white/60">
        O que estiver travado não aparece para o cliente marcar (feriados, viagens, folgas, horário já combinado fora
        do site). Quem já está marcado continua marcado. Também dá para travar direto na Agenda, tocando no dia.
      </p>

      <form onSubmit={handleAdd} className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-brand-gray p-4 sm:p-5">
        <div>
          <label htmlFor="trava-data" className="mb-2 block text-sm font-medium text-brand-white/80">
            Data
          </label>
          <input
            id="trava-data"
            type="date"
            required
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-brand-black px-4 py-3 text-brand-white sm:w-auto"
          />
        </div>

        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-brand-white/80">O que travar</legend>
          <div className="grid grid-cols-3 gap-2">
            {CHOICES.map((option) => {
              const on = choice === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setChoice(option.key)}
                  className={`flex min-h-16 flex-col items-center justify-center rounded-xl border-2 px-2 py-2 text-center transition-colors ${
                    on
                      ? "border-brand-yellow bg-brand-yellow/15 text-brand-white"
                      : "border-white/15 text-brand-white/70 hover:border-white/40"
                  }`}
                >
                  <span className="text-sm font-bold leading-tight">{option.label}</span>
                  <span className="text-[11px] leading-tight opacity-80">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="trava-motivo" className="mb-2 block text-sm font-medium text-brand-white/80">
            Motivo (opcional)
          </label>
          <input
            id="trava-motivo"
            type="text"
            maxLength={200}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: feriado, viagem, cliente marcado por fora"
            className="w-full rounded-lg border border-white/20 bg-brand-black px-4 py-3 text-brand-white"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !newDate}
          className="w-full rounded-full bg-brand-yellow px-6 py-3 text-sm font-bold uppercase tracking-wide text-brand-black disabled:opacity-50 sm:w-auto"
        >
          {submitting ? "Travando..." : "🔒 Travar"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-brand-white/60">Travados daqui pra frente</h2>
      {loading && <p className="mt-3 text-sm text-brand-white/50">Carregando...</p>}

      <div className="mt-3 space-y-2">
        {blockedDates.map((blocked) => {
          const label = lockLabel(lockStateOf(blocked));
          return (
            <div
              key={blocked.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-brand-gray p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-brand-white">
                  {formatLockDate(blocked.date)}{" "}
                  <span className="ml-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-200">
                    🔒 {label ?? "Travado"}
                  </span>
                </p>
                {blocked.reason && <p className="mt-1 text-sm text-brand-white/60">{blocked.reason}</p>}
              </div>
              <button
                onClick={() => handleRemove(blocked)}
                className="shrink-0 rounded-full border border-white/20 px-4 py-2 text-sm text-brand-white/80 hover:border-emerald-400 hover:text-emerald-200"
              >
                🔓 Destravar
              </button>
            </div>
          );
        })}
        {!loading && blockedDates.length === 0 && <p className="text-sm text-brand-white/50">Nada travado.</p>}
      </div>
    </AdminShell>
  );
}
