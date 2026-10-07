# Agente: Fase 4B (teste em sombra com o ManyChat, só no Preview)

Objetivo: receber mensagens reais do número da equipe, gerar **rascunhos** e comparar com o que a Thay responde.
O agente **não envia nada ao cliente** (modo sombra). Tudo roda no ambiente **Preview** (banco `preview` do Neon,
chave da Claude de Preview). Produção continua sem as variáveis `AGENT_*`.

## O que mudou no código
`messageId` e `timestamp` do payload passaram a ser **opcionais**, porque o External Request do ManyChat não oferece
um id único por mensagem nem o horário. Sem eles:
- o horário vale o de recebimento no servidor;
- o id é derivado de contato + texto + minuto (`derived:...`). Reenvios no mesmo minuto viram "duplicate".
Se o ManyChat enviar os campos, eles são validados como antes. `messageId` em branco continua inválido.

## Variáveis do Preview (Vercel, ambiente Preview apenas)
| Variável | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | já cadastrada |
| `AGENT_INBOUND_ENABLED` | `true` |
| `AGENT_INBOUND_SECRET` | segredo aleatório com 32+ caracteres (gerado pelo dono; nunca no chat nem no repositório) |
| `AGENT_INBOUND_UNIT_SLUG` | `principal` |
| `AGENT_MODEL` | `claude-sonnet-5-5` (o padrão do código é o Opus, mais caro) |

## Chamada do ManyChat (External Request)
- Método: `POST`, somente HTTPS.
- URL (endereço fixo da branch): `https://afrodreads-git-feat-agente-4b-afrodreadsofc-3097.vercel.app/api/agent/inbound`
- Cabeçalhos:
  - `x-agent-secret`: o `AGENT_INBOUND_SECRET` (a rota também aceita `Authorization: Bearer ...`);
  - `x-vercel-protection-bypass`: segredo de "Protection Bypass for Automation" do Vercel (o Preview exige login do Vercel).
- Corpo (JSON). Os nomes das variáveis do ManyChat devem ser conferidos no seletor de variáveis do editor:

```json
{
  "channel": "whatsapp",
  "type": "message",
  "contactId": "{{user_id}}",
  "phone": "{{phone}}",
  "name": "{{first_name}}",
  "text": "{{last_input_text}}"
}
```

## Regras do teste
1. A automação de teste só pode disparar para o **número da equipe** (por exemplo, contato com uma etiqueta de teste).
   Nenhuma automação existente (como a de "Orçamentos") deve ser alterada.
2. Resposta esperada da rota: `202 {"ok":true,"status":"accepted"}`. Ela nunca devolve texto da IA.
3. Os rascunhos aparecem em `/admin/agente` (precisa de login de admin).
4. Parar se: o agente tentar informar preço ou agenda, ou o gasto da Claude se aproximar do limite mensal.

## Critério de decisão depois de ~2 semanas
- Nenhuma resposta informando preço ou agenda.
- Em conversas que pedem orçamento ou horário, o agente passa para a Thay com as informações coletadas.
- A Thay enviaria a maioria dos rascunhos sem mexer.
- Custo medido por conversa (tokens gravados em cada AgentRun) compatível com a estimativa.

## Transcrição de áudio (05/10/2026)

Clientes mandam muito áudio (cerca de metade das conversas, 30 s a 1 min, descrevendo o cabelo e
tirando dúvidas). O Claude não ouve áudio: um passo antes baixa o arquivo e transcreve.

```
Cliente manda áudio → ManyChat envia o LINK (campo mediaUrl, ou o próprio texto quando é um link)
→ src/lib/agent-media/transcribe.ts baixa (só manybot-files.*.amazonaws.com ou AGENT_MEDIA_HOSTS,
  sem redirecionamento, até 3 MB) → API de transcrição (português + vocabulário do salão)
→ mensagem gravada como "[Áudio do cliente, transcrito automaticamente]: ..." → agente responde
```
- Foto, vídeo, arquivo ou falha: vira o aviso de mídia (o agente agradece e segue; nunca diz que não viu).
- O áudio não é guardado; só o texto transcrito (mesma regra das mensagens, ver `lgpd-agente.md`).
- A mesma mídia nunca é transcrita duas vezes (id `media:<hash>`).

Variáveis (Preview primeiro):
| Variável | Valor |
|---|---|
| `GROQ_API_KEY` | chave da Groq (padrão; plano gratuito, aceita ogg) |
| `AGENT_TRANSCRIBE_PROVIDER` | opcional; `groq` (padrão) ou `openai` (usa `OPENAI_API_KEY`) |
| `AGENT_TRANSCRIBE_ENABLED` | `true` para ligar |
| `AGENT_TRANSCRIBE_MODEL` | opcional; padrão `whisper-large-v3` (Groq) ou `gpt-transcribe` (OpenAI, com plano B `whisper-1`) |
| `AGENT_MEDIA_HOSTS` | opcional; hosts extras de arquivo, separados por vírgula |

ManyChat: no corpo da Solicitação externa, adicionar `"mediaUrl": <campo com o link da última mídia>`.
Sem esse campo, o servidor ainda trata o caso em que o "último texto" do contato é o link do arquivo.
