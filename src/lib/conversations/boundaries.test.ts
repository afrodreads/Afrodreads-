import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// Garantias estruturais da Fase 1: a fundação não expõe rotas, não liga
// integrações e não carrega dados da unidade no código.

const root = path.resolve(__dirname, "..", "..", "..");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const rel = (file: string) => path.relative(root, file).split(path.sep).join("/");

const conversationsDir = path.join(root, "src", "lib", "conversations");
const productionSources = walk(conversationsDir).filter(
  (file) =>
    file.endsWith(".ts") &&
    !file.endsWith(".test.ts") &&
    !file.endsWith("testSupport.ts") &&
    !file.endsWith("memoryRepo.ts"),
);

describe("nenhuma rota pública nova", () => {
  it("não existe rota de API para clientes, conversas, mensagens, encaminhamentos ou unidades", () => {
    const routes = walk(path.join(root, "src", "app")).filter((file) => /route\.ts$/.test(file));
    const offenders = routes.filter((file) =>
      /(customer|conversation|message|handoff|unit|agent)/i.test(rel(file)),
    );
    // Fase 4A: a única rota do agente é a entrada AUTENTICADA (segredo) em modo sombra.
    assert.deepEqual(offenders.map(rel), ["src/app/api/agent/inbound/route.ts"]);
  });

  it("só a rota de orçamento (vínculo best-effort) e a entrada autenticada do agente usam a fundação", () => {
    const users = walk(path.join(root, "src", "app"))
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => readFileSync(file, "utf8").includes("lib/conversations"))
      .map(rel)
      .sort();
    assert.deepEqual(users, ["src/app/api/agent/inbound/route.ts", "src/app/api/quotes/[token]/complete/route.ts"]);

    const source = readFileSync(path.join(root, "src/app/api/quotes/[token]/complete/route.ts"), "utf8");
    assert.match(source, /@\/lib\/conversations\/wiring/);
  });

  it("os componentes do site não importam a fundação", () => {
    const users = walk(path.join(root, "src", "components"))
      .filter((file) => readFileSync(file, "utf8").includes("lib/conversations"))
      .map(rel);
    assert.deepEqual(users, []);
  });
});

describe("nenhuma integração externa ativada", () => {
  it("o código da fundação não faz chamadas de rede nem importa provedores", () => {
    const forbidden = [
      /\bfetch\s*\(/,
      /anthropic/i,
      /manychat/i,
      /whatsapp-web|twilio|meta\.com|graph\.facebook/i,
      /from ["']resend["']/,
      /from ["']mercadopago["']/,
      /process\.env/,
    ];
    for (const file of productionSources) {
      const source = readFileSync(file, "utf8");
      for (const pattern of forbidden) {
        assert.doesNotMatch(source, pattern, `${rel(file)} contém ${pattern}`);
      }
    }
  });

  it("o pacote só ganhou o SDK oficial da Anthropic (Fase 4A); nenhum provedor de mensagens", () => {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    const names = Object.keys(pkg.dependencies);
    assert.deepEqual(names.filter((name) => /anthropic|openai/i.test(name)), ["@anthropic-ai/sdk"]);
    assert.doesNotMatch(names.join(" "), /openai|manychat|twilio|whatsapp/i);
  });
});

describe("nada da unidade fixo no código", () => {
  it("sem nome de bairro/unidade, telefone, endereço, pessoa ou horário nos módulos", () => {
    const forbidden = [/Pirituba/i, /Thay/i, /afrodreads/i, /\b\d{2}\s?9\d{4}[-\s]?\d{4}\b/, /\bRua\b|\bAv\.|\bAvenida\b/, /\b\d{1,2}h\b/];
    for (const file of productionSources) {
      const source = readFileSync(file, "utf8");
      for (const pattern of forbidden) {
        assert.doesNotMatch(source, pattern, `${rel(file)} contém ${pattern}`);
      }
    }
  });

  it("a unidade inicial vem da migration (dados), não do código", () => {
    const migration = readFileSync(
      path.join(root, "prisma", "migrations", "20260930200000_add_agent_foundation", "migration.sql"),
      "utf8",
    );
    assert.match(migration, /INSERT INTO "Unit"/);
  });
});

describe("migration retrocompatível (só aditiva)", () => {
  it("não remove nem altera nada existente", () => {
    const sql = readFileSync(
      path.join(root, "prisma", "migrations", "20260930200000_add_agent_foundation", "migration.sql"),
      "utf8",
    );
    assert.doesNotMatch(sql, /\bDROP\b/i);
    assert.doesNotMatch(sql, /^\s*DELETE\s+FROM/im);
    assert.doesNotMatch(sql, /\bTRUNCATE\b/i);
    assert.doesNotMatch(sql, /ALTER COLUMN/i);
    assert.doesNotMatch(sql, /RENAME/i);
    assert.doesNotMatch(sql, /UPDATE\s+"/i);
    // As únicas mudanças em tabela existente são as duas colunas opcionais de Booking.
    const alters = sql.match(/ALTER TABLE "(\w+)" ADD COLUMN[^;]*;/g) ?? [];
    assert.equal(alters.length, 1);
    assert.match(alters[0], /"Booking"/);
    assert.doesNotMatch(alters[0], /NOT NULL/);
  });
});
