"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SERVICES } from "@/lib/services";

export function NewQuoteForm() {
  const router = useRouter();
  const [serviceSlug, setServiceSlug] = useState(SERVICES[0].slug);
  const [basePrices, setBasePrices] = useState<Record<string, number | null>>({});
  const [servicePrice, setServicePrice] = useState<number>(0);
  const [isOutOfTownSeason, setIsOutOfTownSeason] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => {
        const map: Record<string, number | null> = {};
        for (const service of data.services ?? []) {
          map[service.slug] = service.basePrice;
        }
        setBasePrices(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setServicePrice(basePrices[serviceSlug] ?? 0);
  }, [serviceSlug, basePrices]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setGeneratedUrl(null);
    setCopied(false);
    try {
      const response = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceSlug, servicePrice, isOutOfTownSeason }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível gerar o orçamento.");
        return;
      }
      setGeneratedUrl(data.url);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyMessage() {
    if (!generatedUrl) return;
    const service = SERVICES.find((s) => s.slug === serviceSlug);
    const message = `Olá! Segue o link para finalizar seu agendamento de ${service?.name} na Afro Dreads: ${generatedUrl}`;
    navigator.clipboard.writeText(message).then(() => setCopied(true));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-brand-gray p-6"
    >
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-brand-white/80">Serviço</label>
          <select
            value={serviceSlug}
            onChange={(e) => setServiceSlug(e.target.value)}
            className="rounded-lg border border-white/20 bg-brand-black px-4 py-3 text-brand-white"
          >
            {SERVICES.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-brand-white/80">
            Valor combinado (R$)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={servicePrice || ""}
            onChange={(e) => setServicePrice(Number(e.target.value))}
            className="rounded-lg border border-white/20 bg-brand-black px-4 py-3 text-brand-white"
          />
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm text-brand-white/80">
        <input
          type="checkbox"
          checked={isOutOfTownSeason}
          onChange={(e) => setIsOutOfTownSeason(e.target.checked)}
          className="h-4 w-4 accent-brand-yellow"
        />
        Atendimento por temporada, fora de São Paulo
      </label>

      <button
        type="submit"
        disabled={submitting || !servicePrice}
        className="rounded-full bg-brand-yellow px-6 py-2 text-sm font-bold text-brand-black disabled:opacity-50"
      >
        {submitting ? "Gerando..." : "Gerar link"}
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {generatedUrl && (
        <div className="rounded-lg bg-brand-black/60 p-4 text-sm">
          <p className="break-all text-brand-yellow">{generatedUrl}</p>
          <button
            type="button"
            onClick={handleCopyMessage}
            className="mt-3 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-brand-white/80 hover:border-brand-yellow"
          >
            {copied ? "Mensagem copiada!" : "Copiar mensagem para WhatsApp"}
          </button>
        </div>
      )}
    </form>
  );
}
