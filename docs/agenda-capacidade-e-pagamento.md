# Agenda por cadeiras e períodos, cadastro de serviços e pagamento sinal ou total

## Modelo

Cada dia tem **2 períodos** (manhã = 10h, tarde = 15h) e **2 cadeiras** (Lyon e Thay): 4 "cadeiras-período". Um serviço
cabe no dia quando:

1. pode começar naquele período;
2. os limites do serviço por período e por dia são respeitados;
3. pode dividir o dia com cada agendamento já existente (lista "pode dividir o dia com", sempre gravada nos dois sentidos);
4. existe uma distribuição de todos nas cadeiras que respeita quem pode fazer cada serviço.

Código: `src/lib/capacity/` (motor puro, sem banco). **Nenhuma regra de serviço é fixa no código**: tudo vem do cadastro
(`Service` + `ServiceCompanion`). `defaults.ts` é só a carga inicial (gravada pela migration) e a fonte dos testes.

Domingo e segunda ficam fechados (`schedule.ts`). Dias bloqueados (`BlockedDate`) continuam valendo.

## Regras carregadas (especificação de 18/10/2026)

Siglas: MC manutenção completa, AC aplicação cabeça toda, ML microlocs, AT aplicação no topo, MT manutenção no topo,
R retwist / retwist + twist / start locks, RV revitalização, PT penteado.

| Serviço | Cadeiras | Quem | Limites | Começa |
|---|---|---|---|---|
| MC | 2 | qualquer | — | manhã ou tarde |
| AC | 2 | qualquer | — | só manhã |
| ML | 1 (dia inteiro) | Thay | 1 por dia | só manhã |
| AT | 1 | qualquer | — | manhã ou tarde |
| MT | 1 | qualquer | 2 por período, 4 por dia | manhã ou tarde |
| R | 1 | Thay | 1 por período | manhã ou tarde |
| RV | 1 | qualquer | 1 por período | só manhã |
| PT | 1 | qualquer | 1 por dia | manhã ou tarde |

Combinações permitidas no mesmo dia: MC+MC, MC+MT, MC+PT, MC+R (mesma cadeira da Thay no mesmo período), MT+MT, MT+AC,
MT+ML, MT+AT, MT+R, MT+PT, ML+AT, AT+R, RV+PT. **Todas as demais ficam bloqueadas no calendário do cliente** e só entram
por encaixe manual no painel.

### PENDENTE (decisão do estúdio; hoje bloqueado, liberável no painel)

- MC + AT (a AT diz que divide com MC; a MC não lista AT).
- Dois serviços do grupo R no mesmo dia (manhã e tarde).
- AT + AT; AT + RV; AT + PT; AC + PT (penteado no lugar de uma MT); MC + RV; MT + RV; R + RV; R + PT.
- "Retwist + twist" e "Start locks" foram tratados como dois serviços (Start Locs = slug histórico `retwist-twist`).
- Short Dread e Cultivo Agulhado: regra **provisória** (2 cadeiras, sem companhia). Ajuste no painel.
- Serviços de 8 h ou mais (AC, ML, RV, Cultivo Agulhado) só começam de manhã (comportamento que já existia).

Tudo isso aparece como "Pendente" e com observação em `/admin/servicos`; basta editar e a regra vale na hora.

## Cores do calendário

- **Cliente** (considera o serviço escolhido): vermelho = nenhuma vaga daquele serviço; amarelo = **1 vaga**; verde =
  **2 ou mais**.
- **Painel** (o dia como um todo): vermelho = nenhum serviço ativo cabe mais; amarelo = sobrou **1** cadeira-período;
  verde = sobraram 2 ou mais (mesmo com 1 agendamento no dia).
- Além da cor, cada dia tem ícone (✓ ! ✕) e texto (leitor de tela: "Com vagas", "Última vaga", "Esgotado").
- A vaga restante vem da mesma função que decide se cabe (`remainingFor`): a cor nunca discorda do que a agenda aceita.

## Segurar o horário

O agendamento nasce "aguardando pagamento" e segura a vaga por **60 minutos** (`bookingRules.ts`). O checkout mostra um
**contador** no topo (relógio do servidor) e a cobrança do Mercado Pago expira no mesmo instante. Passado o prazo, a vaga
volta. A agenda do dia é travada (`pg_advisory_xact_lock`) durante a reserva: duas clientes nunca pegam a última vaga.

## Encaixe manual (só administradores)

`POST /api/admin/bookings` (a rota exige o login do admin) e `PATCH /api/admin/bookings/[id]` com `force: true`:
ignora capacidade e bloqueio do dia (o horário continua sendo 10h ou 15h). O **motivo é obrigatório** e fica gravado
(`Booking.forced`, `forcedReason`). Um encaixe nunca é derrubado por pagamento atrasado e conta na agenda do dia.

## Pagamento: sinal ou valor total

- O link de orçamento define: **cliente escolhe** (padrão), só sinal ou só valor total (`Quote.paymentOptions`).
- No checkout o cliente escolhe; existe **uma** cobrança em aberto por agendamento (trocar de opção atualiza a mesma linha).
- O webhook decide pelo **valor pago** se foi sinal ou total; o agendamento passa a mostrar `paymentOption` e o restante
  no dia (zero se pagou tudo). E-mails e painel dizem qual foi.
- **Pagou duas vezes** (sinal e total): fica o primeiro pagamento, o outro é estornado automaticamente.
- **Cancelamento**: 2 dias ou mais → devolve tudo. Menos de 2 dias → quem pagou só o sinal não recebe nada; quem pagou o
  **total recebe tudo menos o valor do sinal** (estorno parcial, com chave de idempotência).
- Sem desconto para pagamento total (não foi pedido).

## Manutenções por tipo e área (19/10/2026)

Migration `20261019030000_manutencoes_raiz` (só dados):

| Serviço no painel | Slug | Regras |
|---|---|---|
| Manutenção completa (cabeça toda) | `manutencao-completa` | as da especificação (2 cadeiras) |
| Manutenção completa (topo) | `manutencao-topo` (antes "Manutenção no topo") | as da especificação (1 cadeira, 2 por período, 4 por dia) |
| Manutenção só raiz (cabeça toda) | `manutencao-raiz-cabeca-toda` | **PENDENTE**: copiadas da completa (cabeça toda) |
| Manutenção só raiz (topo) | `manutencao-raiz-topo` | **PENDENTE**: copiadas da completa (topo) |

As "só raiz" herdam também com quem dividem o dia. Confirme duração e regras no painel.

## Google Agenda

- **Agenda assinada**: no painel (Agenda → "Google Agenda" → Conectar) há um link privado
  (`/api/agenda/feed?token=…`) para "Adicionar agenda → Do URL" no Google Agenda. Os agendamentos **confirmados**
  aparecem sozinhos (o Google atualiza a cada algumas horas). O token deriva de `ADMIN_SESSION_SECRET`: trocar esse
  segredo invalida o link. Sem o token certo a rota responde 404. O feed tem nome e WhatsApp dos clientes: não compartilhar.
- **Um clique**: botão "Adicionar ao Google Agenda" no e-mail da equipe a cada agendamento confirmado, na lista e no
  detalhe do dia do painel. Coloca o compromisso na hora.

## Arquivos principais

`src/lib/capacity/*`, `src/lib/schedule.ts`, `src/lib/bookingCreation.ts`, `src/lib/bookingStores.ts`,
`src/lib/paymentOptions.ts`, `src/lib/paymentSettlement.ts`, `src/lib/serviceRegistry*.ts`, `src/app/api/availability/*`,
`src/app/api/admin/{agenda,bookings,services}/*`, `src/app/checkout/[bookingId]/page.tsx`,
`src/components/{booking/MonthCalendar,checkout/*,admin/AdminAgenda}.tsx`, `src/app/admin/servicos/page.tsx`,
migration `20261018120000_agenda_capacidade_e_pagamento` (aditiva).
