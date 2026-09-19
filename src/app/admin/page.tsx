import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";
import { BookingsList } from "@/components/admin/BookingsList";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const bookings = await prisma.booking.findMany({
    where: { scheduledStart: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
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
  }));

  return (
    <AdminShell>
      <h1 className="font-display text-3xl uppercase text-brand-white">Próximos agendamentos</h1>

      {bookings.length === 0 && (
        <p className="mt-6 text-sm text-brand-white/60">Nenhum agendamento futuro por enquanto.</p>
      )}

      <BookingsList bookings={serializedBookings} />
    </AdminShell>
  );
}
