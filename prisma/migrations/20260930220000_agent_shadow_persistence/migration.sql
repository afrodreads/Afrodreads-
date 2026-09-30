-- Fase 3: persistência e observabilidade do agente (modo sombra).
-- Migração ADITIVA e retrocompatível: cria enums/tabelas novas e colunas
-- OPCIONAIS em Booking (paymentDueAt, appointmentType) e Unit (configuração).
-- Agendamentos antigos continuam válidos: paymentDueAt nulo = regra geral de 60
-- minutos; appointmentType nulo = não classificado (não é inventado).

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('FIRST_APPLICATION', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "AgentRunMode" AS ENUM ('SHADOW');

-- CreateEnum
CREATE TYPE "AgentRunTrigger" AS ENUM ('INBOUND', 'REPLAY');

-- CreateEnum
CREATE TYPE "AgentRunOutcome" AS ENUM ('DRAFT_SAVED', 'DRAFT_BLOCKED', 'NOTHING_TO_ANSWER', 'DISCARDED_MODE_CHANGED', 'CONTEXT_UNAVAILABLE', 'MODEL_ERROR', 'INTERNAL_ERROR');

-- CreateEnum
CREATE TYPE "SystemEventType" AS ENUM ('PAYMENT_CONFIRMED', 'SERVICE_FINISHED');

-- CreateEnum
CREATE TYPE "SystemEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'ATTENDANT');

-- CreateEnum
CREATE TYPE "ManualPaymentMethod" AS ENUM ('PIX', 'DEPOSIT', 'TRANSFER');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "appointmentType" "AppointmentType",
ADD COLUMN     "paymentDueAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "address" TEXT,
ADD COLUMN     "brandId" TEXT,
ADD COLUMN     "humanHoursText" TEXT,
ADD COLUMN     "mapUrl" TEXT,
ADD COLUMN     "parkingInfo" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "publicArea" TEXT,
ADD COLUMN     "reviewUrl" TEXT;

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicLinks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "triggerMessageId" TEXT NOT NULL,
    "mode" "AgentRunMode" NOT NULL DEFAULT 'SHADOW',
    "trigger" "AgentRunTrigger" NOT NULL,
    "replayOfRunId" TEXT,
    "replayLabel" TEXT,
    "modelId" TEXT NOT NULL,
    "promptVersionId" TEXT NOT NULL,
    "outcome" "AgentRunOutcome",
    "agentStatus" TEXT,
    "intent" TEXT,
    "temperature" TEXT,
    "qualification" JSONB,
    "candidateText" TEXT,
    "blockedOriginalText" TEXT,
    "guardrailOk" BOOLEAN,
    "violations" JSONB,
    "proposedHandoff" JSONB,
    "proposedActions" JSONB,
    "rejectedToolCalls" JSONB,
    "contextSnapshot" JSONB,
    "durationMs" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemEvent" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "type" "SystemEventType" NOT NULL,
    "unitId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "SystemEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "plan" JSONB,
    "missing" JSONB,
    "skippedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "SystemEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "unitId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "authSubject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentConfirmation" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "ManualPaymentMethod" NOT NULL,
    "confirmedById" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "previousStatus" "BookingStatus" NOT NULL,
    "newStatus" "BookingStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentHold" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "previousDeadline" TIMESTAMP(3) NOT NULL,
    "newDeadline" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "extendedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsOn" DATE,
    "endsOn" DATE NOT NULL,
    "priceBrl" DECIMAL(10,2),
    "rules" JSONB NOT NULL,
    "conditions" JSONB,
    "serviceId" TEXT,
    "requiresStaffConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_sha256_key" ON "PromptVersion"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "AgentRun_idempotencyKey_key" ON "AgentRun"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AgentRun_conversationId_startedAt_idx" ON "AgentRun"("conversationId", "startedAt");

-- CreateIndex
CREATE INDEX "AgentRun_triggerMessageId_promptVersionId_idx" ON "AgentRun"("triggerMessageId", "promptVersionId");

-- CreateIndex
CREATE INDEX "AgentRun_unitId_startedAt_idx" ON "AgentRun"("unitId", "startedAt");

-- CreateIndex
CREATE INDEX "AgentRun_outcome_idx" ON "AgentRun"("outcome");

-- CreateIndex
CREATE INDEX "AgentRun_intent_idx" ON "AgentRun"("intent");

-- CreateIndex
CREATE UNIQUE INDEX "SystemEvent_idempotencyKey_key" ON "SystemEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SystemEvent_status_createdAt_idx" ON "SystemEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SystemEvent_entityType_entityId_idx" ON "SystemEvent"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_authSubject_key" ON "StaffUser"("authSubject");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentConfirmation_idempotencyKey_key" ON "PaymentConfirmation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentConfirmation_bookingId_idx" ON "PaymentConfirmation"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentHold_idempotencyKey_key" ON "PaymentHold"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentHold_bookingId_createdAt_idx" ON "PaymentHold"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "Promotion_unitId_active_idx" ON "Promotion"("unitId", "active");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_triggerMessageId_fkey" FOREIGN KEY ("triggerMessageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffUser" ADD CONSTRAINT "StaffUser_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentConfirmation" ADD CONSTRAINT "PaymentConfirmation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentConfirmation" ADD CONSTRAINT "PaymentConfirmation_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentHold" ADD CONSTRAINT "PaymentHold_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentHold" ADD CONSTRAINT "PaymentHold_extendedById_fkey" FOREIGN KEY ("extendedById") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seeds (DADOS, não código). Valores tirados do prompt V2 (§8, §10, §22).
-- Endereço, mapa e telefone da unidade NÃO são preenchidos aqui: ficam nulos
-- até a equipe cadastrar (sem eles, o SYSTEM não envia localização).
INSERT INTO "Brand" ("id", "slug", "name", "publicLinks", "updatedAt")
VALUES (
  'brand_afro_dreads',
  'afro-dreads',
  'Afro Dreads',
  '["https://www.afrodreads.com.br", "https://www.afrodreads.com.br/servicos", "https://www.afrodreads.com.br/portfolio"]'::jsonb,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

UPDATE "Unit"
SET "brandId" = 'brand_afro_dreads',
    "publicArea" = 'Pirituba, zona noroeste de São Paulo',
    "humanHoursText" = 'segunda a sexta, das 10h às 21h; sábado, das 10h às 15h; domingos e feriados, fechado',
    "reviewUrl" = 'https://g.page/r/CUFwpwTBzXTjEBM/review',
    "parkingInfo" = 'Temos estacionamento no local.'
WHERE "id" = 'unit_principal' AND "brandId" IS NULL;

-- Promoção de aniversário (V2 §10): válida até 31/10/2026 (dia de SP, inclusive).
INSERT INTO "Promotion" ("id", "unitId", "name", "active", "startsOn", "endsOn", "priceBrl", "rules", "conditions", "serviceId", "requiresStaffConfirmation", "updatedAt")
SELECT
  'promo_aniversario_2026',
  'unit_principal',
  'Promoção de Aniversário',
  true,
  NULL,
  DATE '2026-10-31',
  750,
  '["Aplicação somente no topo da cabeça", "Para quem tem corte alto", "Com extensão sintética", "Cor à escolha entre as opções disponíveis", "Cabeça toda ou corte americano não se enquadram", "Foto atual do cabelo é necessária para a equipe confirmar o enquadramento"]'::jsonb,
  '{"area": "topo", "corte": "alto", "material": "sintetico"}'::jsonb,
  (SELECT "id" FROM "Service" WHERE "slug" = 'primeira-aplicacao-topo'),
  true,
  CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "Unit" WHERE "id" = 'unit_principal')
ON CONFLICT ("id") DO NOTHING;
