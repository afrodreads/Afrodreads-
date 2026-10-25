-- Fase 4A: uso e custo do modelo em cada execução do agente (modo sombra).
-- Migração ADITIVA: só colunas opcionais novas em AgentRun. Nada é alterado ou
-- removido; execuções antigas ficam com os campos nulos.

-- AlterTable
ALTER TABLE "AgentRun" ADD COLUMN     "cacheReadTokens" INTEGER,
ADD COLUMN     "cacheWriteTokens" INTEGER,
ADD COLUMN     "estimatedCostUsd" DECIMAL(12,6),
ADD COLUMN     "groupedMessageCount" INTEGER,
ADD COLUMN     "inputTokens" INTEGER,
ADD COLUMN     "outputTokens" INTEGER,
ADD COLUMN     "servedModel" TEXT,
ADD COLUMN     "stopReason" TEXT;
