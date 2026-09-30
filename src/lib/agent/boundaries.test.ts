import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// Garantias estruturais da Fase 2: modo sombra, nenhuma mensagem real,
// nenhuma ação financeira da IA, nenhum dado fixo da unidade no código.

const root = path.resolve(__dirname, "..", "..", "..");
const agentDir = path.join(root, "src", "lib", "agent");

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
const read = (file: string) => readFileSync(file, "utf8");

const productionSources = readdirSync(agentDir)
  .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts") && file !== "testSupport.ts")
  .map((file) => path.join(agentDir, file));

const named = (name: string) => path.join(agentDir, name);

describe("nenhuma mensagem real pode ser enviada", () => {
  it("o código do agente não faz rede, não lê ambiente e não importa provedores nem banco", () => {
    const forbidden = [
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /from ["']node:(http|https|net|dgram|child_process)["']/,
      /anthropic/i,
      /manychat/i,
      /twilio|graph\.facebook|whatsapp-web|api\.whatsapp/i,
      /from ["']resend["']/,
      /from ["']mercadopago["']/,
      /process\.env/,
      /@prisma\/client/,
      /from ["']\.\.\/prisma["']/,
      /from ["']\.\.\/email["']/,
    ];
    for (const file of productionSources) {
      const source = read(file);
      for (const pattern of forbidden) assert.doesNotMatch(source, pattern, `${rel(file)} contém ${pattern}`);
    }
  });

  it("o agente não importa a gravação de mensagens enviadas (recordOutboundMessage) nem nada que envie", () => {
    for (const file of productionSources) {
      const source = read(file);
      assert.doesNotMatch(source, /recordOutboundMessage/, rel(file));
      assert.doesNotMatch(source, /conversations\/message["']/, rel(file));
    }
  });

  it("só existe modo 'shadow' (sem 'live' no tipo) e todas as entradas conferem o modo", () => {
    const config = read(named("config.ts"));
    assert.match(config, /export type AgentMode = "shadow";/);
    assert.doesNotMatch(config, /"live"/);
    assert.match(read(named("orchestrator.ts")), /assertShadowMode\(deps\.config\)/);
    assert.match(read(named("systemEvents.ts")), /assertShadowMode\(deps\.config\)/);
  });

  it("não existe implementação real do modelo nem despachante que envie", () => {
    for (const file of productionSources) {
      const source = read(file);
      assert.doesNotMatch(source, /implements\s+ModelClient/, rel(file));
    }
    const dispatchers = productionSources
      .map(read)
      .join("\n")
      .match(/class\s+\w+\s+implements\s+SystemDispatcher/g);
    assert.deepEqual(dispatchers, ["class ShadowSystemDispatcher implements SystemDispatcher"]);
  });

  it("a fundação não expõe rota nova e o app não usa o agente", () => {
    const routes = walk(path.join(root, "src", "app")).filter((file) => /route\.ts$/.test(file));
    assert.deepEqual(routes.filter((file) => /(agent|conversation|customer|message|handoff|webhook\/manychat|whatsapp)/i.test(rel(file))).map(rel), []);
    const users = walk(path.join(root, "src", "app"))
      .concat(walk(path.join(root, "src", "components")))
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => read(file).includes("lib/agent"))
      .map(rel);
    assert.deepEqual(users, []);
  });
});

describe("nenhuma ação financeira ou de agenda pela IA", () => {
  it("o orquestrador do agente não importa pagamento, estorno, cancelamento, agenda nem serviços financeiros", () => {
    const source = read(named("orchestrator.ts")) + read(named("tools.ts")) + read(named("model.ts"));
    for (const word of [
      "manualPayment",
      "paymentHold",
      "cancellation",
      "paymentProcessing",
      "bookingCreation",
      "bookingStores",
      "mercadopago",
      "refund",
    ]) {
      assert.equal(new RegExp(word, "i").test(source.replace(/\/\/.*$/gm, "")), false, `orquestrador/ferramentas citam ${word}`);
    }
  });

  it("pagamento manual e extensão de prazo exigem ator STAFF autenticado e são os únicos que os usam", () => {
    assert.match(read(named("manualPayment.ts")), /assertStaff\(params\.actor\)/);
    assert.match(read(named("paymentHold.ts")), /assertStaff\(params\.actor\)/);
    const importers = productionSources
      .filter((file) => /from ["']\.\/(manualPayment|paymentHold)["']/.test(read(file)))
      .map((file) => path.basename(file));
    // systemEvents só importa o TIPO do evento de pagamento confirmado.
    assert.deepEqual(importers.sort(), ["systemEvents.ts"]);
    assert.match(read(named("systemEvents.ts")), /import type \{ PaymentConfirmedEvent \} from "\.\/manualPayment"/);
  });

  it("o modelo só enxerga o texto dos guardrails e o bloco de dados: sem acesso a cofre da unidade", () => {
    const promptSources = read(named("prompt.ts")) + read(named("context.ts"));
    assert.doesNotMatch(promptSources, /SecureUnitSettings|getLocation/);
  });
});

describe("nada da unidade fixo no código do agente", () => {
  it("sem nome de bairro/unidade, pessoa, telefone, endereço, link ou valor de promoção", () => {
    const forbidden = [
      /Pirituba/i,
      /Thay/i,
      /afrodreads/i,
      /g\.page/i,
      /\b\d{2}\s?9\d{4}[-\s]?\d{4}\b/,
      /\b750\b/,
      /\b\d{1,2}h\s?(às|-)\s?\d{1,2}h\b/,
    ];
    for (const file of productionSources) {
      const source = read(file);
      for (const pattern of forbidden) assert.doesNotMatch(source, pattern, `${rel(file)} contém ${pattern}`);
    }
  });
});

describe("a fundação do agente não cria schema novo", () => {
  it("nenhuma migration além das da Fase 0 e da Fase 1", () => {
    const migrations = readdirSync(path.join(root, "prisma", "migrations")).filter((name) => /^\d/.test(name));
    assert.deepEqual(migrations.slice(-2), ["20260930180000_add_booking_expired_status", "20260930200000_add_agent_foundation"]);
  });
});
