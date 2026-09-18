import Link from "next/link";

export default async function BookingErrorPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  return (
    <div className="mx-auto max-w-xl px-6 pb-24 pt-40 text-center">
      <h1 className="font-display text-3xl uppercase text-brand-white sm:text-4xl">
        Não foi possível concluir o pagamento
      </h1>
      <p className="mt-4 text-brand-white/70">
        Seu agendamento ainda está reservado por um tempo limitado. Tente novamente ou
        escolha outra forma de pagamento.
      </p>
      <Link
        href={`/checkout/${bookingId}`}
        className="mt-8 inline-block rounded-full bg-brand-yellow px-6 py-3 text-sm font-bold text-brand-black"
      >
        Tentar novamente
      </Link>
    </div>
  );
}
