import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function BookingSuccessPage() {
  return (
    <div className="mx-auto max-w-xl px-6 pb-24 pt-40 text-center">
      <h1 className="font-display text-3xl uppercase text-brand-white sm:text-4xl">
        Pagamento recebido! 🎉
      </h1>
      <p className="mt-4 text-brand-white/70">
        Seu sinal foi processado e seu horário está confirmado. Você vai receber os detalhes
        por e-mail em instantes.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-brand-yellow px-6 py-3 text-sm font-bold text-brand-black"
      >
        Voltar para o site
      </Link>
    </div>
  );
}
