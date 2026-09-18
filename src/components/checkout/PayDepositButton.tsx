"use client";

import { useState } from "react";

export function PayDepositButton({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
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

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-full bg-brand-yellow px-6 py-3 text-sm font-bold text-brand-black transition-transform hover:scale-105 disabled:opacity-50"
      >
        {loading ? "Redirecionando..." : "Pagar sinal com Mercado Pago"}
      </button>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
