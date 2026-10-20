-- Novo serviço "Manutenção microlocs" (pedido do estúdio em 20/10/2026).
-- Regras de capacidade copiadas da "Manutenção completa (cabeça toda)" e marcadas como
-- PENDENTES de confirmação no painel (duração, quem atende, cadeiras e com quem divide o dia).
-- Se o serviço já existir com este endereço (criado pelo painel e desativado), só é reativado.
-- Só dados; nada é removido. Pode rodar mais de uma vez.

INSERT INTO "Service" ("id", "slug", "name", "description", "minHours", "maxHours", "basePrice", "order", "active", "chairs", "staff", "fullDay", "maxPerPeriod", "maxPerDay", "startsMorning", "startsAfternoon", "rulesPending", "rulesNote", "updatedAt")
SELECT 'svc_manutencao_microlocs', 'manutencao-microlocs', 'Manutenção microlocs', 'Manutenção das microlocs: raiz e acabamento.', s."minHours", s."maxHours", s."basePrice", 15, true, s."chairs", s."staff", s."fullDay", s."maxPerPeriod", s."maxPerDay", s."startsMorning", s."startsAfternoon", true, 'PENDENTE: regras copiadas da manutenção completa (cabeça toda); confirme duração, quem atende, cadeiras e com quem divide o dia.', CURRENT_TIMESTAMP
FROM "Service" s WHERE s."slug" = 'manutencao-completa'
ON CONFLICT ("slug") DO UPDATE SET "active" = true, "updatedAt" = CURRENT_TIMESTAMP;

-- "Pode dividir o dia com": herda as combinações da manutenção completa (cabeça toda), nos dois sentidos.
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair")
SELECT n."id", c."companionId", c."sharesChair"
FROM "Service" n
JOIN "Service" o ON o."slug" = 'manutencao-completa'
JOIN "ServiceCompanion" c ON c."serviceId" = o."id" AND c."companionId" <> o."id"
WHERE n."slug" = 'manutencao-microlocs'
ON CONFLICT DO NOTHING;

INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair")
SELECT c."companionId", n."id", c."sharesChair"
FROM "Service" n
JOIN "Service" o ON o."slug" = 'manutencao-completa'
JOIN "ServiceCompanion" c ON c."serviceId" = o."id" AND c."companionId" <> o."id"
WHERE n."slug" = 'manutencao-microlocs'
ON CONFLICT DO NOTHING;

-- Se a manutenção completa pode repetir no dia, a de microlocs também pode, e as duas podem estar juntas.
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair")
SELECT a."id", b."id", false
FROM "Service" n
JOIN "Service" o ON o."slug" = 'manutencao-completa'
JOIN "ServiceCompanion" self ON self."serviceId" = o."id" AND self."companionId" = o."id"
CROSS JOIN LATERAL (VALUES (n."id", n."id"), (n."id", o."id"), (o."id", n."id")) AS pares("x", "y")
JOIN "Service" a ON a."id" = pares."x"
JOIN "Service" b ON b."id" = pares."y"
WHERE n."slug" = 'manutencao-microlocs'
ON CONFLICT DO NOTHING;
