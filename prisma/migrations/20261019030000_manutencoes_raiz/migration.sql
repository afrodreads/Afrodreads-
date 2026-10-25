-- Manutenções separadas por tipo e área (pedido do estúdio em 19/10/2026):
--   Manutenção completa (cabeça toda)  = manutencao-completa (já existia)
--   Manutenção completa (topo)          = manutencao-topo (só o nome muda)
--   Manutenção só raiz (cabeça toda)    = nova, regras copiadas da completa (cabeça toda)
--   Manutenção só raiz (topo)           = nova, regras copiadas da completa (topo)
-- As regras herdadas ficam PENDENTES de confirmação no painel. Só dados: nada é removido.

UPDATE "Service" SET "name" = 'Manutenção completa (topo)', "description" = 'Manutenção completa dos dreads na região do topo da cabeça.', "updatedAt" = CURRENT_TIMESTAMP WHERE "slug" = 'manutencao-topo' AND "name" = 'Manutenção no topo';

-- Serviços novos com as mesmas regras de capacidade da manutenção completa da mesma área.
INSERT INTO "Service" ("id", "slug", "name", "description", "minHours", "maxHours", "order", "active", "chairs", "staff", "fullDay", "maxPerPeriod", "maxPerDay", "startsMorning", "startsAfternoon", "rulesPending", "rulesNote", "updatedAt")
SELECT 'svc_manutencao_raiz_cabeca_toda', 'manutencao-raiz-cabeca-toda', 'Manutenção só raiz (cabeça toda)', 'Manutenção só da raiz (o cabelo que cresceu) em toda a cabeça.', s."minHours", s."maxHours", 12, true, s."chairs", s."staff", s."fullDay", s."maxPerPeriod", s."maxPerDay", s."startsMorning", s."startsAfternoon", true, 'PENDENTE: regras copiadas da manutenção completa (cabeça toda); confirme duração, cadeiras e com quem divide o dia.', CURRENT_TIMESTAMP
FROM "Service" s WHERE s."slug" = 'manutencao-completa'
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Service" ("id", "slug", "name", "description", "minHours", "maxHours", "order", "active", "chairs", "staff", "fullDay", "maxPerPeriod", "maxPerDay", "startsMorning", "startsAfternoon", "rulesPending", "rulesNote", "updatedAt")
SELECT 'svc_manutencao_raiz_topo', 'manutencao-raiz-topo', 'Manutenção só raiz (topo)', 'Manutenção só da raiz (o cabelo que cresceu) na região do topo da cabeça.', s."minHours", s."maxHours", 13, true, s."chairs", s."staff", s."fullDay", s."maxPerPeriod", s."maxPerDay", s."startsMorning", s."startsAfternoon", true, 'PENDENTE: regras copiadas da manutenção completa (topo); confirme duração, limites e com quem divide o dia.', CURRENT_TIMESTAMP
FROM "Service" s WHERE s."slug" = 'manutencao-topo'
ON CONFLICT ("slug") DO NOTHING;

UPDATE "Service" SET "order" = 14 WHERE "slug" = 'retwist-mais-twist' AND "order" = 12;

-- "Pode dividir o dia com": cada serviço novo herda as combinações do serviço de origem
-- (nos dois sentidos), divide o dia consigo mesmo e com a origem quando a origem pode repetir.

-- Novo → parceiros da origem (exceto a própria origem) e o inverso.
WITH "_heranca" ("novo", "origem") AS (VALUES ('manutencao-raiz-cabeca-toda', 'manutencao-completa'), ('manutencao-raiz-topo', 'manutencao-topo'))
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair")
SELECT n."id", c."companionId", c."sharesChair"
FROM "_heranca" h
JOIN "Service" n ON n."slug" = h."novo"
JOIN "Service" o ON o."slug" = h."origem"
JOIN "ServiceCompanion" c ON c."serviceId" = o."id" AND c."companionId" <> o."id"
ON CONFLICT DO NOTHING;

WITH "_heranca" ("novo", "origem") AS (VALUES ('manutencao-raiz-cabeca-toda', 'manutencao-completa'), ('manutencao-raiz-topo', 'manutencao-topo'))
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair")
SELECT c."companionId", n."id", c."sharesChair"
FROM "_heranca" h
JOIN "Service" n ON n."slug" = h."novo"
JOIN "Service" o ON o."slug" = h."origem"
JOIN "ServiceCompanion" c ON c."serviceId" = o."id" AND c."companionId" <> o."id"
ON CONFLICT DO NOTHING;

-- Se a origem pode repetir no dia, o novo também pode, e os dois podem estar juntos.
WITH "_heranca" ("novo", "origem") AS (VALUES ('manutencao-raiz-cabeca-toda', 'manutencao-completa'), ('manutencao-raiz-topo', 'manutencao-topo'))
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair")
SELECT a."id", b."id", false
FROM "_heranca" h
JOIN "Service" n ON n."slug" = h."novo"
JOIN "Service" o ON o."slug" = h."origem"
JOIN "ServiceCompanion" self ON self."serviceId" = o."id" AND self."companionId" = o."id"
CROSS JOIN LATERAL (VALUES (n."id", n."id"), (n."id", o."id"), (o."id", n."id")) AS pares("x", "y")
JOIN "Service" a ON a."id" = pares."x"
JOIN "Service" b ON b."id" = pares."y"
ON CONFLICT DO NOTHING;

-- Os dois novos entre si quando as origens dividem o dia (completa cabeça toda + completa topo).
WITH "_heranca" ("novo", "origem") AS (VALUES ('manutencao-raiz-cabeca-toda', 'manutencao-completa'), ('manutencao-raiz-topo', 'manutencao-topo'))
INSERT INTO "ServiceCompanion" ("serviceId", "companionId", "sharesChair")
SELECT n1."id", n2."id", c."sharesChair"
FROM "_heranca" h1
JOIN "_heranca" h2 ON h1."novo" <> h2."novo"
JOIN "Service" n1 ON n1."slug" = h1."novo"
JOIN "Service" n2 ON n2."slug" = h2."novo"
JOIN "Service" o1 ON o1."slug" = h1."origem"
JOIN "Service" o2 ON o2."slug" = h2."origem"
JOIN "ServiceCompanion" c ON c."serviceId" = o1."id" AND c."companionId" = o2."id"
ON CONFLICT DO NOTHING;
