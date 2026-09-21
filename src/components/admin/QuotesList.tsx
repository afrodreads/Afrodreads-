"use client";

import { useState } from "react";
import { formatBRL, formatDateTimeBR } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  SENT: "Enviado",
  OPENED: "Aberto",
  COMPLETED: "Concluído",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
};

export type AdminQuote = {
  id: string;
  serviceName: string;
  servicePrice: number;
  isOutOfTownSeason: boolean;
  status: string;
  expiresAt: string;
  createdAt: string;
  bookingId: string | null;
  url: string;
};

function effectiveStatus(quote: AdminQuote): string {
  if (
    (quote.status === "SENT" || quote.status === "OPENED") &&
    new Date(quote.expiresAt) < new Date()
  ) {
    return "EXPIRED";
  }
  return quote.status;
}

export function QuotesList({ quotes: initialQuotes }: { quotes: AdminQuote[] }) {
  const [quotes, setQuotes] = useState(initialQuotes);

  return (
    <div className="mt-6 space-y-3">
      {quotes.map((quote) => (
        <QuoteCard
          key={quote.id}
          quote={quote}
          onUpdate={(updated) =>
            setQuotes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)))
          }
        />
      ))}
    </div>
  );
}

function QuoteCard({
  quote,
  onUpdate,
}: {
  quote: AdminQuote;
  onUpdate: (quote: AdminQuote) => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState(false);
  const status = effectiveStatus(quote);
  const canCancel = status === "SENT" || status === "OPENED";

  async function handleCancel() {
    if (!confirm("Cancelar este orçamento?")) return;
    setCancelling(true);
    try {
      const response = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!response.ok) throw new Error();
      onUpdate({ ...quote, status: "CANCELLED" });
    } finally {
      setCancelling(false);
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(quote.url).then(() => setCopied(true));
  }

  return (
    <div className="rounded-xl border border-white/10 bg-brand-gray p-4">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-brand-white">{quote.serviceName}</p>
          <p className="text-sm text-brand-white/60">
            {formatBRL(quote.servicePrice)}
            {quote.isOutOfTownSeason && " · Fora de SP"} · Criado em{" "}
            {formatDateTimeBR(new Date(quote.createdAt))}
          </p>
        </div>
        <p className="mt-3 text-sm font-semibold text-brand-yellow sm:mt-0">
          {STATUS_LABEL[status] ?? status}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
        {status === "SENT" || status === "OPENED" ? (
          <button
            onClick={handleCopyLink}
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-brand-white/80 hover:border-brand-yellow"
          >
            {copied ? "Link copiado!" : "Copiar link"}
          </button>
        ) : null}
        {quote.bookingId && (
          <a
            href={`/checkout/${quote.bookingId}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-brand-white/80 hover:border-brand-yellow"
          >
            Ver agendamento
          </a>
        )}
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="rounded-full border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-400 hover:border-red-500 disabled:opacity-50"
          >
            {cancelling ? "Cancelando..." : "Cancelar"}
          </button>
        )}
      </div>
    </div>
  );
}
