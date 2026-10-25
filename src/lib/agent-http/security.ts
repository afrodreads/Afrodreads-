import { createHash, timingSafeEqual } from "node:crypto";

// Autenticação e limite de requisições da entrada do agente.

/**
 * Compara o segredo recebido com o esperado em tempo constante. Os dois lados
 * passam por SHA-256 antes, então o tempo não revela nem o tamanho do segredo.
 */
export function secretsMatch(provided: string | null | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = createHash("sha256").update(provided, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

/** Segredo do cabeçalho `x-agent-secret` ou `Authorization: Bearer ...`. */
export function secretFromHeaders(headers: Headers): string | null {
  const direct = headers.get("x-agent-secret");
  if (direct) return direct.trim();
  const auth = headers.get("authorization");
  const match = auth ? /^Bearer\s+(.+)$/i.exec(auth.trim()) : null;
  return match ? match[1].trim() : null;
}

/** Primeiro IP do `x-forwarded-for` (definido pela Vercel). */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "desconhecido";
}

/**
 * Limite simples por janela fixa, em memória. Na Vercel cada instância tem a
 * sua memória, então ele é uma primeira barreira; o limite por contato (no
 * banco) é o que vale entre instâncias.
 */
export class FixedWindowLimiter {
  private readonly hits = new Map<string, { windowStart: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly clock: () => number = Date.now,
  ) {}

  take(key: string): boolean {
    const now = this.clock();
    if (this.hits.size > 10_000) {
      for (const [k, v] of this.hits) if (now - v.windowStart >= this.windowMs) this.hits.delete(k);
    }
    const entry = this.hits.get(key);
    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.hits.set(key, { windowStart: now, count: 1 });
      return true;
    }
    if (entry.count >= this.limit) return false;
    entry.count += 1;
    return true;
  }
}
