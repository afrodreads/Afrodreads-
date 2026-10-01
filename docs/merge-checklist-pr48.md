# Checklist de merge — PR #48 (agente, Fases 0–4A, modo sombra)

Status em 2026-10-01: PR aberto, **sem merge**. CI sem falhas, deploy de Preview `DEPLOYED`.

## O que o merge faz em produção
O build roda `prisma migrate deploy && next build`. Ao fazer merge na `main`, 4 migrations são aplicadas no banco de produção (Neon `main`):

| Migration | O que faz | Risco |
|---|---|---|
| `20260930180000_add_booking_expired_status` | `ALTER TYPE "BookingStatus" ADD VALUE 'EXPIRED'` | baixo, mas ver nota 1 |
| `20260930200000_add_agent_foundation` | tabelas novas (Unit, Customer, Conversation, Message, Handoff, ...); `Booking.customerId/unitId` nullable; 1 INSERT em `Unit` | baixo |
| `20260930220000_agent_shadow_persistence` | tabelas novas (AgentRun, PromptVersion, ...); `Booking.appointmentType/paymentDueAt` nullable; colunas nullable em `Unit`; INSERTs em `Brand` e `Promotion` | baixo |
| `20261001010000_agent_run_usage` | colunas de uso em `AgentRun` | baixo |

Verificado nos arquivos SQL: não há `DROP`, `TRUNCATE`, `RENAME`, `UPDATE` em dados existentes nem coluna `NOT NULL` sem default em tabela já existente. Os `ON DELETE ...` são só chaves estrangeiras novas.

Já provado no banco `preview` (que parte do mesmo estado de produção): as 4 migrations aplicam sem erro. `main` ainda termina em `20260929060947_add_review_request`.

## Antes do merge
- [ ] **Backup/ponto de retorno**: criar uma branch de segurança no Neon a partir da `main` (ex.: `main-pre-agente`), ou anotar o horário. A retenção de histórico é de só 6 horas no plano Free.
- [ ] **Agente desligado em Production**: confirmar no Vercel que `AGENT_INBOUND_ENABLED` e `AGENT_INBOUND_SECRET` **não** existem em Production (a rota nasce desligada: só ativa com `AGENT_INBOUND_ENABLED === "true"`).
- [ ] Sem `ANTHROPIC_API_KEY` em Production (nenhuma chamada à Claude em produção).
- [ ] Horário de baixo movimento (o `ALTER TYPE` e a criação de tabelas são rápidos, mas o build é o mesmo que publica o site).
- [ ] `prisma/data/unit-principal.json` ainda com endereço PENDENTE: confirmar que isso não é usado em produção (agente desligado).

## Notas
1. `ALTER TYPE ... ADD VALUE` não pode ser usado na mesma transação em que o valor novo é usado. O arquivo só adiciona o valor, sem usá-lo, então é seguro.
2. O código novo trata `EXPIRED` e o fuso America/Sao_Paulo (Fase 0). Os agendamentos já existentes continuam com o status atual até o job de expiração rodar; revisar o comportamento do cron de expiração após o deploy.

## Depois do merge
- [ ] Conferir no Neon (`main`): `SELECT migration_name FROM _prisma_migrations ORDER BY started_at DESC LIMIT 8;` deve listar as 4 novas.
- [ ] Abrir o site e uma página de agendamento; fazer um agendamento de teste só se a equipe aceitar.
- [ ] `/admin/agente` abre e mostra painel vazio.
- [ ] Voltar para a memória do projeto e registrar o merge.

## Rollback
As migrations são aditivas: o código antigo continua funcionando com o banco novo. Para voltar, basta reverter o deploy no Vercel (Promote previous deployment). **Não** apague as tabelas novas sem decisão explícita.
