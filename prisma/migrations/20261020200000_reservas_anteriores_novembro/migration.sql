-- Reservas já combinadas ANTES de a agenda online existir (pedido do estúdio em 20/10/2026):
--   quarta 04/11/2026: só o horário das 10h está livre  -> a TARDE (15h) já está ocupada
--   sábado 21/11/2026: só o horário das 15h está livre   -> a MANHÃ (10h) já está ocupada
-- Cada uma vira um agendamento CONFIRMADO de um serviço interno e inativo ("Reserva anterior
-- ao sistema"), que ocupa as duas cadeiras do período e não divide o período com nenhum
-- outro serviço. Assim o motor de capacidade, o calendário do cliente, o do painel e o feed do
-- Google Agenda já tratam o período como ocupado, sem regra nova.
-- Para liberar um período, cancele o agendamento correspondente no painel.
-- Só dados; nada é removido. Pode rodar mais de uma vez.

INSERT INTO "Service" ("id", "slug", "name", "description", "minHours", "maxHours", "order", "active", "chairs", "staff", "fullDay", "maxPerPeriod", "maxPerDay", "startsMorning", "startsAfternoon", "rulesPending", "rulesNote", "updatedAt")
VALUES ('svc_reserva_anterior', 'reserva-anterior', 'Reserva anterior ao sistema', 'Uso interno: período já ocupado por um atendimento combinado antes da agenda online. Não aparece para o cliente.', 1, 5, 99, false, 2, 'ANY', false, 1, 1, true, true, false, 'Serviço interno e inativo. Ocupa as duas cadeiras do período; não divide o período com ninguém.', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- 04/11/2026 15:00 (São Paulo, UTC-3) = 18:00 UTC
INSERT INTO "Booking" ("id", "clientName", "clientEmail", "clientPhone", "serviceId", "scheduledStart", "scheduledEnd", "servicePrice", "depositAmount", "remainingAmount", "status", "notes", "period", "updatedAt")
SELECT 'bk_anterior_20261104_tarde', 'Reserva anterior (fora do sistema)', 'reserva-anterior@afrodreads.com.br', '-', s."id", TIMESTAMP '2026-11-04 18:00:00', TIMESTAMP '2026-11-04 23:00:00', 0, 0, 0, 'CONFIRMED', 'Atendimento combinado antes da agenda online. Período da tarde ocupado.', 'AFTERNOON', CURRENT_TIMESTAMP
FROM "Service" s WHERE s."slug" = 'reserva-anterior'
ON CONFLICT ("id") DO NOTHING;

-- 21/11/2026 10:00 (São Paulo, UTC-3) = 13:00 UTC
INSERT INTO "Booking" ("id", "clientName", "clientEmail", "clientPhone", "serviceId", "scheduledStart", "scheduledEnd", "servicePrice", "depositAmount", "remainingAmount", "status", "notes", "period", "updatedAt")
SELECT 'bk_anterior_20261121_manha', 'Reserva anterior (fora do sistema)', 'reserva-anterior@afrodreads.com.br', '-', s."id", TIMESTAMP '2026-11-21 13:00:00', TIMESTAMP '2026-11-21 18:00:00', 0, 0, 0, 'CONFIRMED', 'Atendimento combinado antes da agenda online. Período da manhã ocupado.', 'MORNING', CURRENT_TIMESTAMP
FROM "Service" s WHERE s."slug" = 'reserva-anterior'
ON CONFLICT ("id") DO NOTHING;

-- Marca o "pedido de avaliação" como já tratado: o envio automático de e-mail pós-atendimento
-- não deve tentar escrever para essas reservas internas.
INSERT INTO "ReviewRequest" ("bookingId")
SELECT b."id" FROM "Booking" b WHERE b."id" IN ('bk_anterior_20261104_tarde', 'bk_anterior_20261121_manha')
ON CONFLICT ("bookingId") DO NOTHING;
