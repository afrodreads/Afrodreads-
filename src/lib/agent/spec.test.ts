import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { FIXED_DEPOSIT_BRL, PERCENTAGE_DEPOSIT_RATE, REFUND_MIN_DAYS_BEFORE } from "../pricing";
import { LATE_FEE_BRL_PER_15_MIN } from "./policy";
import { layerOf, parseV2, promptSections, unclassifiedSections, V2_LAYERS } from "./spec";
import { V2_PATH } from "./testSupport";

// O V2 vive em agente/ (pasta local, ainda fora do git). Sem o arquivo, estes
// testes são pulados em vez de falhar.
const hasV2 = existsSync(V2_PATH);
const COMMERCIAL_PATH = path.join(path.dirname(V2_PATH), "08-camada-comercial.md");
const loadV2Only = () => parseV2(readFileSync(V2_PATH, "utf8"));
// Como em produção: V2 seguido da camada comercial.
const load = () => parseV2(`${readFileSync(V2_PATH, "utf8")}\n\n${readFileSync(COMMERCIAL_PATH, "utf8")}`);

describe("separação do V2 em camadas", { skip: !hasV2 && "agente/00-prompt-do-agente-v2.md ausente" }, () => {
  it("encontra o preâmbulo, as seções 0 a 27 e as notas", () => {
    const keys = load().map((section) => section.key);
    assert.equal(keys[0], "preamble");
    for (let n = 0; n <= 27; n++) assert.ok(keys.includes(n), `seção ${n} ausente`);
    assert.ok(keys.includes("notes"));
  });

  it("toda seção do V2 tem uma camada (seção nova no V2 exige decisão aqui)", () => {
    assert.deepEqual(unclassifiedSections(load()), []);
  });

  it("o mapa de camadas só cita seções que existem no V2", () => {
    const keys = new Set(load().map((section) => String(section.key)));
    for (const key of Object.keys(V2_LAYERS)) assert.ok(keys.has(key), `camada para seção inexistente: ${key}`);
  });

  it("seções de dados críticos e de eventos ficam FORA do prompt do modelo", () => {
    const inPrompt = new Set(promptSections(load()).map((section) => section.key));
    for (const key of [0, 10, 17, 18, 19, 24, 25, "notes", "preamble"]) {
      assert.equal(inPrompt.has(key as never), false, `seção ${key} não deveria ir ao modelo`);
    }
    for (const key of [1, 2, 3, 4, 5, 8, 9, 11, 13, 14, 20, 21, 23, 26, 27]) {
      assert.equal(inPrompt.has(key), true, `seção ${key} deveria ir ao modelo`);
    }
  });

  it("as camadas pedidas existem: persona, conhecimento, regras, fluxo, guardrails", () => {
    const layers = new Set(Object.values(V2_LAYERS));
    for (const layer of ["persona", "knowledge", "business_rules", "flow", "guardrails", "code_enforced"]) {
      assert.ok(layers.has(layer as never), layer);
    }
    assert.equal(layerOf(3), "guardrails");
    assert.equal(layerOf(8), "knowledge");
  });

  it("o §17 do V2 não permite mais resposta da IA depois do encaminhamento", () => {
    const section17 = load().find((section) => section.key === 17);
    assert.ok(section17);
    assert.doesNotMatch(section17.body, /responda de forma breve/i);
    assert.match(section17.body, /não responde nada/i);
  });

  it("os números do §11 do V2 batem com as constantes que o sistema usa", () => {
    const body = load().find((section) => section.key === 11)?.body ?? "";
    assert.match(body, new RegExp(`R\\$ ${FIXED_DEPOSIT_BRL}\\b`));
    assert.match(body, new RegExp(`${Math.round(PERCENTAGE_DEPOSIT_RATE * 100)}%`));
    assert.match(body, new RegExp(`${REFUND_MIN_DAYS_BEFORE} dias ou mais`));
    assert.match(body, new RegExp(`R\\$ ${LATE_FEE_BRL_PER_15_MIN}\\b`));
  });

  it("o código não copia o texto do V2 (ele é lido do arquivo)", () => {
    const dir = path.dirname(new URL(`file://${__filename.replace(/\\/g, "/")}`).pathname);
    const sources = readdirSync(path.dirname(__filename))
      .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts") && file !== "testSupport.ts")
      .map((file) => readFileSync(path.join(path.dirname(__filename), file), "utf8"))
      .join("\n");
    void dir;
    for (const phrase of [
      "Você **não é apenas um FAQ**",
      "A conversa deve parecer uma recepção humana",
      "Quanto mais claro estiver o projeto",
      "Só responda usando",
    ]) {
      assert.equal(sources.includes(phrase), false, `texto do V2 copiado no código: ${phrase}`);
    }
  });
});

describe("camada comercial (agente/08-camada-comercial.md)", { skip: !hasV2 && "agente/ ausente" }, () => {
  const commercial = () => load().find((section) => section.key === 28);

  it("é uma seção própria (28), separada do V2, e vai para o modelo", () => {
    assert.equal(loadV2Only().some((section) => section.key === 28), false);
    assert.equal(layerOf(28), "commercial");
    assert.ok(promptSections(load()).some((section) => section.key === 28));
  });

  it("desligada, o prompt fica igual ao V2 de antes", () => {
    assert.deepEqual(
      promptSections(loadV2Only()).map((section) => section.key),
      promptSections(load()).map((section) => section.key).filter((key) => key !== 28),
    );
  });

  it("declara que as regras do V2 vencem e mantém as decisões do dono", () => {
    const body = commercial()?.body ?? "";
    assert.match(body, /vence\*\* esta camada/);
    assert.match(body, /o valor é da Thay/i); // preço continua com a Thay
    assert.match(body, /não\*\* marca horário/i); // fechamento = passar para a Thay
    assert.match(body, /não use avaliações, número de clientes nem depoimentos/i); // sem prova social
    assert.match(body, /PRONTO_PARA_AGENDAR/);
  });

  it("os exemplos ao cliente não têm valor em reais, desconto, escassez nem mais de 1 emoji", () => {
    // Só as frases de exemplo (as curtas entre aspas são a lista do que é proibido dizer).
    const quotes = [...(commercial()?.body ?? "").matchAll(/“([^”]+)”/g)].map((m) => m[1]).filter((quote) => quote.length > 30);
    assert.ok(quotes.length >= 10);
    for (const quote of quotes) {
      assert.doesNotMatch(quote, /R\$|\d+\s?%|desconto de|últimas vagas|agenda lotada|só hoje/i, quote);
      assert.ok([...quote.matchAll(/\p{Extended_Pictographic}/gu)].length <= 1, quote);
    }
  });
});

describe("parseV2 (sem depender do arquivo)", () => {
  it("separa seções numeradas e ignora subtítulos como 5.1", () => {
    const md = "titulo\n\n## 0. CONFIG\n\na\n\n# 1. UM\n\nb\n\n## 5.1 Sub\n\nc\n\n## NOTAS DE IMPLEMENTAÇÃO\n\nn\n";
    const sections = parseV2(md);
    assert.deepEqual(
      sections.map((s) => s.key),
      ["preamble", 0, 1, "notes"],
    );
    assert.match(sections[2].body, /## 5\.1 Sub/);
  });

  it("uma seção não classificada é detectada", () => {
    const sections = parseV2("# 99. NOVA\n\nx\n");
    assert.deepEqual(unclassifiedSections(sections), [99]);
  });
});
