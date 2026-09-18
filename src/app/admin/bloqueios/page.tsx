"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

type BlockedDate = {
  id: string;
  date: string;
  reason: string | null;
};

export default function AdminBlockedDatesPage() {
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/admin/blocked-dates")
      .then((res) => res.json())
      .then((data) => setBlockedDates(data.blockedDates ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, reason: reason || undefined }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível bloquear essa data.");
        return;
      }
      setNewDate("");
      setReason("");
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    await fetch(`/api/admin/blocked-dates/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <AdminShell>
      <h1 className="font-display text-3xl uppercase text-brand-white">Bloqueio de datas</h1>
      <p className="mt-2 text-sm text-brand-white/60">
        Datas bloqueadas não aparecem como disponíveis no agendamento (feriados, viagens, folgas).
      </p>

      <form onSubmit={handleAdd} className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-brand-white/80">Data</label>
          <input
            type="date"
            required
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="rounded-lg border border-white/20 bg-brand-gray px-4 py-2 text-brand-white"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="mb-2 block text-sm font-medium text-brand-white/80">
            Motivo (opcional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-brand-gray px-4 py-2 text-brand-white"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-brand-yellow px-6 py-2 text-sm font-bold text-brand-black disabled:opacity-50"
        >
          Bloquear
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      {loading && <p className="mt-6 text-sm text-brand-white/50">Carregando...</p>}

      <div className="mt-6 space-y-2">
        {blockedDates.map((blocked) => (
          <div
            key={blocked.id}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-brand-gray p-4"
          >
            <div>
              <p className="font-semibold text-brand-white">
                {new Date(blocked.date).toLocaleDateString("pt-BR", { dateStyle: "long" })}
              </p>
              {blocked.reason && <p className="text-sm text-brand-white/60">{blocked.reason}</p>}
            </div>
            <button
              onClick={() => handleRemove(blocked.id)}
              className="text-sm text-brand-white/60 hover:text-red-400"
            >
              Remover
            </button>
          </div>
        ))}
        {!loading && blockedDates.length === 0 && (
          <p className="text-sm text-brand-white/50">Nenhuma data bloqueada.</p>
        )}
      </div>
    </AdminShell>
  );
}
