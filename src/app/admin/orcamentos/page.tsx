import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { NewQuoteForm } from "@/components/admin/NewQuoteForm";
import { QuotesList } from "@/components/admin/QuotesList";

export const dynamic = "force-dynamic";

export default async function AdminQuotesPage() {
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: { service: true },
    take: 50,
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const serializedQuotes = quotes.map((quote) => ({
    id: quote.id,
    serviceName: quote.service.name,
    servicePrice: Number(quote.servicePrice),
    isOutOfTownSeason: quote.isOutOfTownSeason,
    status: quote.status,
    expiresAt: quote.expiresAt.toISOString(),
    createdAt: quote.createdAt.toISOString(),
    bookingId: quote.bookingId,
    url: `${siteUrl}/orcamento/${quote.token}`,
  }));

  return (
    <AdminShell>
      <h1 className="font-display text-3xl uppercase text-brand-white">Orçamentos</h1>
      <p className="mt-2 text-sm text-brand-white/60">
        Gere um link com serviço e valor já definidos para enviar ao cliente por WhatsApp. O link
        expira em 48h.
      </p>

      <NewQuoteForm />

      {quotes.length === 0 && (
        <p className="mt-6 text-sm text-brand-white/60">Nenhum orçamento gerado ainda.</p>
      )}

      <QuotesList quotes={serializedQuotes} />
    </AdminShell>
  );
}
