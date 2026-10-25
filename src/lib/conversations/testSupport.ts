import { MemoryConversations } from "./memoryRepo";
import type { ConversationRecord } from "./types";
import { findOrCreateConversation } from "./conversation";
import { findOrCreateCustomer } from "./customer";

// Utilitários só dos testes (este arquivo não é importado pelo app).

export const NOW = new Date("2026-10-01T12:00:00-03:00");

export const validSummary = {
  headline: "Quer orçamento de microlocs",
  customerNeed: "Já tem dreads de outro salão e quer trocar de método.",
  collected: { metodo: "microlocs", espessura: "P" },
  openQuestions: ["Enviar foto do cabelo atual"],
};

export function setup() {
  const db = new MemoryConversations();
  const unit = db.addUnit({ slug: "principal", name: "Unidade principal" });
  return { db, unit };
}

/** Cria cliente + conversa prontos (modo BOT). */
export async function newConversation(
  db: MemoryConversations,
  unitId: string,
  phone = "11987654321",
  externalId?: string,
): Promise<ConversationRecord> {
  const { customer } = await findOrCreateCustomer(db, { unitId, phone, name: "Maria" });
  const { conversation } = await findOrCreateConversation(db, {
    unitId,
    customer,
    externalId: externalId ?? null,
    now: NOW,
  });
  return conversation;
}
