"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

type Service = {
  id: string;
  slug: string;
  name: string;
  minHours: number;
  maxHours: number;
  basePrice: number | null;
};

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/services")
      .then((res) => res.json())
      .then((data) => {
        setServices(data.services ?? []);
        const initialDrafts: Record<string, string> = {};
        for (const service of data.services ?? []) {
          initialDrafts[service.id] = service.basePrice != null ? String(service.basePrice) : "";
        }
        setDrafts(initialDrafts);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(id: string) {
    setSavingId(id);
    setSavedId(null);
    const raw = drafts[id]?.trim();
    const basePrice = raw ? Number(raw) : null;
    try {
      const response = await fetch(`/api/admin/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePrice }),
      });
      if (response.ok) {
        setSavedId(id);
        setServices((prev) =>
          prev.map((service) => (service.id === id ? { ...service, basePrice } : service)),
        );
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AdminShell>
      <h1 className="font-display text-3xl uppercase text-brand-white">Preço dos serviços</h1>
      <p className="mt-2 text-sm text-brand-white/60">
        Defina um valor de referência para cada serviço. Ele aparece pré-preenchido no
        agendamento, mas o cliente ainda pode ajustar caso o valor combinado seja diferente.
      </p>

      {loading && <p className="mt-6 text-sm text-brand-white/50">Carregando...</p>}

      <div className="mt-6 space-y-3">
        {services.map((service) => (
          <div
            key={service.id}
            className="flex flex-col gap-3 rounded-xl border border-white/10 bg-brand-gray p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold text-brand-white">{service.name}</p>
              <p className="text-sm text-brand-white/60">
                {service.minHours}h–{service.maxHours}h
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-brand-white/60">R$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={drafts[service.id] ?? ""}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [service.id]: e.target.value }))
                }
                className="w-32 rounded-lg border border-white/20 bg-brand-black px-3 py-2 text-brand-white"
              />
              <button
                onClick={() => handleSave(service.id)}
                disabled={savingId === service.id}
                className="rounded-full bg-brand-yellow px-4 py-2 text-xs font-bold text-brand-black disabled:opacity-50"
              >
                {savingId === service.id ? "Salvando..." : "Salvar"}
              </button>
              {savedId === service.id && <span className="text-xs text-brand-yellow">Salvo!</span>}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
