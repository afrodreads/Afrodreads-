import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// Garantias estruturais das Fases 2 e 3: modo sombra, nenhuma mensagem real,
// nenhuma ação financeira da IA, SYSTEM separado da IA, nada da unidade fixo no
// código, nenhuma rota pública nova.

const root = path.resolve(__dirname, "..", "..", "..");
const agentDir = path.join(root, "src", "lib", "agent");
const agentDbDir = path.join(root, "src", "lib", "agent-db");

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const rel = (file: string) => path.relative(root, file).split(path.sep).join("/");
const read = (file: string) => readFileSync(file, "utf8");
const isSource = (file: string) => file.endsWith(".ts") && !file.endsWith(".test.ts") && !file.endsWith("testSupport.ts");

const agentSources = walk(agentDir).filter(isSource);
const agentDbSources = walk(agentDbDir).filter(isSource);
const named = (name: string) => path.join(agentDir, name);
const importsOf = (file: string) => [...read(file).matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);

const NETWORK = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /from ["']node:(http|https|net|dgram|child_process)["']/,
  /@anthropic-ai|anthropic/i,
  /openai/i,
  /manychat/i,
  /twilio|graph\.facebook|whatsapp-web|api\.whatsapp/i,
  /from ["']resend["']/,
  /from ["']mercadopago["']/,
  /from ["']\.\.\/(email|mercadopago)["']/,
];

describe("nenhuma mensagem real pode ser enviada", () => {
  it("núcleo do agente: sem rede, sem ambiente, sem provedores, sem banco", () => {
    for (const file of agentSources) {
      const source = read(file);
      for (const pattern of [...NETWORK, /process\.env/, /@prisma\/client/, /from ["']\.\.\/prisma["']/]) {
        assert.doesNotMatch(source, pattern, `${rel(file)} contém ${pattern}`);
      }
    }
  });

  it("adaptadores de banco do agente: só banco (sem rede nem provedores)", () => {
    assert.ok(agentDbSources.length > 0);
    for (const file of agentDbSources) {
      for (const pattern of [...NETWORK, /process\.env/]) assert.doesNotMatch(read(file), pattern, `${rel(file)} contém ${pattern}`);
    }
  });

  it("nada do agente grava mensagem enviada (recordOutboundMessage)", () => {
    for (const file of [...agentSources, ...agentDbSources]) assert.doesNotMatch(read(file), /recordOutboundMessage/, rel(file));
  });

  it("só existe modo 'shadow' e todas as entradas conferem o modo", () => {
    assert.match(read(named("config.ts")), /export type AgentMode = "shadow";/);
    assert.match(read(named("orchestrator.ts")), /assertShadowMode\(deps\.config\)/);
    assert.equal((read(named("orchestrator.ts")).match(/assertShadowMode\(deps\.config\)/g) ?? []).length, 2); // ao vivo e replay
    assert.match(read(named("systemEvents.ts")), /assertShadowMode\(deps\.config\)/);
  });

  it("não há implementação real do modelo e o único despachante é o de sombra", () => {
    const all = [...agentSources, ...agentDbSources].map(read).join("\n");
    assert.doesNotMatch(all, /implements\s+ModelClient/);
    assert.deepEqual(all.match(/class\s+\w+\s+implements\s+SystemDispatcher/g), ["class ShadowSystemDispatcher implements SystemDispatcher"]);
  });
});

describe("rotas: nada público", () => {
  it("nenhuma rota de API nova para agente, conversa, cliente, mensagem, evento ou pagamento manual", () => {
    const routes = walk(path.join(root, "src", "app")).filter((file) => /route\.ts$/.test(file)).map(rel);
    const offenders = routes.filter((file) =>
      /(agent|conversation|customer|message|handoff|system-?event|manual|hold|staff|manychat|whatsapp|replay)/i.test(file),
    );
    assert.deepEqual(offenders, []);
  });

  it("o único uso no app é a página do painel /admin/agente (protegida pelo proxy do admin)", () => {
    const users = walk(path.join(root, "src", "app"))
      .concat(walk(path.join(root, "src", "components")))
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => /lib\/agent(-db)?\//.test(read(file)))
      .map(rel);
    assert.deepEqual(users, ["src/app/admin/agente/page.tsx"]);

    const proxy = read(path.join(root, "src", "proxy.ts"));
    assert.match(proxy, /"\/admin\/:path\*"/);
    const page = read(path.join(root, "src", "app", "admin", "agente", "page.tsx"));
    for (const target of importsOf(path.join(root, "src", "app", "admin", "agente", "page.tsx"))) {
      if (target.includes("lib/agent")) assert.match(target, /lib\/agent\/(metrics|promptVersion)$/);
    }
    assert.doesNotMatch(page, /"use client"/); // lê do banco no servidor, sem API pública
  });
});

describe("SYSTEM não é IA", () => {
  it("o módulo de eventos SYSTEM não importa nada da IA", () => {
    const forbidden = ["./model", "./prompt", "./context", "./guardrails", "./tools", "./orchestrator", "./spec", "./runs"];
    for (const target of importsOf(named("systemEvents.ts"))) {
      assert.equal(forbidden.includes(target), false, `systemEvents importa ${target}`);
    }
  });

  it("o orquestrador da IA não importa eventos SYSTEM, pagamento, prazo, estorno nem agenda", () => {
    const source = importsOf(named("orchestrator.ts")).join(" ") + " " + importsOf(named("tools.ts")).join(" ");
    for (const word of ["systemEvents", "manualPayment", "paymentHold", "cancellation", "paymentProcessing", "bookingCreation", "bookingStores", "mercadopago", "actors"]) {
      assert.equal(source.includes(word), false, `orquestrador/ferramentas importam ${word}`);
    }
  });
});

describe("nenhuma ação financeira pela IA", () => {
  it("pagamento manual e prazo exigem pessoa autorizada da equipe", () => {
    assert.match(read(named("manualPayment.ts")), /authorizeStaff\(store, params\.actor, "CONFIRM_MANUAL_PAYMENT"/);
    assert.match(read(named("paymentHold.ts")), /authorizeStaff\(store, params\.actor, "EXTEND_PAYMENT_DEADLINE"/);
  });

  it("o modelo não recebe o cofre da unidade (endereço/mapa)", () => {
    const promptSources = read(named("prompt.ts")) + read(named("context.ts")) + read(named("orchestrator.ts"));
    assert.doesNotMatch(promptSources, /SecureUnitSettings|getLocation/);
  });
});

describe("nada da unidade fixo no código do agente", () => {
  it("sem bairro, pessoa, telefone, endereço, link da marca, horário ou valor de promoção", () => {
    const forbidden = [/Pirituba/i, /Thay/i, /afrodreads/i, /g\.page/i, /\b\d{2}\s?9\d{4}[-\s]?\d{4}\b/, /\b750\b/, /\b\d{1,2}h\s?(às|-)\s?\d{1,2}h\b/, /estacionamento no local/i];
    for (const file of [...agentSources, ...agentDbSources]) {
      const source = read(file);
      for (const pattern of forbidden) assert.doesNotMatch(source, pattern, `${rel(file)} contém ${pattern}`);
    }
  });
});

describe("migrations", () => {
  it("a Fase 3 é a última e é só aditiva (os seeds são dados)", () => {
    const migrations = readdirSync(path.join(root, "prisma", "migrations")).filter((name) => /^\d/.test(name));
    assert.deepEqual(migrations.slice(-3), [
      "20260930180000_add_booking_expired_status",
      "20260930200000_add_agent_foundation",
      "20260930220000_agent_shadow_persistence",
    ]);
    const sql = read(path.join(root, "prisma", "migrations", "20260930220000_agent_shadow_persistence", "migration.sql"));
    assert.doesNotMatch(sql, /\bDROP\b/i);
    assert.doesNotMatch(sql, /^\s*DELETE\s+FROM/im);
    assert.doesNotMatch(sql, /ALTER COLUMN|RENAME|TRUNCATE/i);
    for (const alter of sql.match(/ALTER TABLE "\w+" ADD COLUMN[^;]*;/g) ?? []) assert.doesNotMatch(alter, /NOT NULL/);
    // O único UPDATE preenche a configuração da unidade criada na Fase 1, se ainda vazia.
    assert.deepEqual(sql.match(/^UPDATE "\w+"/gm), ['UPDATE "Unit"']);
    assert.match(sql, /WHERE "id" = 'unit_principal' AND "brandId" IS NULL/);
    // Agendamentos antigos: appointmentType não é preenchido (fica nulo = não classificado).
    assert.doesNotMatch(sql, /UPDATE "Booking"/);
  });
});
