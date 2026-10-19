"use client";

import { useEffect, useState } from "react";

// Calendário do mês com a disponibilidade de cada dia para o serviço escolhido.
// Verde = com vagas, amarelo = última vaga, vermelho = esgotado. Além da cor,
// cada dia tem um ícone e um texto (leitores de tela e daltonismo).

export type DayStatus = "green" | "yellow" | "red" | "closed" | "past" | "blocked";
export type CalendarDay = { date: string; status: DayStatus; remaining?: number; freeCells?: number };

export const STATUS_STYLE: Record<DayStatus, { cell: string; icon: string; label: string }> = {
  green: { cell: "border-emerald-400/70 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/30", icon: "✓", label: "Com vagas" },
  yellow: { cell: "border-amber-300/80 bg-amber-400/15 text-amber-100 hover:bg-amber-400/30", icon: "!", label: "Última vaga" },
  red: { cell: "border-red-400/60 bg-red-500/15 text-red-200/80", icon: "✕", label: "Esgotado" },
  closed: { cell: "border-transparent text-brand-white/25", icon: "", label: "Fechado" },
  blocked: { cell: "border-transparent text-brand-white/25", icon: "", label: "Fechado" },
  past: { cell: "border-transparent text-brand-white/25", icon: "", label: "Indisponível" },
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const name = MONTH_NAMES[m - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${year}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Grade do mês (semanas começando no domingo), com células vazias antes do dia 1. */
export function MonthGrid({
  month,
  days,
  selected,
  onSelect,
  isSelectable,
  dayExtra,
}: {
  month: string;
  days: CalendarDay[];
  selected: string | null;
  onSelect: (date: string) => void;
  isSelectable: (day: CalendarDay) => boolean;
  dayExtra?: (day: CalendarDay) => string;
}) {
  const [year, m] = month.split("-").map(Number);
  const leading = new Date(Date.UTC(year, m - 1, 1)).getUTCDay();
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-brand-white/40">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="py-1">
            {weekday}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leading }, (_, index) => (
          <div key={`vazio-${index}`} />
        ))}
        {days.map((day) => {
          const style = STATUS_STYLE[day.status];
          const selectable = isSelectable(day);
          const isSelected = selected === day.date;
          const number = Number(day.date.slice(8, 10));
          const extra = dayExtra?.(day);
          return (
            <button
              key={day.date}
              type="button"
              disabled={!selectable}
              onClick={() => onSelect(day.date)}
              aria-pressed={isSelected}
              aria-label={`${number} de ${MONTH_NAMES[m - 1]}: ${style.label}${extra ? `, ${extra}` : ""}`}
              title={style.label}
              className={`flex aspect-square min-h-11 flex-col items-center justify-center rounded-lg border text-sm transition-colors disabled:cursor-not-allowed ${style.cell} ${
                isSelected ? "ring-2 ring-brand-white ring-offset-2 ring-offset-brand-gray" : ""
              }`}
            >
              <span className="font-semibold leading-none">{number}</span>
              {style.icon && (
                <span aria-hidden="true" className="mt-0.5 text-[10px] leading-none">
                  {style.icon}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarLegend() {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-white/70">
      {(["green", "yellow", "red"] as const).map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[9px] ${STATUS_STYLE[status].cell}`}>
            {STATUS_STYLE[status].icon}
          </span>
          {STATUS_STYLE[status].label}
        </li>
      ))}
    </ul>
  );
}

/** Calendário do cliente: busca a disponibilidade do mês para o serviço escolhido. */
export function MonthCalendar({
  serviceSlug,
  value,
  onChange,
  initialMonth,
  minMonth,
}: {
  serviceSlug: string;
  value: string;
  onChange: (date: string) => void;
  initialMonth: string;
  minMonth: string;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [state, setState] = useState<{ key: string; days: CalendarDay[]; error: boolean } | null>(null);
  const key = `${serviceSlug}|${month}`;
  const loading = state?.key !== key;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/availability/month?service=${encodeURIComponent(serviceSlug)}&month=${month}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data) => {
        if (!cancelled) setState({ key, days: data.days ?? [], error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ key, days: [], error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [serviceSlug, month, key]);

  return (
    <div className="rounded-xl border border-white/10 bg-brand-black/40 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
          disabled={month <= minMonth}
          aria-label="Mês anterior"
          className="rounded-full px-3 py-1 text-lg text-brand-white/70 hover:text-brand-yellow disabled:opacity-20"
        >
          ‹
        </button>
        <p className="font-semibold text-brand-white">{monthLabel(month)}</p>
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
          aria-label="Próximo mês"
          className="rounded-full px-3 py-1 text-lg text-brand-white/70 hover:text-brand-yellow"
        >
          ›
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-brand-white/50">Carregando datas...</p>
      ) : state?.error ? (
        <p className="py-10 text-center text-sm text-red-300">Não foi possível carregar a agenda. Tente de novo.</p>
      ) : (
        <MonthGrid
          month={month}
          days={state!.days}
          selected={value || null}
          onSelect={onChange}
          isSelectable={(day) => day.status === "green" || day.status === "yellow"}
        />
      )}
      <CalendarLegend />
    </div>
  );
}
