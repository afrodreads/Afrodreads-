import { findOrCreateCustomer } from "./customer";
import { normalizePhone } from "./phone";
import type { ConversationsStore } from "./repo";
import { resolveUnit } from "./unit";

export type LinkBookingResult =
  | { kind: "linked"; customerId: string; unitId: string; customerCreated: boolean }
  | { kind: "already_linked"; customerId: string }
  | { kind: "not_found" }
  // Telefone do agendamento que não dá para normalizar com segurança (dados
  // antigos ou digitados livremente): o agendamento segue válido, só sem cliente.
  | { kind: "skipped"; reason: "invalid_phone" };

/**
 * Relaciona um agendamento a um Customer (criando o cliente se preciso).
 *
 * Retrocompatível por desenho: Booking.customerId é opcional, então
 * agendamentos antigos continuam funcionando sem vínculo; esta função pode ser
 * chamada para qualquer um deles quando quiser (inclusive num backfill futuro).
 * Nunca altera os dados do agendamento além de customerId/unitId, e nunca
 * troca um vínculo que já existe.
 */
export async function linkBookingToCustomer(
  store: ConversationsStore,
  params: { bookingId: string; unitId?: string | null },
): Promise<LinkBookingResult> {
  const booking = await store.transaction((repo) => repo.findBookingForLink(params.bookingId));
  if (!booking) return { kind: "not_found" };
  if (booking.customerId) return { kind: "already_linked", customerId: booking.customerId };

  if (!normalizePhone(booking.clientPhone)) return { kind: "skipped", reason: "invalid_phone" };

  const unit = await store.transaction((repo) =>
    resolveUnit(repo, { unitId: params.unitId ?? booking.unitId }),
  );

  const { customer, created } = await findOrCreateCustomer(store, {
    unitId: unit.id,
    phone: booking.clientPhone,
    name: booking.clientName,
  });

  const linked = await store.transaction((repo) => repo.linkBooking(booking.id, customer.id, unit.id));
  if (!linked) {
    // Outra chamada vinculou no mesmo instante.
    const current = await store.transaction((repo) => repo.findBookingForLink(booking.id));
    if (current?.customerId) return { kind: "already_linked", customerId: current.customerId };
    return { kind: "not_found" };
  }

  return { kind: "linked", customerId: customer.id, unitId: unit.id, customerCreated: created };
}
