import { DomainError } from "../conversations/errors";

// Quem pode executar ações sensíveis (confirmar pagamento manual, estender
// prazo). Só uma pessoa ATIVA da equipe (StaffUser), com papel que tenha a
// permissão e da unidade do recurso. A IA, o SYSTEM e o cliente são recusados:
// eles nem conseguem montar um `StaffActor` válido (não existe usuário da
// equipe para eles) e não há ferramenta do modelo que chegue aqui.

export type StaffRole = "ADMIN" | "ATTENDANT";

export type StaffActor = { type: "STAFF"; staffId: string };

export type StaffRecord = {
  id: string;
  name: string;
  role: StaffRole;
  /** null = sem unidade (só faz sentido para ADMIN: acesso a todas). */
  unitId: string | null;
  active: boolean;
};

export interface StaffDirectory {
  findStaff(staffId: string): Promise<StaffRecord | null>;
}

export type StaffPermission = "CONFIRM_MANUAL_PAYMENT" | "EXTEND_PAYMENT_DEADLINE";

// Papéis mínimos: ADMIN e ATTENDANT fazem o atendimento do dia a dia.
const PERMISSIONS: Record<StaffRole, readonly StaffPermission[]> = {
  ADMIN: ["CONFIRM_MANUAL_PAYMENT", "EXTEND_PAYMENT_DEADLINE"],
  ATTENDANT: ["CONFIRM_MANUAL_PAYMENT", "EXTEND_PAYMENT_DEADLINE"],
};

export type NotAuthorizedReason =
  | "not_staff"
  | "unknown_staff"
  | "inactive_staff"
  | "missing_permission"
  | "other_unit";

export class NotAuthorizedError extends DomainError {
  constructor(readonly reason: NotAuthorizedReason) {
    super("not_authorized", "Ação restrita a uma pessoa autorizada da equipe.");
  }
}

/** Só confere o formato (antes de qualquer leitura no banco). */
export function assertStaffActor(actor: unknown): asserts actor is StaffActor {
  const candidate = actor as { type?: unknown; staffId?: unknown } | null;
  const staffId = typeof candidate?.staffId === "string" ? candidate.staffId.trim() : "";
  if (!candidate || candidate.type !== "STAFF" || staffId.length === 0 || staffId.length > 64) {
    throw new NotAuthorizedError("not_staff");
  }
}

/**
 * Autoriza uma pessoa da equipe para uma ação num recurso de uma unidade.
 *
 * Isolamento entre unidades:
 *  - ADMIN sem unidade: qualquer unidade;
 *  - demais: só a própria unidade;
 *  - recurso sem unidade (agendamento antigo): só ADMIN.
 */
export async function authorizeStaff(
  directory: StaffDirectory,
  actor: unknown,
  permission: StaffPermission,
  resource: { unitId: string | null },
): Promise<StaffRecord> {
  assertStaffActor(actor);

  const staff = await directory.findStaff(actor.staffId.trim());
  if (!staff) throw new NotAuthorizedError("unknown_staff");
  if (!staff.active) throw new NotAuthorizedError("inactive_staff");
  if (!PERMISSIONS[staff.role]?.includes(permission)) throw new NotAuthorizedError("missing_permission");

  const globalAdmin = staff.role === "ADMIN" && staff.unitId === null;
  if (!globalAdmin) {
    if (resource.unitId === null) {
      if (staff.role !== "ADMIN") throw new NotAuthorizedError("other_unit");
    } else if (staff.unitId !== resource.unitId) {
      throw new NotAuthorizedError("other_unit");
    }
  }

  return staff;
}
