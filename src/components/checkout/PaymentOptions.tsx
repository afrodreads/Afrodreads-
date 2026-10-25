"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/format";

type Choice = "DEPOSIT" | "FULL";

// O cliente escolhe pagar o sinal (restante no dia) ou o valor total agora.
export function PaymentOptions({
  bookingId,
  choices,
  depositAmount,
  depositIsPercentage,
  fullAmount,
}: {
  bookingId: string;
  choices: Choice[];
  depositAmount: number;
  depositIsPercentage: boolean;
  fullAmount: number;
}) {
  const [choice, setChoice] = useState<Choice>(choices.includes("DEPOSIT") ? "DEPOSIT" : "FULL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = choice === "FULL" ? fullAmount : depositAmount;

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, choice }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.checkoutUrl) {
        setError(data?.error ?? "Não foi possível iniciar o pagamento.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Não foi possível iniciar o pagamento. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const option = (value: Choice, title: string, price: number, detail: string, badge?: string) => {
    const selected = choice === value;
    return (
      <label
        key={value}
        className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
          selected ? "border-brand-yellow bg-brand-yellow/10" : "border-white/15 hover:border-brand-yellow/60"
        }`}
      >
        <input
          type="radio"
          name="payment-choice"
          value={value}
          checked={selected}
          onChange={() => setChoice(value)}
          className="mt-1 h-4 w-4 accent-brand-yellow"
        />
        <span className="flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-brand-white">{title}</span>
            {badge && (
              <span className="rounded-full bg-brand-yellow px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-black">
                {badge}
              </span>
            )}
          </span>
          <span className="mt-1 block font-display text-2xl text-brand-yellow">{formatBRL(price)}</span>
          <span className="mt-1 block text-xs text-brand-white/60">{detail}</span>
        </span>
      </label>
    );
  };

  return (
    <div className="space-y-4">
      {choices.length > 1 && <p className="text-sm font-semibold text-brand-white/80">Como você prefere pagar?</p>}
      <div className="space-y-3" role="radiogroup" aria-label="Forma de pagamento">
        {choices.includes("DEPOSIT") &&
          option(
            "DEPOSIT",
            depositIsPercentage ? "Pagar o sinal (50%)" : "Pagar o sinal",
            depositAmount,
            `Garante o horário. O restante (${formatBRL(Math.max(0, fullAmount - depositAmount))}) é pago no dia do atendimento.`,
          )}
        {choices.includes("FULL") &&
          option(
            "FULL",
            "Pagar o valor total",
            fullAmount,
            "Resolve tudo agora: no dia é só chegar, sem nada a pagar.",
            choices.length > 1 ? "Mais prático" : undefined,
          )}
      </div>

      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full rounded-full bg-brand-yellow px-6 py-3 text-sm font-bold text-brand-black transition-transform hover:scale-105 disabled:opacity-50"
      >
        {loading ? "Redirecionando..." : `Pagar ${formatBRL(amount)} com Mercado Pago`}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
