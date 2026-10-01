import { linkBookingToCustomer } from "./bookingLink";
import { prismaConversationsStore } from "./prismaRepo";

/**
 * Vincula um agendamento recém-criado a um Customer SEM nunca atrapalhar o
 * agendamento: qualquer falha (telefone estranho, banco, migração ainda não
 * aplicada) é registrada no log e engolida. O agendamento já existe e continua
 * válido sem vínculo; ele pode ser vinculado depois.
 */
export async function linkBookingToCustomerBestEffort(bookingId: string): Promise<void> {
  try {
    const result = await linkBookingToCustomer(prismaConversationsStore, { bookingId });
    if (result.kind === "skipped") {
      console.warn("Agendamento não vinculado a cliente", { bookingId, reason: result.reason });
    }
  } catch (error) {
    console.error("Falha ao vincular agendamento a cliente (ignorada)", {
      bookingId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
