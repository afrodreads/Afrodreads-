import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDateTimeBR } from "@/lib/format";
import { PaymentOptions } from "@/components/checkout/PaymentOptions";
import { ReservationCountdown } from "@/components/checkout/ReservationCountdown";
import { effectivePaymentDeadline, isPaymentWindowOpen } from "@/lib/bookingRules";
import { allowedChoices, fullDiffersFromDeposit } from "@/lib/paymentOptions";

// Página transacional (dados de um agendamento específico) — nunca deve
// ser indexada.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Relógio fora do componente (a regra do React não permite ler a hora atual na renderização). */
function loadNow(): Date {
  return new Date();
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, quote: { select: { paymentOptions: true } } },
  });

  if (!booking) notFound();

  const now = loadNow();
  const open = isPaymentWindowOpen(booking, now);
  const amounts = { servicePrice: Number(booking.servicePrice), depositAmount: Number(booking.depositAmount) };
  // Se o valor do serviço não passa do sinal, só existe uma opção.
  const choices = fullDiffersFromDeposit(amounts) ? allowedChoices(booking.quote?.paymentOptions) : (["DEPOSIT"] as const);
  const paidFull = booking.paymentOption === "FULL";

  return (
    <div className="mx-auto max-w-xl px-6 pb-24 pt-32">
      {open && (
        <ReservationCountdown deadline={effectivePaymentDeadline(booking).toISOString()} serverNow={now.toISOString()} />
      )}

      <h1 className="mt-6 font-display text-3xl uppercase text-brand-white sm:text-4xl">
        {open ? "Confirme e garanta seu horário" : "Seu agendamento"}
      </h1>

      <div className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-brand-gray p-6">
        <Row label="Serviço" value={booking.service.name} />
        <Row label="Data e horário" value={formatDateTimeBR(booking.scheduledStart)} />
        <Row label="Valor do serviço" value={formatBRL(amounts.servicePrice)} />
        {booking.status === "CONFIRMED" && (
          <Row label="Restante no dia" value={formatBRL(paidFull ? 0 : Number(booking.remainingAmount))} highlight />
        )}

        <p className="pt-2 text-xs text-brand-white/50">
          Pix, boleto ou cartão de crédito (parcelamento sujeito aos juros do Mercado Pago).
        </p>
      </div>

      <div className="mt-8">
        {open ? (
          <PaymentOptions
            bookingId={booking.id}
            choices={[...choices]}
            depositAmount={amounts.depositAmount}
            depositIsPercentage={booking.depositIsPercentage}
            fullAmount={amounts.servicePrice}
          />
        ) : (
          <p className="text-sm text-brand-white/70">
            {booking.status === "CONFIRMED"
              ? paidFull
                ? "Seu agendamento está confirmado e totalmente pago. Obrigado!"
                : "Seu agendamento já está confirmado. Obrigado!"
              : booking.status === "CANCELLED"
                ? "Este agendamento foi cancelado. Fale com a Afro Dreads se quiser agendar de novo."
                : "O tempo de reserva deste horário terminou. Fale com a Afro Dreads para receber um novo link."}
          </p>
        )}
      </div>

      {open && (
        <p className="mt-6 text-xs text-brand-white/50">
          Cancelamentos com 2 dias ou mais de antecedência têm o valor pago devolvido. Com menos de 2 dias, o sinal não é
          devolvido (quem pagou o valor total recebe de volta tudo menos o sinal).
        </p>
      )}
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
