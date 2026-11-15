INSERT INTO "Promotion" (id, "unitId", name, active, "startsOn", "endsOn", "priceBrl", rules, conditions, "requiresStaffConfirmation", "createdAt", "updatedAt")
SELECT 'promo_black_friday_2026', u.id, 'Promoção Black Friday', true, '2026-11-01', '2026-11-30', 700,
 '["Dreads no topo da cabeça, com extensão sintética preta, para quem usa corte alto","De R$ 900 por R$ 700; inclui aplicação, confecção da extensão, dicas de cuidados e atendimento personalizado; de 3 a 5 horas","Mínimo de 4 dedos de comprimento de cabelo no topo","Cabeça toda, corte americano, outra cor ou cabelo humano não entram: orçamento normal com a Thay","Sinal em novembro: 50% (R$ 350); o restante (R$ 350) no dia, por Pix, dinheiro, débito ou crédito em até 12x com juros","Não soma com outros descontos"]'::jsonb,
 '{"area":"topo","corte":"alto","material":"sintetico preto"}'::jsonb, true, now(), now()
FROM "Unit" u WHERE u.slug = 'principal';
