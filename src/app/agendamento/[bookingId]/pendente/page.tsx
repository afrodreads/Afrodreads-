import Link from "next/link";

export default function BookingPendingPage() {
  return (
    <div className="mx-auto max-w-xl px-6 pb-24 pt-40 text-center">
      <h1 className="font-display text-3xl font-bold text-brand-white">
        Pagamento em análise
      </h1>
      <p className="mt-4 text-brand-white/70">
        Recebemos seu pagamento (via boleto ou em análise) e assim que for aprovado seu
        horário será confirmado automaticamente.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-brand-white"
      >
        Voltar para o site
      </Link>
    </div>
  );
}
