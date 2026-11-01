"use client";

import { useState } from "react";
import type { LockState } from "@/lib/blockedPeriods";

// Botões de travar horários de um dia no painel: um toque trava, outro toque
// destrava. Travado = clientes não conseguem marcar ali. Agendamentos que já
// existem no período continuam valendo. Quem usa passa `key={date}` para
// recomeçar do estado da agenda ao trocar de dia.

export type DayLock = "DAY" | "MORNING" | "AFTERNOON" | undefined;

export function lockStateFromDay(locked: DayLock): LockState {
  return { morning: locked === "DAY" || locked === "MORNING", afternoon: locked === "DAY" || locked === "AFTERNOON" };
}

export function DayLockButtons({
  date,
  locked,
  onChange,
}: {
  date: string;
  locked: DayLock;
  onChange: (state: LockState) => void;
}) {
  const [state, setState] = useState<LockState>(() => lockStateFromDay(locked));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: LockState) {
    const previous = state;
    setState(next);
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/blocked-dates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, ...next }),
      });
      if (!response.ok) throw new Error();
      onChange(next);
    } catch {
      setState(previous);
      setError("Não foi possível salvar. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  const whole = state.morning && state.afternoon;
  const buttons = [
    { key: "morning", label: "Manhã", hint: "10h", on: state.morning, next: { ...state, morning: !state.morning } },
    { key: "afternoon", label: "Tarde", hint: "15h", on: state.afternoon, next: { ...state, afternoon: !state.afternoon } },
    { key: "day", label: "Dia inteiro", hint: "10h e 15h", on: whole, next: whole ? { morning: false, afternoon: false } : { morning: true, afternoon: true } },
  ] as const;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-brand-black/40 p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold text-brand-white">Travar horários deste dia</p>
        <p className="text-xs text-brand-white/50">Toque para travar ou destravar</p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Travar horários">
        {buttons.map((button) => (
          <button
            key={button.key}
            type="button"
            disabled={saving}
            aria-pressed={button.on}
            onClick={() => save(button.next)}
            className={`flex min-h-16 flex-col items-center justify-center rounded-xl border-2 px-2 py-2 text-center transition-colors disabled:opacity-60 ${
              button.on
                ? "border-red-400 bg-red-500/25 text-red-100 hover:bg-red-500/35"
                : "border-emerald-400/60 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
            }`}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {button.on ? "🔒" : "✓"}
            </span>
            <span className="mt-1 text-sm font-bold leading-tight">{button.label}</span>
            <span className="text-[11px] leading-tight opacity-80">
              {button.on ? "Travado" : "Aberto"} · {button.hint}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-brand-white/50">
        {saving
          ? "Salvando..."
          : whole
            ? "Dia todo travado: nenhum cliente consegue marcar nesta data."
            : state.morning
              ? "Manhã travada: clientes só conseguem marcar à tarde."
              : state.afternoon
                ? "Tarde travada: clientes só conseguem marcar de manhã."
                : "Tudo aberto para agendamento."}{" "}
        {!saving && (state.morning || state.afternoon) && "Quem já está marcado continua marcado."}
      </p>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
