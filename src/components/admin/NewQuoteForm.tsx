"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/format";
import { QUOTE_CHOICE_LABEL, type QuotePaymentChoices } from "@/lib/paymentOptions";

type ServiceOption = { slug: string; name: string; basePrice: number | null };

export function NewQuoteForm() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [serviceSlug, setServiceSlug] = useState("");
  const [paymentOptions, setPaymentOptions] = useState<QuotePaymentChoices>("CLIENT_CHOICE");
  const [basePrices, setBasePrices] = useState<Record<string, number | null>>({});
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const servicePrice = priceOverrides[serviceSlug] ?? basePrices[serviceSlug] ?? 0;
  const setServicePrice = (value: number) =>
    setPriceOverrides((prev) => ({ ...prev, [serviceSlug]: value }));
  const [isOutOfTownSeason, setIsOutOfTownSeason] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => {
        const list: ServiceOption[] = data.services ?? [];
        const map: Record<string, number | null> = {};
        for (const service of list) {
          map[service.slug] = service.basePrice;
        }
        setServices(list);
        setBasePrices(map);
        setServiceSlug((current) => current || list[0]?.slug || "");
      })
      .catch(() => {});
  }, []);

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
        body: JSON.stringify({ serviceSlug, servicePrice, isOutOfTownSeason, paymentOptions }),
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
    const service = services.find((s) => s.slug === serviceSlug);
    const howToPay =
      paymentOptions === "DEPOSIT_ONLY"
        ? "Para garantir o horário, é só pagar o sinal pelo próprio link."
        : paymentOptions === "FULL_ONLY"
          ? "Para garantir o horário, é só pagar pelo próprio link."
          : "Para garantir o horário, você escolhe: pagar só o sinal ou já pagar o valor total.";
    const message = [
      `Oi! Aqui é da Afro Dreads 💛 Segue o seu link para agendar ${service?.name ?? "o serviço"} (valor: ${formatBRL(servicePrice)}):`,
      generatedUrl,
      `No link você vê os dias com vaga e escolhe o melhor para você. ${howToPay} O horário fica reservado enquanto você paga, e o link vale por 48 horas.`,
    ].join("\n\n");
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
            {services.map((service) => (
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

      <div>
        <label className="mb-2 block text-sm font-medium text-brand-white/80">Pagamento no link</label>
        <select
          value={paymentOptions}
          onChange={(e) => setPaymentOptions(e.target.value as QuotePaymentChoices)}
          className="rounded-lg border border-white/20 bg-brand-black px-4 py-3 text-brand-white"
        >
          {(Object.keys(QUOTE_CHOICE_LABEL) as QuotePaymentChoices[]).map((value) => (
            <option key={value} value={value}>
              {QUOTE_CHOICE_LABEL[value]}
            </option>
          ))}
        </select>
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
        disabled={submitting || !servicePrice || !serviceSlug}
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
