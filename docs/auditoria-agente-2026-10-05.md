# Auditoria do agente de atendimento — Afro Dreads (05/10/2026)

Resposta ao "Prompt mestre". Nada foi implementado a partir dele: é diagnóstico + proposta.
Conclusão curta: **a arquitetura pedida já existe em grande parte** (Fases 0–4B). O que falta é
fechar o ciclo no ManyChat, alimentar o agente com a base completa, passar para a Thay de verdade
e testar com casos reais. Não recomendo reescrever nada.

---

## 1. DIAGNÓSTICO — o que existe hoje

### Arquitetura atual
```
Cliente → WhatsApp (número único, app WhatsApp Business da Thay)
        → ManyChat PRO (canal oficial, automações, gatilho por palavra-chave)
        → POST /api/agent/inbound  (Vercel, Next 16; segredo no cabeçalho)
        → registro: Customer / Conversation / Message (Neon Postgres via Prisma)
          idempotência, limite por IP e por contato, agrupamento de mensagens (4 s / 20 s)
        → orquestrador: contexto da conversa + prompt V2 versionado (hash) + Claude Sonnet 5.5
          ferramentas só como PROPOSTA (request_handoff, update_lead_data)
          travas (checkDraft) + ajuste de formatação para WhatsApp
        → AgentRun em MODO SOMBRA (rascunho; nunca envia)
        → /admin/agente (revisão humana)
Exceção de teste: contatos da lista AGENT_TEST_REPLY_CONTACT_IDS recebem o rascunho aprovado
na resposta HTTP e o ManyChat envia. O servidor nunca chama o WhatsApp.
```
Site (separado do agente): serviços, agendamento com sinal no Mercado Pago, orçamentos, bloqueios,
painel admin, e-mails (Resend), crons (expirar reservas, pedir avaliação).

### Pronto (com testes: ~60 só na entrada/fronteiras; suíte total maior)
| Peça | Onde |
|---|---|
| Modo sombra obrigatório (`assertShadowMode`), testes que provam que nada envia | `src/lib/agent/config.ts`, `boundaries.test.ts` |
| Registro de tudo que o prompt mestre pede na Fase 6: mensagem, contexto usado, intenção, temperatura, qualificação, rascunho, texto bloqueado, violações, handoff proposto, ferramentas pedidas/recusadas, tokens/custo, versão do prompt | `AgentRun` em `prisma/schema.prisma` |
| Prompt V2 modular por seções (identidade, hierarquia de regras, "não invente", tom, conversa natural, intenção, fatos, preço, sinal, manutenção, fluxo por estado, handoff) | `agente/00-prompt-do-agente-v2.md` |
| Máquina de estados da conversa, handoff, transições | `src/lib/conversations/` |
| Travas: preço/faixa, desconto, agenda, dados pessoais, recusa do modelo | `src/lib/agent/guardrails.ts` |
| Replay (reexecutar conversas com outro prompt/modelo) e métricas de qualidade | `replay`, `quality.ts`, `metrics.ts` |
| Política LGPD escrita | `docs/lgpd-agente.md` |
| Preview isolado da produção (banco `preview` próprio) | Vercel + Neon |

### Incompleto
1. **O ciclo de teste no ManyChat ainda não fechou.** As mensagens chegam ao servidor, mas o ManyChat
   registra "Json mapping errors" e nada é enviado. Correção pronta (commit 3c1a0c3, ainda não enviado).
2. **O agente só lê o prompt V2.** Os arquivos `agente/01` a `07` (base de conhecimento, com as
   atualizações recentes como a regra dos 4 dedos) **não estão no git e não são enviados ao modelo**.
   O que vale é só o que está copiado dentro do V2 → risco de divergência.
3. **Passagem para a Thay é só proposta.** Falta o ManyChat pausar o robô, etiquetar e avisar a Thay;
   e detectar quando ela responde pelo celular para o agente parar.
4. **Fotos e áudios:** o agente só recebe texto. A Thay precisa de foto para orçar.
5. **Gatilho:** só dispara com `#testeagente`.
6. **Retenção/exclusão de dados (LGPD):** está como "proposta; implementar antes da produção".
7. **Conjunto de avaliação com conversas reais:** existe o mecanismo de replay, falta a lista de casos.
8. Nada disso está em produção (PRs #48, #49, #50 abertos).

## 2. RISCOS

### Técnicos
- **Tempo limite do ManyChat (~10 s)** com a chamada ao modelo síncrona no modo de teste.
- **Mesmo número para robô e Thay:** sem regra clara, os dois podem responder ao mesmo cliente.
- **ID do contato muda** se o contato for apagado no ManyChat (aconteceu em 02/10).
- **Janela de 24 h da Meta:** fora dela só se envia modelo pago/aprovado.
- **Vercel Hobby é para uso não comercial** pelos termos da Vercel; um site de negócio deveria estar no Pro.
- Chave da Anthropic **vence em 31/10/2026**.

### Segurança
- Rota protegida por segredo (32+ caracteres) + limites; ferramentas da IA nunca executam nada
  (cancelar, reembolsar, mudar preço ou agenda não existem como ferramentas). Bom.
- Prompt injection: mitigado porque a IA não tem poder de ação; travas rodam depois do modelo.
- Pendências: separar credenciais Mercado Pago/ADMIN entre Preview e Produção (não conferido);
  sem `timestamp` no payload a proteção contra reenvio fica fraca; segredo de bypass já vazou
  uma vez em print (foi trocado).

## 3. O QUE REAPROVEITAR
Praticamente tudo. **ManyChat deve continuar** como camada de canal (conexão oficial com a Meta já
feita, Inbox, etiquetas, pausa de automação). O "cérebro" fica no servidor. Trocar o ManyChat pela
API da Meta direta só faz sentido depois, se custo ou limites justificarem.

## 4. ARQUITETURA PROPOSTA (evolução, não reescrita)
As 7 camadas do prompt mestre já existem; a mudança é **onde cada uma mora**:

| Camada | Hoje | Proposta |
|---|---|---|
| Personalidade | V2 §4 | igual |
| Conhecimento | copiado no V2 §8–12 | **montado a partir de `agente/01–07`** (versionado no git, mesmo hash) |
| Regras de negócio | V2 + travas | igual |
| Contexto | `context.ts` | + tipo de mídia recebida |
| Ferramentas | handoff / dados do lead (proposta) | igual; handoff vira ação no ManyChat (etiqueta + pausa) |
| Segurança | travas + modo sombra | igual |
| Transferência | proposta no AgentRun | ManyChat pausa robô, etiqueta "Thay", notifica |

## 5. PLANO (fases pequenas e testáveis)
| # | Item | Prioridade |
|---|---|---|
| 1 | Enviar correção do `reply`, testar o ciclo no ManyChat com o contato de teste | **P0** |
| 2 | Pôr `agente/01–07` no git e carregá-los no prompt (com hash/versionamento) | **P0** |
| 3 | Conversa de teste completa (Lyon + Thay) cobrindo os 17 casos do prompt mestre; Thay marca o que mudaria | P1 |
| 4 | Handoff real no ManyChat (pausa + etiqueta + aviso) e regra "Thay respondeu → agente para" | **P0** antes de clientes |
| 5 | Fotos/áudios: ManyChat informa o tipo; agente pede/encaminha em vez de "não vi" | P1 |
| 6 | Retenção e exclusão de dados (LGPD) | **P0** antes de produção |
| 7 | Limite de gasto diário + botão de desligar + relatório diário | P1 |
| 8 | Merge PRs #48/#49/#50, variáveis em Produção, piloto com 5–10 clientes por etiqueta | P1 |
| 9 | Plano Vercel Pro; renovar chave Anthropic | P2 |
| 10 | Google Calendar, franquias, envio sem ManyChat | P3 |

## 6. PRÓXIMA AÇÃO
Enviar o commit 3c1a0c3 (push na branch `feat/agente-4b`), esperar o deploy do Preview e mandar
`#testeagente Oi, Afro Dreads! Vim pelo site e quero ficar no estilo 💛` do contato de teste.
No ManyChat, a mensagem de envio deve ter condição "agente_resposta diferente de `-`".

## 7. PERGUNTAS QUE PRECISO RESPONDER (as que desbloqueiam)
**Atendimento**
1. Quando a Thay assume uma conversa pelo celular, o robô pode voltar a falar com aquele cliente depois? Em quanto tempo?
2. Fora do horário de atendimento, o agente pode conversar normalmente e deixar o orçamento para a Thay no dia seguinte?

**Dados reais**
3. Você consegue exportar 20–30 conversas do WhatsApp Business (Exportar conversa, sem mídia)? Eu anonimizo antes de usar e não guardo no git.

**Pendências de negócio (estão marcadas PENDENTE na base)**
4. Promoção de R$ 750: termina em qual dia de outubro? Vale para atender em novembro?
5. Fazem manutenção em dreads feitos em outro salão?
6. Horário do estúdio: continua terça a sábado, 10h–18h?
</content>
</invoke>
