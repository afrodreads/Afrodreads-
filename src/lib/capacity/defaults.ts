// Carga inicial das regras de capacidade (especificação de 18/10/2026).
// Depois de aplicadas pela migration, as regras vivem no banco e são editadas
// pelo painel (/admin/servicos); este arquivo não é lido pelo app em produção.
// Ele é a fonte da migration e dos testes de combinação.
//
// Siglas da especificação: MC manutenção completa, AC aplicação cabeça toda,
// ML microlocs, AT aplicação no topo, MT manutenção no topo, R retwist /
// retwist + twist / start locks (só Thay), RV revitalização, PT penteado.

export type DefaultRule = {
  slug: string;
  chairs: 1 | 2;
  staff: "ANY" | "LYON" | "THAY";
  fullDay: boolean;
  maxPerPeriod: number | null;
  maxPerDay: number | null;
  startsMorning: boolean;
  startsAfternoon: boolean;
  rulesPending: boolean;
  rulesNote: string | null;
  /** Serviço que ainda não existe no banco e é criado pela migration. */
  create?: { id: string; name: string; description: string; minHours: number; maxHours: number; order: number };
};

const ONE_CHAIR = { chairs: 1 as const, fullDay: false, startsMorning: true, startsAfternoon: true };
const THAY_ONLY = { ...ONE_CHAIR, staff: "THAY" as const, maxPerPeriod: 1, maxPerDay: null };

export const DEFAULT_RULES: DefaultRule[] = [
  {
    slug: "manutencao-completa",
    chairs: 2,
    staff: "ANY",
    fullDay: false,
    maxPerPeriod: null,
    maxPerDay: null,
    startsMorning: true,
    startsAfternoon: true,
    rulesPending: false,
    rulesNote: "PENDENTE: pode dividir o dia com aplicação no topo? (a aplicação no topo diz que sim; a manutenção completa não lista). Revitalização no outro período?",
    create: {
      id: "svc_manutencao_completa",
      name: "Manutenção completa (cabeça toda)",
      description: "Manutenção dos dreads em toda a cabeça.",
      minHours: 3,
      maxHours: 5,
      order: 10,
    },
  },
  {
    slug: "manutencao-topo",
    ...ONE_CHAIR,
    staff: "ANY",
    maxPerPeriod: 2,
    maxPerDay: 4,
    rulesPending: false,
    rulesNote: "PENDENTE: pode dividir o dia com revitalização?",
    create: {
      id: "svc_manutencao_topo",
      name: "Manutenção no topo",
      description: "Manutenção dos dreads na região do topo da cabeça.",
      minHours: 3,
      maxHours: 5,
      order: 11,
    },
  },
  {
    slug: "cabeca-toda",
    chairs: 2,
    staff: "ANY",
    fullDay: false,
    maxPerPeriod: null,
    maxPerDay: null,
    // 4 a 8 h: só de manhã (como já era para serviços de 8 h ou mais).
    startsMorning: true,
    startsAfternoon: false,
    rulesPending: false,
    rulesNote: "PENDENTE: o penteado pode substituir uma das manutenções no topo do outro período?",
  },
  {
    slug: "microlocs",
    ...ONE_CHAIR,
    staff: "THAY",
    fullDay: true,
    maxPerPeriod: 1,
    maxPerDay: 1,
    startsAfternoon: false,
    rulesPending: false,
    rulesNote: "Aplicação ou manutenção de microlocs: a Thay fica o dia inteiro; a outra cadeira aceita só aplicação ou manutenção no topo, 1 por período.",
  },
  {
    slug: "primeira-aplicacao-topo",
    ...ONE_CHAIR,
    staff: "ANY",
    maxPerPeriod: null,
    maxPerDay: null,
    rulesPending: false,
    rulesNote: "PENDENTE: duas aplicações no topo no mesmo dia? Com manutenção completa, revitalização ou penteado?",
  },
  { slug: "retwist", ...THAY_ONLY, rulesPending: false, rulesNote: "PENDENTE: a Thay pode fazer dois destes no mesmo dia (manhã e tarde)? Com revitalização ou penteado?" },
  {
    slug: "retwist-mais-twist",
    ...THAY_ONLY,
    rulesPending: false,
    rulesNote: "PENDENTE: confirmar se é um serviço diferente de Start Locs.",
    create: {
      id: "svc_retwist_mais_twist",
      name: "Retwist + twist",
      description: "Retwist da raiz com finalização em twist.",
      minHours: 3,
      maxHours: 5,
      order: 12,
    },
  },
  // "Start Locs" (slug histórico retwist-twist) = "start locks" da especificação.
  { slug: "retwist-twist", ...THAY_ONLY, rulesPending: false, rulesNote: "PENDENTE: a Thay pode fazer dois destes no mesmo dia (manhã e tarde)?" },
  {
    slug: "revitalizacao",
    ...ONE_CHAIR,
    staff: "ANY",
    maxPerPeriod: 1,
    maxPerDay: null,
    // 6 a 8 h tratados como 1 período; começa só de manhã.
    startsAfternoon: false,
    rulesPending: false,
    rulesNote: "Dura 6 a 8 h; o sistema trata como 1 período (ajuste manual pelo encaixe). PENDENTE: com quais serviços divide o dia além do penteado?",
  },
  {
    slug: "penteados",
    ...ONE_CHAIR,
    staff: "ANY",
    maxPerPeriod: null,
    maxPerDay: 1,
    rulesPending: false,
    rulesNote: "PENDENTE: com aplicação no topo e com aplicação cabeça toda?",
  },
  // Sem regra na especificação: regra conservadora (ocupa o estúdio no período, sem companhia).
  {
    slug: "short-dread",
    chairs: 2,
    staff: "ANY",
    fullDay: false,
    maxPerPeriod: null,
    maxPerDay: null,
    startsMorning: true,
    startsAfternoon: true,
    rulesPending: true,
    rulesNote: "PENDENTE: regra provisória (ocupa as 2 cadeiras no período e não divide o dia). Defina no painel.",
  },
  {
    slug: "cultivo-agulhado",
    chairs: 2,
    staff: "ANY",
    fullDay: false,
    maxPerPeriod: null,
    maxPerDay: null,
    startsMorning: true,
    startsAfternoon: false,
    rulesPending: true,
    rulesNote: "PENDENTE: regra provisória (ocupa as 2 cadeiras de manhã e não divide o dia). Defina no painel.",
  },
];

const R = ["retwist", "retwist-mais-twist", "retwist-twist"];

/** [A, B, compartilha a cadeira]. Gravado nos dois sentidos. A = B: o mesmo serviço mais de uma vez no dia. */
export const DEFAULT_COMPANIONS: [string, string, boolean][] = [
  // Manutenção completa: outra MC, até 2 MT, 1 PT + 1 MT; e no mesmo período de um retwist da Thay.
  ["manutencao-completa", "manutencao-completa", false],
  ["manutencao-completa", "manutencao-topo", false],
  ["manutencao-completa", "penteados", false],
  ...R.map((slug): [string, string, boolean] => ["manutencao-completa", slug, true]),
  // Aplicação cabeça toda: até 2 MT no outro período.
  ["cabeca-toda", "manutencao-topo", false],
  // Microlocs: a outra cadeira aceita só AT ou MT.
  ["microlocs", "primeira-aplicacao-topo", false],
  ["microlocs", "manutencao-topo", false],
  // Aplicação no topo: MT, retwist, retwist + twist, start locks e microlocs.
  ["primeira-aplicacao-topo", "manutencao-topo", false],
  ...R.map((slug): [string, string, boolean] => ["primeira-aplicacao-topo", slug, false]),
  // Manutenção no topo: até 2 por período e 4 por dia.
  ["manutencao-topo", "manutencao-topo", false],
  ...R.map((slug): [string, string, boolean] => ["manutencao-topo", slug, false]),
  // Penteado: com manutenção e revitalização.
  ["manutencao-topo", "penteados", false],
  ["revitalizacao", "penteados", false],
];

const sqlString = (value: string | null) => (value === null ? "NULL" : `'${value.replace(/'/g, "''")}'`);
const sqlNumber = (value: number | null) => (value === null ? "NULL" : String(value));

/** SQL de dados da migration `…_agenda_capacidade_e_pagamento` (gerado a partir deste arquivo). */
export function capacityDefaultsSql(): string {
  const lines: string[] = ["-- Dados: serviços novos (se ainda não existirem) e regras de capacidade."];
  for (const rule of DEFAULT_RULES) {
    if (!rule.create) continue;
    const c = rule.create;
    lines.push(
      `INSERT INTO "Service" ("id", "slug", "name", "description", "minHours", "maxHours", "order", "active", "updatedAt") VALUES (${sqlString(c.id)}, ${sqlString(rule.slug)}, ${sqlString(c.name)}, ${sqlString(c.description)}, ${c.minHours}, ${c.maxHours}, ${c.order}, true, CURRENT_TIMESTAMP) ON CONFLICT ("slug") DO NOTHING;`,
    );
  }
  for (const rule of DEFAULT_RULES) {
    lines.push(
      `UPDATE "Service" SET "chairs" = ${rule.chairs}, "staff" = '${rule.staff}', "fullDay" = ${rule.fullDay}, "maxPerPeriod" = ${sqlNumber(rule.maxPerPeriod)}, "maxPerDay" = ${sqlNumber(rule.maxPerDay)}, "startsMorning" = ${rule.startsMorning}, "startsAfternoon" = ${rule.startsAfternoon}, "rulesPending" = ${rule.rulesPending}, "rulesNote" = ${sqlString(rule.rulesNote)} WHERE "slug" = ${sqlString(rule.slug)};`,
    );
  }
  for (const [a, b, sharesChair] of DEFAULT_COMPANIONS) {
    const pairs = a === b ? [[a, b]] : [[a, b], [b, a]];
    for (const [from, to] of pairs) {
      lines.push(
        `INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", ${sharesChair} FROM "Service" a, "Service" b WHERE a."slug" = ${sqlString(from)} AND b."slug" = ${sqlString(to)} ON CONFLICT DO NOTHING;`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}
