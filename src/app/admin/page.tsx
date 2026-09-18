import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  COMPLETED: "Concluído",
  NO_SHOW: "Não compareceu",
};

export default async function AdminDashboardPage() {
  const bookings = await prisma.booking.findMany({
    where: { scheduledStart: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    orderBy: { scheduledStart: "asc" },
    include: { service: true },
    take: 50,
  });

  return (
    <AdminShell>
      <h1 className="font-display text-3xl uppercase text-brand-white">Próximos agendamentos</h1>

      {bookings.length === 0 && (
        <p className="mt-6 text-sm text-brand-white/60">Nenhum agendamento futuro por enquanto.</p>
      )}

      <div className="mt-6 space-y-3">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="rounded-xl border border-white/10 bg-brand-gray p-4 sm:flex sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold text-brand-white">
                {booking.service.name} — {booking.clientName}
              </p>
              <p className="text-sm text-brand-white/60">
                {booking.scheduledStart.toLocaleString("pt-BR", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}{" "}
                · {booking.clientPhone} · {booking.clientEmail}
              </p>
            </div>
            <div className="mt-3 text-sm sm:mt-0 sm:text-right">
              <p className="font-semibold text-brand-yellow">
                {STATUS_LABEL[booking.status] ?? booking.status}
              </p>
              <p className="text-brand-white/60">
                Sinal {formatBRL(Number(booking.depositAmount))} · Total{" "}
                {formatBRL(Number(booking.servicePrice))}
              </p>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
