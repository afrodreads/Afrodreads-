import { InvalidPhoneError, UniqueConflictError } from "./errors";
import { normalizePhone } from "./phone";
import type { ConversationsStore } from "./repo";
import type { CustomerRecord } from "./types";

export type FindOrCreateCustomerInput = {
  unitId: string;
  /** Telefone como veio do canal/formulário (será normalizado). */
  phone: string;
  name?: string | null;
};

export type FindOrCreateCustomerResult = { customer: CustomerRecord; created: boolean };

function cleanName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 120);
}

/**
 * Encontra o cliente pelo (unidade, telefone normalizado) ou cria. Nunca
 * duplica: o banco tem uma restrição única e, se duas chamadas simultâneas
 * tentarem criar, a que perde relê o registro da vencedora.
 *
 * O nome só é preenchido quando o cliente ainda não tem um: nomes vindos do
 * perfil do WhatsApp não devem sobrescrever o que a equipe já registrou.
 */
export async function findOrCreateCustomer(
  store: ConversationsStore,
  input: FindOrCreateCustomerInput,
): Promise<FindOrCreateCustomerResult> {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new InvalidPhoneError();
  const name = cleanName(input.name);

  const existing = await store.transaction((repo) => repo.findCustomerByPhone(input.unitId, phone));
  if (existing) {
    return { customer: await fillName(store, existing, name), created: false };
  }

  try {
    const customer = await store.transaction((repo) =>
      repo.createCustomer({ unitId: input.unitId, phone, name }),
    );
    return { customer, created: true };
  } catch (error) {
    if (!(error instanceof UniqueConflictError)) throw error;
    // Outra chamada criou no mesmo instante: reaproveita o registro dela.
    const winner = await store.transaction((repo) => repo.findCustomerByPhone(input.unitId, phone));
    if (!winner) throw error;
    return { customer: await fillName(store, winner, name), created: false };
  }
}

async function fillName(
  store: ConversationsStore,
  customer: CustomerRecord,
  name: string | null,
): Promise<CustomerRecord> {
  if (customer.name || !name) return customer;
  await store.transaction((repo) => repo.setCustomerNameIfEmpty(customer.id, name));
  return { ...customer, name };
}
