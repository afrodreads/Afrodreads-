import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookingFlow } from "@/components/booking/BookingFlow";

// Link de orçamento individual (token privado) — nunca deve ser indexado.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function QuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const quote = await prisma.quote.findUnique({ where: { token }, include: { service: true } });

  if (!quote) {
    return <QuoteMessage title="Link inválido" message="Confira o link recebido e tente novamente." />;
  }

  if (quote.status === "CANCELLED") {
    return (
      <QuoteMessage
        title="Orçamento cancelado"
        message="Este orçamento foi cancelado. Fale com a Afro Dreads para gerar um novo."
      />
    );
  }

  if (quote.status === "COMPLETED") {
    redirect(`/checkout/${quote.bookingId}`);
  }

  const isExpired = quote.expiresAt < new Date();
  if (isExpired) {
    return (
      <QuoteMessage
        title="Link expirado"
        message="Este link expirou. Peça um novo à Afro Dreads."
      />
    );
  }

  if (quote.status === "SENT") {
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: "OPENED", openedAt: new Date() },
    });
  }

  return (
    <BookingFlow
      quote={{
        token: quote.token,
        serviceSlug: quote.service.slug,
        serviceName: quote.service.name,
        servicePrice: Number(quote.servicePrice),
        isOutOfTownSeason: quote.isOutOfTownSeason,
      }}
    />
  );
}

function QuoteMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto max-w-xl px-6 pb-24 pt-32 text-center">
      <h1 className="font-display text-3xl uppercase text-brand-white">{title}</h1>
      <p className="mt-4 text-brand-white/60">{message}</p>
    </div>
  );
}
