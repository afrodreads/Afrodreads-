# Política inicial de dados pessoais do agente (LGPD)

Versão inicial (Fase 3). Descreve o que **já existe** e o que **precisa estar pronto antes de o agente falar com
clientes**. Não é parecer jurídico; revise com quem cuida da conformidade da empresa.

## 1. Quais dados o agente guarda

| Dado | Onde | Por quê |
|---|---|---|
| Telefone (normalizado) e nome | `Customer` | identificar o cliente sem duplicar |
| Texto das mensagens (sem payload bruto do provedor) | `Message` | contexto do atendimento |
| Resposta candidata da IA, intenção, qualificação do projeto | `AgentRun` | avaliar o agente em modo sombra |
| Resumo de encaminhamento | `Handoff` | a equipe não precisa reler tudo |
| Auditoria de confirmação manual e de prazo | `PaymentConfirmation`, `PaymentHold` | prestação de contas |

O que **não** é guardado: payload bruto do provedor, imagens e áudios (no máximo o tipo, em metadados), CPF, cartão,
senha. O `AgentRun` guarda os **ids** das mensagens usadas, não uma cópia do texto. Erros são gravados sem segredos.

## 2. Retenção (a implementar antes da produção)

| Dado | Prazo proposto | Como |
|---|---|---|
| `AgentRun` de sombra | 90 dias | rotina diária apagando os antigos |
| `Message` e `Conversation` sem agendamento | 12 meses após o último contato | rotina diária |
| `Message` e `Conversation` de clientes com agendamento | 5 anos (relação de consumo) | idem |
| `SystemEvent` processado | 12 meses | idem |
| Auditorias financeiras (`PaymentConfirmation`, `PaymentHold`) | 5 anos | mantidas (obrigação legal/contábil) |

Os prazos são **propostas** e dependem de confirmação da empresa.

## 3. Exclusão (direito do titular)

Já funciona no banco: apagar um `Customer` apaga em cascata as conversas, mensagens, encaminhamentos, transições e
AgentRuns dele; os agendamentos são **preservados** sem o vínculo (`customerId` vira nulo). Falta, antes da produção:
um procedimento (tela ou comando interno, só para ADMIN) que registre quem pediu, quando e o que foi apagado, e
anonimize o nome e o telefone nos agendamentos quando não houver obrigação de mantê-los.

## 4. Acesso

- Nenhuma rota pública expõe cliente, conversa, mensagem, AgentRun ou evento (testes garantem).
- O painel `/admin/agente` exige o login do admin e mostra só respostas sugeridas e metadados, não a conversa inteira.
- Antes da produção: login individual (StaffUser), para registrar quem acessou e agiu, e acesso restrito à unidade da
  pessoa.

## 5. Anonimização

Para análises depois do prazo de retenção: substituir telefone e nome por um identificador aleatório, remover o texto
livre das mensagens e manter só os agregados (intenção, resultado, duração). As métricas de sombra já não dependem de
dados pessoais.

## 6. Histórico de conversas

O histórico serve só para atender e para avaliar o agente. Não é usado para pontuar, ranquear ou traçar perfil de
clientes. Transferências para provedores externos (modelo de IA, ManyChat) exigem, antes de ligar: contrato de
tratamento de dados com o provedor, desativação de retenção ou treino pelo provedor quando possível, e aviso ao cliente
de que o primeiro atendimento é feito por uma atendente virtual (o V2 já prevê essa transparência).
