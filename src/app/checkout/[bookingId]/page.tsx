import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import { PayDepositButton } from "@/components/checkout/PayDepositButton";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true },
  });

  if (!booking) notFound();

  return (
    <div className="mx-auto max-w-xl px-6 pb-24 pt-32">
      <h1 className="font-display text-3xl font-bold text-brand-white">Confirme e pague o sinal</h1>

      <div className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-brand-gray p-6">
        <Row label="Serviço" value={booking.service.name} />
        <Row
          label="Data e horário"
          value={booking.scheduledStart.toLocaleString("pt-BR", {
            dateStyle: "long",
            timeStyle: "short",
          })}
        />
        <Row label="Valor do serviço" value={formatBRL(Number(booking.servicePrice))} />
        <Row label="Sinal a pagar agora" value={formatBRL(Number(booking.depositAmount))} highlight />
        <Row label="Restante no dia" value={formatBRL(Number(booking.remainingAmount))} />

        <p className="pt-2 text-xs text-brand-white/50">
          Pix, boleto ou cartão de crédito (parcelamento sujeito aos juros do Mercado Pago).
        </p>
      </div>

      <div className="mt-8">
        <PayDepositButton bookingId={booking.id} />
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0">
      <span className="text-sm text-brand-white/60">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-brand-yellow" : "text-brand-white"}`}>
        {value}
      </span>
    </div>
  );
}
