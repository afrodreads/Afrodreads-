import { UnitNotFoundError, UnitRequiredError } from "./errors";
import type { ConversationsRepo } from "./repo";
import type { UnitRecord } from "./types";

/**
 * Resolve a unidade sem nada fixo no código:
 *  - com `unitId` ou `slug`: usa essa unidade (se existir e estiver ativa);
 *  - sem nenhum dos dois: só funciona se houver EXATAMENTE uma unidade ativa
 *    (o cenário de hoje). Com várias, exige que o chamador diga qual.
 */
export async function resolveUnit(
  repo: ConversationsRepo,
  hint: { unitId?: string | null; slug?: string | null } = {},
): Promise<UnitRecord> {
  if (hint.unitId) {
    const unit = await repo.findUnitById(hint.unitId);
    if (!unit || !unit.active) throw new UnitNotFoundError();
    return unit;
  }
  if (hint.slug) {
    const unit = await repo.findUnitBySlug(hint.slug);
    if (!unit || !unit.active) throw new UnitNotFoundError();
    return unit;
  }

  const active = await repo.listActiveUnits();
  if (active.length === 0) throw new UnitNotFoundError();
  if (active.length > 1) throw new UnitRequiredError();
  return active[0];
}
