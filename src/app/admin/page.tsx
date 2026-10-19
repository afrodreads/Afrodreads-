import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { BookingsList } from "@/components/admin/BookingsList";
import { AdminAgenda } from "@/components/admin/AdminAgenda";
import { saoPauloDateKey, startOfSaoPauloDay } from "@/lib/timezone";

export const dynamic = "force-dynamic";

/** Relógio fora do componente (a regra do React não permite ler a hora atual na renderização). */
function loadNow(): Date {
  return new Date();
}

export default async function AdminDashboardPage() {
  const now = loadNow();
  const bookings = await prisma.booking.findMany({
    // "Hoje" no calendário de São Paulo (o servidor roda em UTC).
    where: { scheduledStart: { gte: startOfSaoPauloDay(now) } },
    orderBy: { scheduledStart: "asc" },
    include: { service: true },
    take: 50,
  });

  const serializedBookings = bookings.map((booking) => ({
    id: booking.id,
    serviceName: booking.service.name,
    serviceSlug: booking.service.slug,
    clientName: booking.clientName,
    clientPhone: booking.clientPhone,
    clientEmail: booking.clientEmail,
    scheduledStart: booking.scheduledStart.toISOString(),
    status: booking.status,
    depositAmount: Number(booking.depositAmount),
    servicePrice: Number(booking.servicePrice),
    paymentOption: booking.paymentOption,
    forced: booking.forced,
  }));

  return (
    <AdminShell>
      <h1 className="mb-4 font-display text-3xl uppercase text-brand-white">Agenda</h1>
      <AdminAgenda initialMonth={saoPauloDateKey(now).slice(0, 7)} />

      <h2 className="font-display text-2xl uppercase text-brand-white">Próximos agendamentos</h2>

      {bookings.length === 0 && (
        <p className="mt-6 text-sm text-brand-white/60">Nenhum agendamento futuro por enquanto.</p>
      )}

      <BookingsList bookings={serializedBookings} />
    </AdminShell>
  );
}
