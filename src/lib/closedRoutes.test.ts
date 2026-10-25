import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..", "..");
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

describe("rotas públicas fechadas na Fase 0", () => {
  it("POST /api/bookings responde 410 e não toca no banco nem aceita preço", async () => {
    const source = read("src/app/api/bookings/route.ts");
    assert.doesNotMatch(source, /prisma/i);
    assert.doesNotMatch(source, /request\.json|req\.json/);

    const { POST } = await import("../app/api/bookings/route");
    const response = await POST();
    assert.equal(response.status, 410);
    const body = (await response.json()) as { error: string };
    assert.match(body.error, /desativado/);
  });

  it("a rota pública de cancelamento /api/bookings/[id]/cancel não existe mais", () => {
    assert.equal(existsSync(path.join(root, "src/app/api/bookings/[id]/cancel/route.ts")), false);
  });

  it("o cancelamento pelo painel usa o mesmo serviço unificado (regra de devolução única)", () => {
    const source = read("src/app/api/admin/bookings/[id]/route.ts");
    assert.match(source, /cancelBookingById/);
    assert.doesNotMatch(source, /refundPayment/);
  });

  it("o painel /api/admin continua atrás do proxy de autenticação", () => {
    const source = read("src/proxy.ts");
    assert.match(source, /\/api\/admin/);
  });
});
