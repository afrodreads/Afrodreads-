# Agente: Fase 4A (preparação para o ManyChat em modo sombra)

O sistema fica **pronto para receber mensagens do ManyChat em modo sombra e incapaz de responder ao cliente**. Nada
aqui envia mensagem, altera agenda ou pagamento.

## Rota `POST /api/agent/inbound`

| Item | Como funciona |
|---|---|
| Ligar/desligar | só responde com `AGENT_INBOUND_ENABLED=true` **e** `AGENT_INBOUND_SECRET` (32+ caracteres). Sem isso: 404 |
| Autenticação | cabeçalho `x-agent-secret: <segredo>` (ou `Authorization: Bearer <segredo>`), comparado em tempo constante (SHA-256 + `timingSafeEqual`) |
| Limites | por IP (memória da instância, padrão 300/min) e **por contato no banco** (padrão 20 mensagens/min) |
| Corpo | JSON até 16 KB; texto até 4.000 caracteres; campos desconhecidos são recusados |
| Proteção contra reenvio | `timestamp` precisa estar entre 10 min no passado e 2 min no futuro; `messageId` é idempotente |
| Identidade | a conversa é identificada pelo `contactId` do canal; o telefone serve para achar/criar o cliente; o nome nunca sobrescreve o cadastro |
| Unidade | vem da configuração (`AGENT_INBOUND_UNIT_SLUG` ou a única unidade ativa), nunca do payload |
| Erros | só códigos genéricos (`unauthorized`, `invalid_payload`, `stale_message`, `rate_limited`, `unavailable`, `internal_error`) |
| Resposta | `{ ok, status }` (`accepted`, `duplicate`, `recorded`, `ignored`). **Nunca contém texto da IA.** |
| Processamento | depois da resposta HTTP (`after()` do Next), com agrupamento de mensagens; grava só um AgentRun |
| Logs | só evento, IP e ids. Nunca texto, telefone ou nome |

### Payload (External Request do ManyChat)

```json
{
  "channel": "whatsapp",
  "type": "message",
  "messageId": "<id único da mensagem>",
  "contactId": "{{user_id}}",
  "phone": "{{phone}}",
  "name": "{{first_name}}",
  "text": "{{last_input_text}}",
  "timestamp": "<horário da mensagem, ISO ou epoch>"
}
```

`type: "human_reply"` (com `agent` opcional) registra uma resposta que **a equipe já enviou** pelo WhatsApp, para
comparar com a IA. Isso só registra o fato; nada é enviado.

**PENDENTE (verificar no ManyChat):** quais variáveis o External Request oferece para um **id único por mensagem** e
para o horário. Sem um id único, a proteção contra duplicidade cai para "uma mensagem por conteúdo e horário", que é
mais fraca. Também falta confirmar se o ManyChat consegue encaminhar as mensagens enviadas pela equipe (`human_reply`).

## Agrupamento de mensagens

Cada mensagem agenda uma verificação depois de `AGENT_GROUPING_QUIET_MS` (padrão 4 s, máximo 15 s). Se chegou mensagem
mais nova do cliente, esta é agrupada e a mais nova responde tudo junto. Passado `AGENT_GROUPING_MAX_WAIT_MS` (padrão
20 s, máximo 30 s) desde a primeira mensagem sem resposta, processa assim mesmo. O AgentRun registra quantas mensagens
foram respondidas juntas (`groupedMessageCount`).

## Modelo (Claude) atrás de `ModelClient`

`src/lib/agent-model/claude.ts`, SDK oficial `@anthropic-ai/sdk` (o único lugar do código que o importa).

| Configuração | Padrão | Variável |
|---|---|---|
| Chave | só no ambiente; nunca em código ou log | `ANTHROPIC_API_KEY` (sem ela, as mensagens são registradas e o agente não roda) |
| Modelo | `claude-opus-5-5` | `AGENT_MODEL` |
| Esforço | `medium` | `AGENT_EFFORT` (`low`/`medium`/`high`) |
| Saída máxima | 8.000 tokens (inclui o raciocínio) | `AGENT_MAX_TOKENS` (1.000–16.000) |
| Timeout | 30 s por chamada | `AGENT_TIMEOUT_MS` (5–55 s) |
| Novas tentativas | 1 | `AGENT_MAX_RETRIES` (0–2) |
| Entrada máxima | 200 mil caracteres | — |
| Resposta máxima | 1.500 caracteres (guardrail) | — |
| Fallback de segurança da Anthropic | ligado (`fallbacks: "default"`) | `AGENT_FALLBACKS=off` desliga |

- **Cache do prompt:** a parte fixa (V2, regras e ferramentas) é cacheada; os dados do momento vêm depois.
- **Custo:** cada AgentRun grava os tokens (entrada, saída, cache) e o custo estimado pela tabela de preços (2026-09-25).
- **Falha, recusa ou resposta cortada:** fallback seguro ("vou confirmar com a equipe") e proposta de encaminhamento.

## Segurança do contexto

O modelo **não** recebe preço, disponibilidade, endereço, mapa, dados bancários, credenciais nem tokens. O texto do
cliente passa por `redactForModel` (CPF/CNPJ, cartão, agência/conta, e-mail, chave Pix aleatória, senhas, tokens e
sequências longas de dígitos viram `[dado omitido]`). As regras de execução tratam as mensagens do cliente como
conteúdo, nunca como instruções. Os guardrails bloqueiam:

- valores por extenso ("quatrocentos reais", "R$ setecentos", "1,2k");
- promessas de vaga ("tem vaga amanhã", "consigo te encaixar");
- confirmações ("confirmado para", "pode vir", "o pagamento caiu");
- endereço;
- pedido de CPF, cartão ou dados bancários;
- vazamento de instruções internas ("prompt", "DADOS DO SISTEMA", nomes de ferramentas).

## Configuração da unidade (dados)

`prisma/data/unit-principal.json` registra cada valor com a sua fonte; o que não existe no repositório é PENDENTE.
Aplicar com `npx tsx prisma/apply-unit-config.ts prisma/data/unit-principal.json --apply` (sem `--apply` só mostra o
plano). **PENDENTE:** endereço completo e o nome oficial da unidade.

## Observabilidade e qualidade

`/admin/agente` (atrás do login do admin) mostra:

- mensagens recebidas (24 h e 7 dias), execuções, intenção, temperatura, resposta candidata, guardrail, handoff
  sugerido, tempo, modelo, tokens, custo e mensagens agrupadas;
- lado a lado, o rascunho da IA e a resposta real da equipe.

`quality.ts` resume quantos rascunhos foram comparados, tentativas proibidas, falta de informação, tempo e custo.
Não há nota da equipe nem ranking de pessoas.

## Antes de conectar o ManyChat (Fase 4B)

1. O Preview da Vercel precisa ter banco próprio. Hoje usa o banco de produção (ver relatório).
2. Cadastrar `ANTHROPIC_API_KEY` (só no ambiente de teste), `AGENT_INBOUND_SECRET` e `AGENT_INBOUND_ENABLED`.
3. Confirmar as variáveis do ManyChat (id da mensagem, horário, respostas da equipe).
4. Fazer um teste controlado com o número da equipe, nunca com clientes.
