"use client";

import { useState } from "react";
import { formatBRL, formatDateTimeBR, formatTimeBR } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  COMPLETED: "Concluído",
  NO_SHOW: "Não compareceu",
};

export type AdminBooking = {
  id: string;
  serviceName: string;
  serviceSlug: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  scheduledStart: string;
  status: string;
  depositAmount: number;
  servicePrice: number;
};

export function BookingsList({ bookings: initialBookings }: { bookings: AdminBooking[] }) {
  const [bookings, setBookings] = useState(initialBookings);

  return (
    <div className="mt-6 space-y-3">
      {bookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onUpdate={(updated) =>
            setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
          }
        />
      ))}
    </div>
  );
}

function BookingCard({
  booking,
  onUpdate,
}: {
  booking: AdminBooking;
  onUpdate: (booking: AdminBooking) => void;
}) {
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAct = booking.status === "PENDING_PAYMENT" || booking.status === "CONFIRMED";

  async function handleCancel() {
    if (!confirm("Cancelar este agendamento?")) return;
    setCancelling(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!response.ok) throw new Error();
      onUpdate({ ...booking, status: "CANCELLED" });
    } catch {
      setError("Não foi possível cancelar. Tente novamente.");
    } finally {
      setCancelling(false);
    }
  }

  async function handleDateChange(value: string) {
    setDate(value);
    setSlots([]);
    if (!value) return;
    setLoadingSlots(true);
    try {
      const response = await fetch(
        `/api/availability?service=${booking.serviceSlug}&date=${value}`,
      );
      const data = await response.json();
      setSlots(data.slots ?? []);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handlePickSlot(slot: string) {
    setError(null);
    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule", scheduledStart: slot }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível reagendar.");
        return;
      }
      onUpdate({ ...booking, scheduledStart: data.booking.scheduledStart });
      setRescheduling(false);
      setDate("");
      setSlots([]);
    } catch {
      setError("Não foi possível reagendar. Tente novamente.");
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-brand-gray p-4">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-brand-white">
            {booking.serviceName} — {booking.clientName}
          </p>
          <p className="text-sm text-brand-white/60">
            {formatDateTimeBR(new Date(booking.scheduledStart))} · {booking.clientPhone} ·{" "}
            {booking.clientEmail}
          </p>
        </div>
        <div className="mt-3 text-sm sm:mt-0 sm:text-right">
          <p className="font-semibold text-brand-yellow">
            {STATUS_LABEL[booking.status] ?? booking.status}
          </p>
          <p className="text-brand-white/60">
            Sinal {formatBRL(booking.depositAmount)} · Total {formatBRL(booking.servicePrice)}
          </p>
        </div>
      </div>

      {canAct && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
          <button
            onClick={() => setRescheduling((v) => !v)}
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-brand-white/80 hover:border-brand-yellow"
          >
            {rescheduling ? "Fechar" : "Reagendar"}
          </button>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="rounded-full border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-400 hover:border-red-500 disabled:opacity-50"
          >
            {cancelling ? "Cancelando..." : "Cancelar"}
          </button>
        </div>
      )}

      {rescheduling && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          <input
            type="date"
            value={date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => handleDateChange(e.target.value)}
            className="rounded-lg border border-white/20 bg-brand-black px-3 py-2 text-sm text-brand-white"
          />
          {loadingSlots && <p className="text-xs text-brand-white/50">Carregando horários...</p>}
          {!loadingSlots && date && slots.length === 0 && (
            <p className="text-xs text-brand-white/50">Sem horários disponíveis nesta data.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                key={slot}
                onClick={() => handlePickSlot(slot)}
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-brand-white/80 hover:border-brand-yellow hover:text-brand-yellow"
              >
                {formatTimeBR(new Date(slot))}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
