# Piloto do agente com leads reais

O agente responde a leads **novos** de anúncio e site em uma janela de horário (padrão **21h30 às 9h30** e **domingos**, quando a Thay está offline). Fora disso, o robô antigo continua. Este servidor **nunca envia** nada ao WhatsApp: quem envia é o ManyChat, com o texto que esta rota devolve.

## Como funciona

1. O lead manda a frase do anúncio ou do site e dispara a automação **"Atendimento > Dreads > Orçamentos"**.
2. No início dela, o ManyChat pergunta ao servidor quem atende (`type: "gate"`). O servidor responde `modo: "agente"` ou `modo: "robo"`. A pergunta não grava nada, não chama o modelo e não custa nada.
3. `agente`: o ManyChat coloca a etiqueta `agente-ativo` e inicia a automação **"Agente - roteador"** (a mesma dos testes). `robo`: segue o robô antigo, sem mudança.
4. As mensagens seguintes do cliente (nome, fotos, respostas) caem na resposta padrão do WhatsApp, que só atende quem tem a etiqueta `agente-ativo` (ou `teste-agente`).
5. Quando o agente encaminha para a Thay, a conversa vira HUMAN: o servidor responde "-" (silêncio) dali em diante.

## Quem o servidor manda para o agente (função `decideLive`)

| Situação | Quem atende |
|---|---|
| Contato de teste (`AGENT_TEST_REPLY_CONTACT_IDS`) | agente, sempre |
| `AGENT_LIVE_MODE` diferente de `night` | robô antigo (interruptor) |
| Limite diário geral atingido | robô antigo |
| Conversa do agente em andamento (BOT ou HUMAN) | agente (continua depois da janela) |
| Lead novo ou conversa finalizada, janela aberta | agente |
| Lead novo, janela fechada | robô antigo |
| Limite diário do contato atingido | agente em silêncio |

## Variáveis (só no ambiente de teste/Preview)

| Variável | Padrão | O que faz |
|---|---|---|
| `AGENT_LIVE_MODE` | desligado | `night` liga o piloto. Qualquer outro valor deixa desligado. |
| `AGENT_LIVE_WINDOW` | `21:30-09:30` | Janela (horário de São Paulo). |
| `AGENT_LIVE_SUNDAYS` | ligado | `off` tira os domingos. |
| `AGENT_LIVE_HOLIDAYS` | vazio | Feriados `AAAA-MM-DD,AAAA-MM-DD`, dia inteiro. |
| `AGENT_LIVE_MAX_PER_CONTACT_DAY` | 40 | Respostas por contato por dia. |
| `AGENT_LIVE_MAX_PER_DAY` | 400 | Respostas por dia, todos os contatos (trava de custo). |

## Como desligar (do mais rápido para o mais definitivo)

1. **ManyChat:** desligar o passo do gate na automação de orçamentos (ou reativar o fluxo antigo). O robô antigo assume na hora.
2. **Vercel:** `AGENT_LIVE_MODE` vazio (ou apagar) e publicar de novo. Todo lead volta ao robô.
3. **Vercel:** `AGENT_INBOUND_ENABLED=false` desliga a rota inteira.

## Respostas da rota (para o mapeamento do ManyChat)

- Mensagem: `{ ok, status, reply, reply2 }`. `reply`/`reply2` valem "-" quando não há nada a enviar.
- Gate: `{ ok, status: "gate", modo: "agente" | "robo", reply: "-", reply2: "-" }`.
- `status` possíveis no piloto: `replied`, `no_reply`, `outside_hours` (janela fechada), `cap_reached` (limite do contato), `accepted`, `duplicate`.

## Riscos conhecidos

- O ManyChat espera a resposta por até **10 s**. Resposta que passa disso não é entregue nem gravada; a próxima mensagem do cliente é respondida por inteiro. A solução definitiva é enviar pela API do ManyChat (precisa de chave; não feito).
- O servidor não sabe quando a Thay responde pelo celular. À noite isso quase não pesa. De dia, se a Thay entrar antes do encaminhamento, o agente pode responder de novo.
- Os dados dos clientes ficam no banco do ambiente de teste (branch `preview` do Neon), separado do site.

## Acompanhamento (SQL no Neon, branch `preview`)

```sql
-- conversas do piloto e o que o agente respondeu hoje
SELECT c."externalId", c.mode, count(*) FILTER (WHERE m.sender = 'AI') AS respostas_ia,
       count(*) FILTER (WHERE m.sender = 'CUSTOMER') AS msgs_cliente, max(m."createdAt") AS ultima
FROM "Conversation" c JOIN "Message" m ON m."conversationId" = c.id
WHERE c."createdAt" > now() - interval '1 day' GROUP BY 1, 2 ORDER BY ultima DESC;

-- execuções do agente: resultado, travas e custo
SELECT "createdAt", outcome, "guardrailOk", "estimatedCostUsd", "durationMs", "errorCode"
FROM "AgentRun" ORDER BY "createdAt" DESC LIMIT 50;
```
