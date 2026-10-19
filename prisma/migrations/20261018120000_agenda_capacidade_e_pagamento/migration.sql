-- Agenda por períodos e cadeiras, cadastro de serviços com regras e pagamento sinal ou valor total.
-- Migração ADITIVA: só tipos, colunas opcionais ou com padrão e uma tabela nova. Nada é removido.
-- Os padrões das colunas reproduzem o comportamento antigo; os dados abaixo carregam as regras
-- (gerados por src/lib/capacity/defaults.ts; depois disso, as regras são editadas no painel).

-- CreateEnum
CREATE TYPE "ServiceStaff" AS ENUM ('ANY', 'LYON', 'THAY');

-- CreateEnum
CREATE TYPE "DayPeriod" AS ENUM ('MORNING', 'AFTERNOON');

-- CreateEnum
CREATE TYPE "PaymentOption" AS ENUM ('DEPOSIT', 'FULL');

-- CreateEnum
CREATE TYPE "QuotePaymentOptions" AS ENUM ('CLIENT_CHOICE', 'DEPOSIT_ONLY', 'FULL_ONLY');

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "chairs" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "fullDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxPerDay" INTEGER,
ADD COLUMN     "maxPerPeriod" INTEGER,
ADD COLUMN     "rulesNote" TEXT,
ADD COLUMN     "rulesPending" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "staff" "ServiceStaff" NOT NULL DEFAULT 'ANY',
ADD COLUMN     "startsAfternoon" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "startsMorning" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "forced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "forcedReason" TEXT,
ADD COLUMN     "paymentOption" "PaymentOption",
ADD COLUMN     "period" "DayPeriod";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "refundedAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "paymentOptions" "QuotePaymentOptions" NOT NULL DEFAULT 'CLIENT_CHOICE';

-- CreateTable
CREATE TABLE "ServiceCompanion" (
    "serviceId" TEXT NOT NULL,
    "companionId" TEXT NOT NULL,
    "sharesChair" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ServiceCompanion_pkey" PRIMARY KEY ("serviceId","companionId")
);

-- CreateIndex
CREATE INDEX "ServiceCompanion_companionId_idx" ON "ServiceCompanion"("companionId");

-- AddForeignKey
ALTER TABLE "ServiceCompanion" ADD CONSTRAINT "ServiceCompanion_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCompanion" ADD CONSTRAINT "ServiceCompanion_companionId_fkey" FOREIGN KEY ("companionId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Dados: serviços novos (se ainda não existirem) e regras de capacidade.
INSERT INTO "Service" ("id", "slug", "name", "description", "minHours", "maxHours", "order", "active", "updatedAt") VALUES ('svc_manutencao_completa', 'manutencao-completa', 'Manutenção completa (cabeça toda)', 'Manutenção dos dreads em toda a cabeça.', 3, 5, 10, true, CURRENT_TIMESTAMP) ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Service" ("id", "slug", "name", "description", "minHours", "maxHours", "order", "active", "updatedAt") VALUES ('svc_manutencao_topo', 'manutencao-topo', 'Manutenção no topo', 'Manutenção dos dreads na região do topo da cabeça.', 3, 5, 11, true, CURRENT_TIMESTAMP) ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Service" ("id", "slug", "name", "description", "minHours", "maxHours", "order", "active", "updatedAt") VALUES ('svc_retwist_mais_twist', 'retwist-mais-twist', 'Retwist + twist', 'Retwist da raiz com finalização em twist.', 3, 5, 12, true, CURRENT_TIMESTAMP) ON CONFLICT ("slug") DO NOTHING;
UPDATE "Service" SET "chairs" = 2, "staff" = 'ANY', "fullDay" = false, "maxPerPeriod" = NULL, "maxPerDay" = NULL, "startsMorning" = true, "startsAfternoon" = true, "rulesPending" = false, "rulesNote" = 'PENDENTE: pode dividir o dia com aplicação no topo? (a aplicação no topo diz que sim; a manutenção completa não lista). Revitalização no outro período?' WHERE "slug" = 'manutencao-completa';
UPDATE "Service" SET "chairs" = 1, "staff" = 'ANY', "fullDay" = false, "maxPerPeriod" = 2, "maxPerDay" = 4, "startsMorning" = true, "startsAfternoon" = true, "rulesPending" = false, "rulesNote" = 'PENDENTE: pode dividir o dia com revitalização?' WHERE "slug" = 'manutencao-topo';
UPDATE "Service" SET "chairs" = 2, "staff" = 'ANY', "fullDay" = false, "maxPerPeriod" = NULL, "maxPerDay" = NULL, "startsMorning" = true, "startsAfternoon" = false, "rulesPending" = false, "rulesNote" = 'PENDENTE: o penteado pode substituir uma das manutenções no topo do outro período?' WHERE "slug" = 'cabeca-toda';
UPDATE "Service" SET "chairs" = 1, "staff" = 'THAY', "fullDay" = true, "maxPerPeriod" = 1, "maxPerDay" = 1, "startsMorning" = true, "startsAfternoon" = false, "rulesPending" = false, "rulesNote" = 'Aplicação ou manutenção de microlocs: a Thay fica o dia inteiro; a outra cadeira aceita só aplicação ou manutenção no topo, 1 por período.' WHERE "slug" = 'microlocs';
UPDATE "Service" SET "chairs" = 1, "staff" = 'ANY', "fullDay" = false, "maxPerPeriod" = NULL, "maxPerDay" = NULL, "startsMorning" = true, "startsAfternoon" = true, "rulesPending" = false, "rulesNote" = 'PENDENTE: duas aplicações no topo no mesmo dia? Com manutenção completa, revitalização ou penteado?' WHERE "slug" = 'primeira-aplicacao-topo';
UPDATE "Service" SET "chairs" = 1, "staff" = 'THAY', "fullDay" = false, "maxPerPeriod" = 1, "maxPerDay" = NULL, "startsMorning" = true, "startsAfternoon" = true, "rulesPending" = false, "rulesNote" = 'PENDENTE: a Thay pode fazer dois destes no mesmo dia (manhã e tarde)? Com revitalização ou penteado?' WHERE "slug" = 'retwist';
UPDATE "Service" SET "chairs" = 1, "staff" = 'THAY', "fullDay" = false, "maxPerPeriod" = 1, "maxPerDay" = NULL, "startsMorning" = true, "startsAfternoon" = true, "rulesPending" = false, "rulesNote" = 'PENDENTE: confirmar se é um serviço diferente de Start Locs.' WHERE "slug" = 'retwist-mais-twist';
UPDATE "Service" SET "chairs" = 1, "staff" = 'THAY', "fullDay" = false, "maxPerPeriod" = 1, "maxPerDay" = NULL, "startsMorning" = true, "startsAfternoon" = true, "rulesPending" = false, "rulesNote" = 'PENDENTE: a Thay pode fazer dois destes no mesmo dia (manhã e tarde)?' WHERE "slug" = 'retwist-twist';
UPDATE "Service" SET "chairs" = 1, "staff" = 'ANY', "fullDay" = false, "maxPerPeriod" = 1, "maxPerDay" = NULL, "startsMorning" = true, "startsAfternoon" = false, "rulesPending" = false, "rulesNote" = 'Dura 6 a 8 h; o sistema trata como 1 período (ajuste manual pelo encaixe). PENDENTE: com quais serviços divide o dia além do penteado?' WHERE "slug" = 'revitalizacao';
UPDATE "Service" SET "chairs" = 1, "staff" = 'ANY', "fullDay" = false, "maxPerPeriod" = NULL, "maxPerDay" = 1, "startsMorning" = true, "startsAfternoon" = true, "rulesPending" = false, "rulesNote" = 'PENDENTE: com aplicação no topo e com aplicação cabeça toda?' WHERE "slug" = 'penteados';
UPDATE "Service" SET "chairs" = 2, "staff" = 'ANY', "fullDay" = false, "maxPerPeriod" = NULL, "maxPerDay" = NULL, "startsMorning" = true, "startsAfternoon" = true, "rulesPending" = true, "rulesNote" = 'PENDENTE: regra provisória (ocupa as 2 cadeiras no período e não divide o dia). Defina no painel.' WHERE "slug" = 'short-dread';
UPDATE "Service" SET "chairs" = 2, "staff" = 'ANY', "fullDay" = false, "maxPerPeriod" = NULL, "maxPerDay" = NULL, "startsMorning" = true, "startsAfternoon" = false, "rulesPending" = true, "rulesNote" = 'PENDENTE: regra provisória (ocupa as 2 cadeiras de manhã e não divide o dia). Defina no painel.' WHERE "slug" = 'cultivo-agulhado';
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'manutencao-completa' AND b."slug" = 'manutencao-completa' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'manutencao-completa' AND b."slug" = 'manutencao-topo' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'manutencao-topo' AND b."slug" = 'manutencao-completa' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'manutencao-completa' AND b."slug" = 'penteados' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'penteados' AND b."slug" = 'manutencao-completa' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", true FROM "Service" a, "Service" b WHERE a."slug" = 'manutencao-completa' AND b."slug" = 'retwist' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", true FROM "Service" a, "Service" b WHERE a."slug" = 'retwist' AND b."slug" = 'manutencao-completa' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", true FROM "Service" a, "Service" b WHERE a."slug" = 'manutencao-completa' AND b."slug" = 'retwist-mais-twist' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", true FROM "Service" a, "Service" b WHERE a."slug" = 'retwist-mais-twist' AND b."slug" = 'manutencao-completa' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", true FROM "Service" a, "Service" b WHERE a."slug" = 'manutencao-completa' AND b."slug" = 'retwist-twist' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", true FROM "Service" a, "Service" b WHERE a."slug" = 'retwist-twist' AND b."slug" = 'manutencao-completa' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'cabeca-toda' AND b."slug" = 'manutencao-topo' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'manutencao-topo' AND b."slug" = 'cabeca-toda' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'microlocs' AND b."slug" = 'primeira-aplicacao-topo' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'primeira-aplicacao-topo' AND b."slug" = 'microlocs' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'microlocs' AND b."slug" = 'manutencao-topo' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'manutencao-topo' AND b."slug" = 'microlocs' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'primeira-aplicacao-topo' AND b."slug" = 'manutencao-topo' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'manutencao-topo' AND b."slug" = 'primeira-aplicacao-topo' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'primeira-aplicacao-topo' AND b."slug" = 'retwist' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'retwist' AND b."slug" = 'primeira-aplicacao-topo' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'primeira-aplicacao-topo' AND b."slug" = 'retwist-mais-twist' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'retwist-mais-twist' AND b."slug" = 'primeira-aplicacao-topo' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'primeira-aplicacao-topo' AND b."slug" = 'retwist-twist' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'retwist-twist' AND b."slug" = 'primeira-aplicacao-topo' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'manutencao-topo' AND b."slug" = 'manutencao-topo' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'manutencao-topo' AND b."slug" = 'retwist' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'retwist' AND b."slug" = 'manutencao-topo' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'manutencao-topo' AND b."slug" = 'retwist-mais-twist' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'retwist-mais-twist' AND b."slug" = 'manutencao-topo' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'manutencao-topo' AND b."slug" = 'retwist-twist' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'retwist-twist' AND b."slug" = 'manutencao-topo' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'manutencao-topo' AND b."slug" = 'penteados' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'penteados' AND b."slug" = 'manutencao-topo' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'revitalizacao' AND b."slug" = 'penteados' ON CONFLICT DO NOTHING;
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair") SELECT a."id", b."id", false FROM "Service" a, "Service" b WHERE a."slug" = 'penteados' AND b."slug" = 'revitalizacao' ON CONFLICT DO NOTHING;
