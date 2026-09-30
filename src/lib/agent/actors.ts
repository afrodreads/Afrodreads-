import { DomainError } from "../conversations/errors";

// Quem pode executar ações sensíveis (confirmar pagamento, estender prazo).
// Só uma pessoa autorizada da equipe ("STAFF", identificada). A IA, o sistema e
// o cliente são recusados. O tipo ajuda em tempo de compilação; `assertStaff`
// garante em tempo de execução, porque um valor vindo de uma rota não tem tipo.

export type StaffActor = { type: "STAFF"; userId: string };

export class NotAuthorizedError extends DomainError {
  constructor() {
    super("not_authorized", "Ação restrita a uma pessoa autorizada da equipe.");
  }
}

export function assertStaff(actor: unknown): asserts actor is StaffActor {
  const candidate = actor as { type?: unknown; userId?: unknown } | null;
  const userId = typeof candidate?.userId === "string" ? candidate.userId.trim() : "";
  if (!candidate || candidate.type !== "STAFF" || userId.length === 0 || userId.length > 80) {
    throw new NotAuthorizedError();
  }
}
