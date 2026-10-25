import { Prisma } from "@prisma/client";
import { UniqueConflictError } from "../conversations/errors";

// Utilidades dos adaptadores de banco do agente. Aqui não há regra de negócio.

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function mapUnique<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (isUniqueViolation(error)) throw new UniqueConflictError();
    throw error;
  }
}

/** Valor para coluna Json opcional: objeto → JSON; null/undefined → NULL do banco. */
export function jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null || value === undefined ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

/** Dia de calendário (coluna @db.Date) como AAAA-MM-DD. */
export function dateKeyOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function stringList(value: Prisma.JsonValue | null | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
