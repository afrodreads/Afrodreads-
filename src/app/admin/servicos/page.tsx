"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

// Cadastro de serviços e das regras da agenda (cadeiras, quem faz, limites e
// com quem divide o dia). As regras valem na hora para o calendário do cliente.

type Staff = "ANY" | "LYON" | "THAY";
type Service = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  minHours: number;
  maxHours: number;
  basePrice: number | null;
  active: boolean;
  chairs: 1 | 2;
  staff: Staff;
  fullDay: boolean;
  maxPerPeriod: number | null;
  maxPerDay: number | null;
  startsMorning: boolean;
  startsAfternoon: boolean;
  rulesPending: boolean;
  rulesNote: string | null;
  allowSameDay: boolean;
  companions: { serviceId: string; sharesChair: boolean }[];
};
type Draft = Omit<Service, "id" | "slug">;

const STAFF_LABEL: Record<Staff, string> = { ANY: "Lyon ou Thay", LYON: "Só Lyon", THAY: "Só Thay" };

const EMPTY: Draft = {
  name: "",
  description: null,
  minHours: 3,
  maxHours: 5,
  basePrice: null,
  active: true,
  chairs: 1,
  staff: "ANY",
  fullDay: false,
  maxPerPeriod: null,
  maxPerDay: null,
  startsMorning: true,
  startsAfternoon: true,
  rulesPending: true,
  rulesNote: null,
  allowSameDay: false,
  companions: [],
};

function summary(service: Service): string {
  const parts = [
    service.chairs === 2 ? "2 cadeiras" : "1 cadeira",
    STAFF_LABEL[service.staff],
    service.fullDay ? "dia inteiro" : service.startsMorning && service.startsAfternoon ? "manhã ou tarde" : service.startsMorning ? "só manhã" : "só tarde",
  ];
  if (service.maxPerPeriod) parts.push(`até ${service.maxPerPeriod} por período`);
  if (service.maxPerDay) parts.push(`até ${service.maxPerDay} por dia`);
  return parts.join(" · ");
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const names = useMemo(() => new Map(services.map((service) => [service.id, service.name])), [services]);

  function load() {
    return fetch("/api/admin/services")
      .then((res) => res.json())
      .then((data) => setServices(data.services ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(service: Service | null) {
    setError(null);
    setMessage(null);
    if (!service) {
      setEditing({ id: null, draft: { ...EMPTY } });
      return;
    }
    const draft = Object.fromEntries(Object.entries(service).filter(([key]) => key !== "id" && key !== "slug")) as Draft;
    setEditing({ id: service.id, draft: { ...draft, companions: service.companions.map((c) => ({ ...c })) } });
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(editing.id ? `/api/admin/services/${editing.id}` : "/api/admin/services", {
        method: editing.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing.draft),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível salvar.");
        return;
      }
      setMessage(`"${editing.draft.name}" salvo.`);
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setEditing((current) => (current ? { ...current, draft: { ...current.draft, [key]: value } } : current));

  const toggleCompanion = (serviceId: string, on: boolean) =>
    setEditing((current) => {
      if (!current) return current;
      const rest = current.draft.companions.filter((c) => c.serviceId !== serviceId);
      return { ...current, draft: { ...current.draft, companions: on ? [...rest, { serviceId, sharesChair: false }] : rest } };
    });

  const toggleShare = (serviceId: string, on: boolean) =>
    setEditing((current) =>
      current
        ? {
            ...current,
            draft: {
              ...current.draft,
              companions: current.draft.companions.map((c) => (c.serviceId === serviceId ? { ...c, sharesChair: on } : c)),
            },
          }
        : current,
    );

  const numberOrNull = (value: string) => (value.trim() === "" ? null : Number(value));
  const input = "rounded-lg border border-white/20 bg-brand-black px-3 py-2 text-sm text-brand-white";
  const labelCls = "mb-1 block text-xs font-medium uppercase tracking-wide text-brand-white/60";

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase text-brand-white">Serviços e regras da agenda</h1>
          <p className="mt-2 max-w-2xl text-sm text-brand-white/60">
            Cada dia tem manhã (10h) e tarde (15h) e 2 cadeiras (Lyon e Thay). Aqui você define quantas cadeiras cada
            serviço ocupa, quem faz, os limites e com quais serviços ele divide o dia. Vale na hora para o calendário dos
            clientes.
          </p>
        </div>
        <button
          onClick={() => startEdit(null)}
          className="rounded-full bg-brand-yellow px-5 py-2 text-sm font-bold text-brand-black"
        >
          + Novo serviço
        </button>
      </div>

      {message && <p className="mt-4 text-sm text-emerald-300">{message}</p>}
      {loading && <p className="mt-6 text-sm text-brand-white/50">Carregando...</p>}

      {editing && (
        <div className="mt-6 space-y-5 rounded-2xl border border-brand-yellow/40 bg-brand-gray p-5">
          <h2 className="font-display text-xl uppercase text-brand-white">
            {editing.id ? `Editar: ${names.get(editing.id)}` : "Novo serviço"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Nome</label>
              <input className={`${input} w-full`} value={editing.draft.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Duração estimada (horas)</label>
              <div className="flex items-center gap-2">
                <input type="number" min={0.5} step={0.5} className={`${input} w-24`} value={editing.draft.minHours} onChange={(e) => set("minHours", Number(e.target.value))} />
                <span className="text-brand-white/50">a</span>
                <input type="number" min={0.5} step={0.5} className={`${input} w-24`} value={editing.draft.maxHours} onChange={(e) => set("maxHours", Number(e.target.value))} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Preço de referência (R$, opcional)</label>
              <input type="number" min={0} step="0.01" className={`${input} w-40`} value={editing.draft.basePrice ?? ""} onChange={(e) => set("basePrice", numberOrNull(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>Cadeiras ocupadas</label>
              <select className={input} value={editing.draft.chairs} onChange={(e) => set("chairs", Number(e.target.value) as 1 | 2)}>
                <option value={1}>1 cadeira</option>
                <option value={2}>2 cadeiras (Lyon e Thay juntos)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Quem pode fazer</label>
              <select className={input} value={editing.draft.staff} onChange={(e) => set("staff", e.target.value as Staff)} disabled={editing.draft.chairs === 2}>
                {(Object.keys(STAFF_LABEL) as Staff[]).map((value) => (
                  <option key={value} value={value}>
                    {STAFF_LABEL[value]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Limite por período</label>
              <input type="number" min={1} placeholder="sem limite" className={`${input} w-32`} value={editing.draft.maxPerPeriod ?? ""} onChange={(e) => set("maxPerPeriod", numberOrNull(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>Limite por dia</label>
              <input type="number" min={1} placeholder="sem limite" className={`${input} w-32`} value={editing.draft.maxPerDay ?? ""} onChange={(e) => set("maxPerDay", numberOrNull(e.target.value))} />
            </div>
          </div>

          <fieldset className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-white/80">
            <legend className={labelCls}>Quando pode começar</legend>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-brand-yellow" checked={editing.draft.startsMorning} onChange={(e) => set("startsMorning", e.target.checked)} />
              Manhã (10h)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-brand-yellow" checked={editing.draft.startsAfternoon} onChange={(e) => set("startsAfternoon", e.target.checked)} />
              Tarde (15h)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-brand-yellow" checked={editing.draft.fullDay} onChange={(e) => set("fullDay", e.target.checked)} />
              Ocupa a cadeira o dia inteiro (ex.: microlocs)
            </label>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className={labelCls}>Pode dividir o dia com</legend>
            <label className="flex items-center gap-2 text-sm text-brand-white/80">
              <input type="checkbox" className="accent-brand-yellow" checked={editing.draft.allowSameDay} onChange={(e) => set("allowSameDay", e.target.checked)} />
              Outro(s) agendamento(s) deste mesmo serviço
            </label>
            <div className="grid gap-1 sm:grid-cols-2">
              {services
                .filter((service) => service.id !== editing.id)
                .map((service) => {
                  const companion = editing.draft.companions.find((c) => c.serviceId === service.id);
                  return (
                    <div key={service.id} className="flex flex-wrap items-center gap-x-3 rounded-lg px-2 py-1 text-sm text-brand-white/80 hover:bg-white/5">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="accent-brand-yellow" checked={Boolean(companion)} onChange={(e) => toggleCompanion(service.id, e.target.checked)} />
                        {service.name}
                        {!service.active && <span className="text-xs text-brand-white/40">(desativado)</span>}
                      </label>
                      {companion && (
                        <label className="flex items-center gap-1 text-xs text-brand-white/50" title="Os dois podem usar a mesma cadeira no mesmo período (ex.: manutenção completa + retwist: a Thay ajuda depois de terminar o retwist).">
                          <input type="checkbox" className="accent-brand-yellow" checked={companion.sharesChair} onChange={(e) => toggleShare(service.id, e.target.checked)} />
                          mesma cadeira no período
                        </label>
                      )}
                    </div>
                  );
                })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-brand-white/80">
              <input type="checkbox" className="accent-brand-yellow" checked={editing.draft.active} onChange={(e) => set("active", e.target.checked)} />
              Ativo (aparece para agendamento e orçamentos)
            </label>
            <label className="flex items-center gap-2 text-sm text-brand-white/80">
              <input type="checkbox" className="accent-brand-yellow" checked={editing.draft.rulesPending} onChange={(e) => set("rulesPending", e.target.checked)} />
              Regras ainda PENDENTES de confirmação
            </label>
            <div className="sm:col-span-2">
              <label className={labelCls}>Observações / pendências</label>
              <textarea rows={2} className={`${input} w-full`} value={editing.draft.rulesNote ?? ""} onChange={(e) => set("rulesNote", e.target.value.trim() ? e.target.value : null)} />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="rounded-full bg-brand-yellow px-6 py-2 text-sm font-bold text-brand-black disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button onClick={() => setEditing(null)} className="text-sm text-brand-white/60 hover:text-brand-white">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {services.map((service) => (
          <div
            key={service.id}
            className={`rounded-xl border border-white/10 bg-brand-gray p-4 ${service.active ? "" : "opacity-60"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex flex-wrap items-center gap-2 font-semibold text-brand-white">
                  {service.name}
                  {!service.active && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase">Desativado</span>}
                  {service.rulesPending && (
                    <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">Pendente</span>
                  )}
                </p>
                <p className="text-sm text-brand-white/60">
                  {service.minHours}h–{service.maxHours}h · {summary(service)}
                  {service.basePrice != null && ` · R$ ${service.basePrice.toFixed(2).replace(".", ",")}`}
                </p>
                <p className="mt-1 text-xs text-brand-white/50">
                  Divide o dia com:{" "}
                  {[
                    ...(service.allowSameDay ? ["o próprio serviço"] : []),
                    ...service.companions.map((c) => `${names.get(c.serviceId) ?? "?"}${c.sharesChair ? " (mesma cadeira)" : ""}`),
                  ].join(", ") || "ninguém"}
                </p>
                {service.rulesNote && <p className="mt-1 text-xs text-amber-200/80">{service.rulesNote}</p>}
              </div>
              <button onClick={() => startEdit(service)} className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-brand-white/80 hover:border-brand-yellow">
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
