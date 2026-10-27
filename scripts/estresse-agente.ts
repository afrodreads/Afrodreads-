// Teste de estresse do comportamento comercial com o Claude DE VERDADE (custa alguns centavos).
//
// Mesmo caminho do agente em produção (prompt V2 + camada comercial, travas, ferramentas), tudo em
// memória: não toca no banco, não fala com o ManyChat nem com o WhatsApp. Cada resposta passa por
// checagens automáticas (Thay sem necessidade, bastidores, textão, interrogatório, repetição,
// pressão ou preço inventado, dois-pontos). Gera um relatório em docs/ para leitura.
//
// Uso:  npx tsx scripts/estresse-agente.ts
// O script pede a chave da Anthropic com a digitação escondida. Ela fica só na memória deste
// processo enquanto o teste roda: não vai para arquivo, histórico do terminal nem variável permanente.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { recordOutboundMessage } from "../src/lib/conversations/message";
import { createClaudeModelFromEnv } from "../src/lib/agent-model/claude";
import { handleInboundShadow } from "../src/lib/agent/pipeline";
import { agentHarness, HARNESS_NOW, unitConfig, type ScriptedModel } from "../src/lib/agent/testSupport";

const FOTO = (descricao: string) => `[O cliente enviou uma foto. Para este teste, a foto mostra: ${descricao}]`;
const AUDIO = (texto: string) => `[Áudio do cliente, transcrito automaticamente]: ${texto}`;
const DIA = 24 * 60 * 60 * 1000;

type Turn = { msgs: string[]; gapMs?: number };
/** openMonths: meses com agenda aberta da unidade (AGENT_OPEN_MONTHS). Padrão: novembro e dezembro. */
type Scenario = { name: string; turns: Turn[]; openMonths?: string[] };

const t = (...msgs: string[]): Turn => ({ msgs });

const SCENARIOS: Scenario[] = [
  { name: "1. Cliente apenas curioso", turns: [t("Oi, sou a Bia. Vi vocês no Instagram, como funciona esse negócio de dread?")] },
  {
    name: "2. Cliente enviando uma foto",
    turns: [t("Oi, sou o Caio, quero fazer dread"), t(FOTO("cabelo crespo preto, curto, uns 6 cm, cabeça toda"))],
  },
  {
    name: "3. Cliente enviando várias fotos",
    turns: [
      t("Oi, sou a Dani"),
      t(FOTO("cabelo cacheado castanho até o ombro"), FOTO("referência de microlocs bem fininhas até a cintura, pretas")),
    ],
  },
  { name: "4. Cliente respondendo apenas “sim”", turns: [t("Oi, sou a Duda, quero dread"), t("Sim"), t("sim")] },
  { name: "5. Pergunta o preço direto", turns: [t("Oi, sou o Enzo. Quanto custa microlocs?")] },
  {
    name: "6. Acha caro",
    turns: [t("Oi, sou a Fê, quero dread até o ombro"), t("Uma amiga pagou 1.500 num lugar, achei muito caro")],
  },
  { name: "7. Compara com concorrente", turns: [t("Oi, sou o Gui. Vi um lugar que faz dread por 600, vocês fazem mais barato?")] },
  { name: "8. “Vou pensar”", turns: [t("Oi, sou o Hugo. Quero microlocs"), t("Vou pensar")] },
  {
    name: "9. Claramente interessado",
    turns: [t("Oi, sou a Iasmin. Quero muito fazer microlocs! Meu cabelo é crespo e tem uns 8 cm. Como funciona?")],
  },
  {
    name: "10. Pronto para fechar",
    turns: [
      t("Oi, sou o João. Quero dread preto até o ombro, cabeça toda, com sintético, espessura M. Meu cabelo tem 10 cm e já tenho referência. Como faço pra marcar?"),
    ],
  },
  { name: "11. Indeciso sobre o modelo", turns: [t("Oi, sou a Kel. Não sei se faço micro ou dread normal, o que você acha?")] },
  {
    name: "12. Várias perguntas de uma vez",
    turns: [t("Oi, sou o Léo. Quanto tempo demora? Dói? Se eu quiser tirar depois precisa raspar? Posso lavar normal?")],
  },
  {
    name: "13. Áudio com várias informações",
    turns: [
      t(
        AUDIO(
          "oi tudo bem meu nome é Gustavo eu quero fazer dread só no topo com o meu cabelo mesmo ele tá com uns 12 centímetros quero mais fininho e queria fazer em dezembro",
        ),
      ),
    ],
  },
  {
    name: "14. Repete informação já dada",
    turns: [t("Oi, sou a Helena, quero microlocs pretos até o ombro, cabeça toda"), t("Então, quero microlocs pretos até o ombro")],
  },
  {
    name: "15. Parou de responder e voltou no dia seguinte",
    turns: [t("Oi, sou o Ícaro, quero dread até o ombro"), { msgs: ["Oi, voltei. Ainda dá pra fazer?"], gapMs: DIA - 2 * 60 * 60 * 1000 }],
  },
  {
    name: "16. Micro com cabelo curto",
    turns: [t("Oi, sou a Lia. Meu cabelo é curtinho, consigo fazer micro?")],
  },
  {
    name: "17. Só com o próprio cabelo (não perguntar cor)",
    turns: [
      t("Oi, sou o Marcos. Quero dread M, cabeça toda, só com o meu cabelo mesmo. Ele tem uns 12 cm"),
      t(FOTO("cabelo crespo preto, uns 12 cm, cabeça toda")),
    ],
  },
  { name: "18. Pede pintura", turns: [t("Oi, sou a Nanda. Vocês pintam o cabelo? Queria fazer dread e deixar loiro")] },
  {
    name: "19. Pronto para agendar (agenda em meses abertos)",
    turns: [
      t("Oi, sou o Otto. Quero microlocs com o meu próprio cabelo, cabeça toda, ele tem uns 10 cm"),
      t(FOTO("cabelo crespo preto, uns 10 cm"), "Quero fazer, quando posso ir?"),
    ],
  },
  {
    // Mesma conversa do 19, com AGENT_OPEN_MONTHS vazio: o agente não pode citar meses nem disponibilidade.
    name: "19b. Pronto para agendar (sem meses configurados)",
    openMonths: [],
    turns: [
      t("Oi, sou o Otto. Quero microlocs com o meu próprio cabelo, cabeça toda, ele tem uns 10 cm"),
      t(FOTO("cabelo crespo preto, uns 10 cm"), "Quero fazer, quando posso ir?"),
    ],
  },
  {
    // Regra dos 4 dedos continua valendo para dreads (não é micro).
    name: "20. Dread com cabelo muito curto (regra dos 4 dedos)",
    turns: [t("Oi, sou a Pri. Quero dread M com o meu cabelo, mas ele é bem curtinho, tipo 2 dedos")],
  },
];

type Check = { code: string; label: string; hit: (reply: string, client: string, handoff: boolean, openMonths: string[]) => boolean };

const CHECKS: Check[] = [
  { code: "thay", label: "cita a Thay sem ser a passagem", hit: (r, _c, handoff) => !handoff && /\bThay\b/.test(r) },
  {
    code: "bastidor",
    label: "narra bastidores",
    hit: (r) => /\b(anotei|vou anotar|vou verificar|vou analisar|preciso coletar|para que (eu )?possa|vou passar (pra|para)|deixei (tudo )?anotado)\b/i.test(r),
  },
  { code: "textao", label: "textão (mais de 450 caracteres)", hit: (r) => r.length > 450 },
  { code: "interrogatorio", label: "mais de 2 perguntas na mesma resposta", hit: (r) => (r.match(/\?/g) ?? []).length > 2 },
  {
    code: "repete",
    label: "repete a fala do cliente",
    hit: (r, c) => {
      const clean = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "");
      const client = clean(c);
      const reply = clean(r);
      for (let i = 0; i + 28 <= client.length; i += 4) if (reply.includes(client.slice(i, i + 28))) return true;
      return false;
    },
  },
  {
    code: "pressao",
    label: "pressão ou argumento inventado",
    hit: (r) => /(últimas vagas|agenda (lotada|cheia)|só hoje|promoção acabando|garant[ae] já|corre|vagas limitadas|muita gente procura|clientes? (adoram|amam))/i.test(r),
  },
  { code: "preco", label: "cita valor que não seja o sinal", hit: (r) => /R\$\s?\d/.test(r.replace(/R\$\s?50\b/g, "")) },
  { code: "dois_pontos", label: "usa dois-pontos", hit: (r) => /:(?!\/\/)/.test(r.replace(/\d:\d/g, "")) },
  {
    code: "disponibilidade",
    label: "inventa disponibilidade (mês fora da configuração ou vaga/horário)",
    hit: (r, _c, _h, openMonths) => {
      const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
      const cited = months.filter((month) => new RegExp(`\\b${month}\\b`, "i").test(r));
      if (cited.some((month) => !openMonths.includes(month))) return true;
      if (openMonths.length === 0 && /\btem agenda\b|agenda (aberta|dispon)/i.test(r)) return true;
      return /\b(temos|tenho|tem)\s+(vagas?|hor[aá]rios?)\b|hor[aá]rio dispon/i.test(r);
    },
  },
  {
    code: "mes_aberto",
    label: "pergunta o mês em vez de apresentar os meses abertos",
    hit: (r) => /(qual|que) m[eê]s|ainda (esse|este) m[eê]s|pensa em fazer (ainda )?em|pretende fazer (ainda )?em/i.test(r),
  },
  {
    code: "cor_pintura",
    label: "oferece pintura ou pergunta outra cor",
    hit: (r) => /(outra cor|mudar (a )?cor|qual cor|pintar|tonaliz|loir)/i.test(r) && !/n[aã]o (est[aá]|estamos)/i.test(r),
  },
  {
    code: "dedos_micro",
    label: "em micro, usa X dedos ou até o queixo como barreira",
    // Só em conversas de micro: para dreads, Start Locs e Short Dread a regra dos 4 dedos continua valendo.
    hit: (r, c) => /micro/i.test(c) && /(\d|quatro|tr[eê]s) dedos|at[eé] o queixo|abaixo do ombro/i.test(r),
  },
];

/** Lê a chave sem mostrar o que é digitado (nada é gravado). */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    let value = "";
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value.trim());
          return;
        }
        if (char === "\u0003") process.exit(1); // Ctrl+C
        if (char === "\u0008" || char === "\u007f") value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  // Exatamente o modelo de produção (AGENT_MODEL do ambiente Preview na Vercel, conferido em 26/10/2026).
  const PRODUCTION_MODEL = "claude-sonnet-5-5";
  const rawKey = process.env.ANTHROPIC_API_KEY || (await askHidden("Chave da Anthropic (não aparece ao digitar): "));
  // O terminal pode colar caracteres invisíveis (marcas de colar, espaços) e até duplicar o texto. Limpa e confere o formato,
  // sem nunca mostrar a chave: só o tamanho e se começa com sk-ant-.
  const key = (rawKey.match(/sk-ant-[A-Za-z0-9_-]+/)?.[0] ?? "").trim();
  const looksOk = key.startsWith("sk-ant-") && key.length > 40;
  console.log(`Chave recebida: ${looksOk ? "formato ok" : "formato estranho"} (${key.length} caracteres lidos, ${rawKey.length} colados).`);
  if (!looksOk) process.exit(3);
  const model = createClaudeModelFromEnv({ ...process.env, ANTHROPIC_API_KEY: key, AGENT_MODEL: PRODUCTION_MODEL });
  if (!model) {
    console.error("Sem chave, o teste não roda.");
    process.exit(1);
  }
  const root = process.cwd();
  const promptText = ["00-prompt-do-agente-v2.md", "08-camada-comercial.md"]
    .map((file) => readFileSync(path.join(root, "agente", file), "utf8"))
    .join("\n\n");

  const body: string[] = [];
  const totals = new Map<string, number>(CHECKS.map((check) => [check.code, 0]));
  let replies = 0;
  let costUsd = 0;

  for (const scenario of SCENARIOS) {
    const h = agentHarness(model as unknown as ScriptedModel, promptText);
    // Agenda aberta como em produção (AGENT_OPEN_MONTHS), para testar a regra de apresentar os meses.
    const openMonths = scenario.openMonths ?? ["novembro", "dezembro"];
    h.reader.units.set(h.unit.id, unitConfig(h.unit.id, { openMonths }));
    body.push(`## ${scenario.name}`, "", `_Agenda configurada: ${(scenario.openMonths ?? ["novembro", "dezembro"]).join(", ") || "nenhum mês (AGENT_OPEN_MONTHS vazio)"}_`, "");
    let now = HARNESS_NOW.getTime();
    let n = 0;
    for (const turn of scenario.turns) {
      now += turn.gapMs ?? 60_000;
      for (const [index, content] of turn.msgs.entries()) {
        now += 15_000;
        n += 1;
        body.push(`> **Cliente:** ${content}`);
        if (index < turn.msgs.length - 1) {
          await h.inbound(`st-${n}`, content, new Date(now));
          continue;
        }
        const message = { unitId: h.unit.id, phone: "11987654321", customerName: null, externalMessageId: `st-${n}`, content };
        const result = await handleInboundShadow({ conversations: h.db, agent: h.live }, message, new Date(now));
        const run = "result" in result.agent ? result.agent.result : null;
        if (!run) {
          body.push(">", `> **Agente:** (não rodou: ${result.agent.outcome})`, "");
          continue;
        }
        // Falha do modelo (chave inválida, sem crédito, rede): o relatório não teria valor. Para na hora,
        // sem gravar relatório, para nunca parecer que "passou sem alertas".
        if (run.outcome === "MODEL_ERROR") {
          console.error(
            `\nO modelo não respondeu (erro: ${run.errorCode ?? "desconhecido"}). Confira se a chave é uma API key válida ` +
              `(começa com sk-ant-api) e se a conta tem crédito. Nenhum relatório foi gerado.`,
          );
          process.exit(2);
        }
        costUsd += run.estimatedCostUsd ?? 0;
        const text = (run.candidateText ?? run.blockedOriginalText ?? "(sem texto)").replace(/\[\[NOVA_MENSAGEM\]\]/g, " ⏎ ");
        const handoff = run.proposedHandoff !== null;
        const flags = CHECKS.filter((check) => check.hit(text, turn.msgs.join(" "), handoff, openMonths));
        replies += 1;
        for (const flag of flags) totals.set(flag.code, (totals.get(flag.code) ?? 0) + 1);
        const blocked = run.outcome !== "DRAFT_SAVED" ? ` [${run.outcome}]` : "";
        body.push(">", `> **Agente${blocked}:** ${text.replace(/\n+/g, " ")}`);
        const notes = [handoff ? "passa para a Thay" : "", ...flags.map((flag) => `⚠ ${flag.label}`)].filter(Boolean);
        body.push(">", `> _${notes.length ? notes.join(" · ") : "✓ sem alertas"}_`, "");
        if (run.candidateText && !blocked) {
          await recordOutboundMessage(
            h.db,
            { conversationId: result.inbound.conversationId, sender: "AI", senderRef: "estresse", content: run.candidateText },
            new Date(now + 5_000),
          );
        }
      }
    }
    console.log(`ok: ${scenario.name}`);
  }

  const summary = [
    `# Teste de estresse do agente (${new Date().toISOString().slice(0, 10)})`,
    "",
    `Modelo ${model.id}, prompt V2 + camada comercial. ${replies} respostas em ${SCENARIOS.length} cenários. Custo estimado US$ ${costUsd.toFixed(3)}.`,
    "",
    "| Checagem | Respostas com alerta |",
    "|---|---|",
    ...CHECKS.map((check) => `| ${check.label} | ${totals.get(check.code)} de ${replies} |`),
    "",
    "As checagens são automáticas e servem de triagem: cada alerta deve ser lido no contexto da conversa abaixo.",
    "",
  ];
  const out = path.join(root, "docs", `estresse-agente-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(out, `${[...summary, ...body].join("\n")}\n`);
  console.log(`Relatório: ${out}`);
}

void main();
