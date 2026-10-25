# Política de dados pessoais do agente (LGPD)

Revisada na Fase 4A, antes de ligar qualquer canal real. Descreve o que **já existe** e o que **precisa estar pronto
antes de o agente falar com clientes**. Não é parecer jurídico; revise com quem cuida da conformidade da empresa.

## 1. O que é armazenado

| Dado | Onde | Conteúdo | Por quê |
|---|---|---|---|
| Cliente | `Customer` | telefone normalizado, nome, unidade | identificar sem duplicar |
| Conversa | `Conversation` | id do contato no canal, estado (BOT/HUMAN/FINISHED), responsável, último contato | saber quem atende |
| Mensagens | `Message` | texto como chegou (sem payload bruto do canal), autor, horário, id externo | contexto do atendimento |
| Execução do agente | `AgentRun` | **ids** das mensagens usadas (não cópia do texto), rascunho da IA, intenção, qualificação, guardrails, handoff proposto, tokens, custo, erro sem segredos | avaliar o agente em sombra |
| Encaminhamento | `Handoff` | motivo e resumo estruturado | a equipe não relê tudo |
| Eventos SYSTEM | `SystemEvent` | tipo, id da entidade, plano **sem endereço/mapa** | fila de mensagens oficiais |
| Auditoria financeira | `PaymentConfirmation`, `PaymentHold` | valor, método, quem, quando, comprovante (referência) | prestação de contas |

O que **não** é armazenado:

- payload bruto do provedor;
- imagens e áudios (no máximo o tipo, em metadados);
- CPF, cartão ou senha pedidos pelo agente (ele não pede, e os guardrails bloqueiam).

Se o **cliente** escrever um desses dados por conta própria, o texto original fica na `Message`, mas **o modelo recebe
a versão com `[dado omitido]`** (`redact.ts`).

## 2. Retenção (proposta; implementar antes da produção)

| Dado | Prazo | Como |
|---|---|---|
| `AgentRun` de sombra (rascunhos) | 90 dias | rotina diária apaga os antigos |
| `Message`/`Conversation` sem agendamento | 12 meses após o último contato | rotina diária |
| `Message`/`Conversation` de clientes com agendamento | 5 anos (relação de consumo) | idem |
| `SystemEvent` processado | 12 meses | idem |
| Auditorias financeiras | 5 anos | mantidas (obrigação legal/contábil) |
| Logs da Vercel | limite do plano (Hobby: 1 hora) | os logs da rota não têm texto, telefone nem nome |

Os prazos são **propostas** e dependem de confirmação da empresa.

## 3. Exclusão (direito do titular)

**Já funciona no banco:** apagar um `Customer` apaga em cascata conversas, mensagens, encaminhamentos, transições e
AgentRuns; agendamentos e auditorias financeiras são preservados (o `customerId` vira nulo).

**Falta antes da produção:** procedimento só para ADMIN (tela ou comando) que registre quem pediu, quando e o que foi
apagado, e anonimize nome e telefone nos agendamentos quando não houver obrigação de mantê-los.

## 4. Acesso

- Nenhuma rota pública expõe cliente, conversa, mensagem, AgentRun ou evento (testes garantem).
- A única rota do agente (`/api/agent/inbound`) só **recebe**, exige segredo e responde só com status.
- O painel `/admin/agente` exige o login do admin. Ele mostra rascunhos da IA e respostas da equipe; o texto completo
  da conversa não aparece. **Antes da produção:** login individual (StaffUser), para registrar quem acessou.

## 5. Anonimização

Para análises depois do prazo de retenção: trocar telefone e nome por um identificador aleatório, remover o texto livre
das mensagens e dos rascunhos e manter só os agregados (intenção, resultado, duração, custo). As métricas já não
dependem de dados pessoais.

## 6. Segredos

- `ANTHROPIC_API_KEY` e `AGENT_INBOUND_SECRET` existem só como variáveis de ambiente. Nunca vão para código, logs,
  AgentRun nem respostas HTTP.
- Erros gravados passam por `sanitizeError`, que remove chaves, tokens, senhas e URLs de banco.
- O adaptador do modelo não faz log.

## 7. Provedores externos

Ao ligar o modelo, o texto das conversas (já sem dados sensíveis) e o prompt vão para a **Anthropic**. Antes da
produção é preciso:

- revisar os termos e a política de retenção de dados do provedor para a conta usada, e configurar a menor retenção
  disponível;
- informar ao cliente que o primeiro atendimento é feito por uma atendente virtual (o V2 já prevê);
- incluir o provedor no aviso de privacidade do site;
- fazer o mesmo com o ManyChat, que já recebe as conversas hoje.
