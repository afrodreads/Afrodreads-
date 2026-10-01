import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// Garantias estruturais (Fases 2, 3 e 4A): modo sombra, nenhuma mensagem real,
// nenhuma ação financeira da IA, SYSTEM separado da IA, nada da unidade fixo no
// código, uma única rota (autenticada) e SDK de IA só no adaptador do modelo.

const root = path.resolve(__dirname, "..", "..", "..");
const dir = (...parts: string[]) => path.join(root, "src", "lib", ...parts);

function walk(target: string): string[] {
  if (!existsSync(target)) return [];
  const out: string[] = [];
  for (const name of readdirSync(target)) {
    const full = path.join(target, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const rel = (file: string) => path.relative(root, file).split(path.sep).join("/");
const read = (file: string) => readFileSync(file, "utf8");
const isSource = (file: string) => /\.tsx?$/.test(file) && !file.endsWith(".test.ts") && !file.endsWith("testSupport.ts");

const agentSources = walk(dir("agent")).filter(isSource);
const agentDbSources = walk(dir("agent-db")).filter(isSource);
const agentHttpSources = walk(dir("agent-http")).filter(isSource);
const agentModelSources = walk(dir("agent-model")).filter(isSource);
const named = (name: string) => dir("agent", name);
const importsOf = (file: string) => [...read(file).matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);

const MESSAGING_PROVIDERS = [
  // imports de SDKs de canal e URLs de envio (comentários explicando o que NÃO existe são permitidos)
  /from ["'][^"']*(manychat|twilio|whatsapp|baileys|venom)/i,
  /(manychat\.com|graph\.facebook\.com|api\.whatsapp|whatsapp-web|wa\.me\/)/i,
  /from ["']resend["']/,
  /from ["']mercadopago["']/,
  /from ["']\.\.\/(email|mercadopago)["']/,
];
const NETWORK = [/\bfetch\s*\(/, /\bXMLHttpRequest\b/, /from ["']node:(http|https|net|dgram|child_process)["']/];

describe("nenhuma mensagem real pode ser enviada", () => {
  it("núcleo do agente: sem rede, sem ambiente, sem SDK de IA, sem provedores, sem banco", () => {
    for (const file of agentSources) {
      const source = read(file);
      for (const pattern of [...NETWORK, ...MESSAGING_PROVIDERS, /@anthropic-ai|openai/i, /process\.env/, /@prisma\/client/, /from ["']\.\.\/prisma["']/]) {
        assert.doesNotMatch(source, pattern, `${rel(file)} contém ${pattern}`);
      }
    }
  });

  it("o SDK de IA só é importado no adaptador do modelo", () => {
    const users = walk(path.join(root, "src"))
      .filter((file) => /\.tsx?$/.test(file) && !file.endsWith(".test.ts"))
      .filter((file) => /from ["']@anthropic-ai\/sdk/.test(read(file)))
      .map(rel);
    assert.deepEqual(users, ["src/lib/agent-model/claude.ts"]);
  });

  it("adaptador do modelo: só fala com a API da Anthropic, não registra logs e não conhece canais", () => {
    assert.ok(agentModelSources.length > 0);
    for (const file of agentModelSources) {
      const source = read(file);
      for (const pattern of [...NETWORK, ...MESSAGING_PROVIDERS, /console\./, /recordOutboundMessage/]) {
        assert.doesNotMatch(source, pattern, `${rel(file)} contém ${pattern}`);
      }
      // A chave só é lida do ambiente e entregue ao SDK; nunca aparece em texto.
      assert.doesNotMatch(source, /sk-ant-/);
    }
  });

  it("adaptadores de banco e camada HTTP: sem rede e sem provedores de mensagem", () => {
    for (const file of [...agentDbSources, ...agentHttpSources]) {
      const source = read(file);
      for (const pattern of [...NETWORK, ...MESSAGING_PROVIDERS, /@anthropic-ai/]) {
        assert.doesNotMatch(source, pattern, `${rel(file)} contém ${pattern}`);
      }
    }
  });

  it("nada do agente grava mensagem enviada como IA ou SYSTEM; a camada HTTP só registra a resposta da equipe", () => {
    for (const file of [...agentSources, ...agentDbSources, ...agentModelSources]) {
      assert.doesNotMatch(read(file), /recordOutboundMessage/, rel(file));
    }
    const http = agentHttpSources.map(read).join("\n");
    const senders = [...http.matchAll(/sender:\s*"(\w+)"/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(senders)], ["HUMAN"]);
  });

  it("só existe modo 'shadow' e todas as entradas conferem o modo", () => {
    assert.match(read(named("config.ts")), /export type AgentMode = "shadow";/);
    assert.equal((read(named("orchestrator.ts")).match(/assertShadowMode\(deps\.config\)/g) ?? []).length, 2);
    assert.match(read(named("systemEvents.ts")), /assertShadowMode\(deps\.config\)/);
  });

  it("o único despachante SYSTEM é o de sombra e não existe cliente de envio", () => {
    const all = [...agentSources, ...agentDbSources, ...agentHttpSources, ...agentModelSources].map(read).join("\n");
    assert.deepEqual(all.match(/class\s+\w+\s+implements\s+SystemDispatcher/g), ["class ShadowSystemDispatcher implements SystemDispatcher"]);
    assert.deepEqual(all.match(/class\s+\w+\s+implements\s+ModelClient/g), ["class ClaudeModelClient implements ModelClient"]);
  });
});

describe("rotas: uma única entrada, autenticada", () => {
  it("a única rota de API do agente é POST /api/agent/inbound", () => {
    const routes = walk(path.join(root, "src", "app")).filter((file) => /route\.ts$/.test(file)).map(rel);
    const offenders = routes.filter((file) =>
      /(agent|conversation|customer|message|handoff|system-?event|manual|hold|staff|manychat|whatsapp|replay)/i.test(file),
    );
    assert.deepEqual(offenders, ["src/app/api/agent/inbound/route.ts"]);
    const route = read(path.join(root, "src/app/api/agent/inbound/route.ts"));
    assert.match(route, /export async function POST/);
    assert.doesNotMatch(route, /export async function (GET|PUT|PATCH|DELETE)/);
    assert.match(route, /createInboundHandler/);
  });

  it("o app usa o agente só no painel (/admin, protegido) e na entrada autenticada", () => {
    const users = walk(path.join(root, "src", "app"))
      .concat(walk(path.join(root, "src", "components")))
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => /lib\/agent(-db|-http|-model)?\//.test(read(file)))
      .map(rel)
      .sort();
    assert.deepEqual(users, ["src/app/admin/agente/page.tsx", "src/app/api/agent/inbound/route.ts"]);
    assert.match(read(path.join(root, "src", "proxy.ts")), /"\/admin\/:path\*"/);
    assert.doesNotMatch(read(path.join(root, "src/app/admin/agente/page.tsx")), /"use client"/);
  });

  it("a entrada responde só com status: nunca devolve texto da IA", () => {
    const handler = read(dir("agent-http", "inbound.ts"));
    assert.doesNotMatch(handler, /candidateText|result\.text|draft/);
    for (const body of handler.match(/reply\(\d+,\s*\{[^}]*\}/g) ?? []) {
      assert.match(body, /\{\s*ok:\s*true,\s*status:/, body);
    }
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

  it("nenhuma rota, camada HTTP ou adaptador chama pagamento manual ou extensão de prazo", () => {
    const callers = [...agentHttpSources, ...agentModelSources, path.join(root, "src/app/api/agent/inbound/route.ts")]
      .filter((file) => /confirmManualPayment|extendPaymentDeadline|refundPayment|cancelBooking/.test(read(file)))
      .map(rel);
    assert.deepEqual(callers, []);
  });

  it("o modelo não recebe o cofre da unidade (endereço/mapa)", () => {
    const promptSources = read(named("prompt.ts")) + read(named("context.ts")) + read(named("orchestrator.ts"));
    assert.doesNotMatch(promptSources, /SecureUnitSettings|getLocation/);
  });
});

describe("nada da unidade fixo no código do agente", () => {
  it("sem bairro, pessoa, telefone, endereço, link da marca, horário ou valor de promoção", () => {
    const forbidden = [/Pirituba/i, /Thay/i, /afrodreads/i, /g\.page/i, /\b\d{2}\s?9\d{4}[-\s]?\d{4}\b/, /\b750\b/, /\b\d{1,2}h\s?(às|-)\s?\d{1,2}h\b/, /estacionamento no local/i];
    for (const file of [...agentSources, ...agentDbSources, ...agentHttpSources, ...agentModelSources]) {
      const source = read(file);
      for (const pattern of forbidden) assert.doesNotMatch(source, pattern, `${rel(file)} contém ${pattern}`);
    }
  });
});

describe("migrations", () => {
  it("as migrations do agente são as últimas e só aditivas", () => {
    const migrations = readdirSync(path.join(root, "prisma", "migrations")).filter((name) => /^\d/.test(name));
    assert.deepEqual(migrations.slice(-4), [
      "20260930180000_add_booking_expired_status",
      "20260930200000_add_agent_foundation",
      "20260930220000_agent_shadow_persistence",
      "20261001010000_agent_run_usage",
    ]);
    for (const name of migrations.slice(-2)) {
      const sql = read(path.join(root, "prisma", "migrations", name, "migration.sql"));
      assert.doesNotMatch(sql, /\bDROP\b/i, name);
      assert.doesNotMatch(sql, /^\s*DELETE\s+FROM/im, name);
      assert.doesNotMatch(sql, /ALTER COLUMN|RENAME|TRUNCATE/i, name);
      for (const alter of sql.match(/ALTER TABLE "\w+" ADD COLUMN[^;]*;/g) ?? []) assert.doesNotMatch(alter, /NOT NULL/, name);
    }
    const phase3 = read(path.join(root, "prisma", "migrations", "20260930220000_agent_shadow_persistence", "migration.sql"));
    assert.deepEqual(phase3.match(/^UPDATE "\w+"/gm), ['UPDATE "Unit"']);
    assert.doesNotMatch(phase3, /UPDATE "Booking"/);
  });
});
