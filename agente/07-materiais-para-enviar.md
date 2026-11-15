# Materiais que o agente pode enviar como imagem

A equipe confirmou em 30/09/2026 que o agente **pode enviar os cards como imagem** e que **os cards são os únicos materiais** que a equipe usa. Os arquivos estão em `agente/materiais/`.

| Card | Arquivo | Conteúdo |
|---|---|---|
| Agendamento (**versão atual, a ser substituída**) | `materiais/card-agendamento.jpg` | Sinal de R$ 50, "sinal não reembolsável", reagendamento, atraso |
| Agendamento (**versão nova, com a regra correta**) | `materiais/card-agendamento-novo.png` | Sinal, devolução com 2 dias ou mais, ausência sem aviso, reagendamento, atraso |
| Cuidados antes dos dreads | `materiais/card-cuidados-antes-dos-dreads.jpg` | Antes da aplicação: lavar só com shampoo, hidratar e tirar resíduos, vir com cabelo seco e desembaraçado |
| Cuidados depois dos dreads | `materiais/card-cuidados-depois-dos-dreads.jpg` | Lavagem semanal, sem condicionador, óleos vegetais, touca de cetim, palm rolling |
| Manutenção | `materiais/card-manutencao.jpg` | Primeira manutenção em 1 mês; depois de 2 em 2 meses, no máximo de 3 em 3 |
| Cuidados antes da manutenção | `materiais/card-cuidados-antes-da-manutencao.jpg` | Lavar só com shampoo, vir seco, sem cremes/óleos |

## Quando enviar cada card (regras da equipe, 30/09/2026)

| Card | Para quem | Quando |
|---|---|---|
| **Cuidados antes dos dreads** | Cliente que vai fazer uma **aplicação do zero** | **Logo depois da confirmação do agendamento**, seguido da **localização** (ver abaixo). |
| **Cuidados antes da manutenção** | Cliente que **vem fazer manutenção** | **No mesmo dia em que o cliente confirma a manutenção**, junto com a **localização**. |
| **Cuidados depois dos dreads** | Cliente que **acabou de ser atendido** | **Logo depois de finalizar a aplicação/atendimento**, com o **link de avaliação no Google**: https://g.page/r/CUFwpwTBzXTjEBM/review |
| **Manutenção** | Cliente que **fez os dreads do zero** e precisa saber quando fazer a próxima manutenção para ficar em dia e alinhado | **Junto com o card "Cuidados depois dos dreads"** (mesmo envio). |
| **Agendamento** (versão nova) | Cliente que pergunta como agendar, sobre sinal, cancelamento, atraso ou reagendamento | Quando perguntar, ou junto do agendamento. Só depois da aprovação do card novo (ver abaixo). |

### Como o agente sabe que o atendimento terminou

A **Thay marca a conversa como "finalizado"**. Esse é o sinal para o agente enviar o card "Cuidados depois dos dreads" (e o card "Manutenção", quando for dreads do zero) com o link de avaliação. Depois disso o agente não puxa mais assunto por conta própria. Se o cliente escrever de novo, o agente **não o trata como cliente novo**: já sabe o nome, tenta entender o que a pessoa quer, e se não souber responder, a Thay responde.

### Localização do estúdio

O agente pode enviar a localização **logo depois** do card "Cuidados antes dos dreads" ou "Cuidados antes da manutenção", porque o cliente precisa chegar com o cabelo preparado. Enviar:
- o **endereço por escrito**, avisando que **há estacionamento no local**;
- o **pin fixo do mapa** do WhatsApp, para direcionar o cliente.

Só depois de o agendamento estar confirmado. O endereço completo **não está escrito nesta pasta**: deve ser cadastrado na configuração do agente (texto da localização e pin).

### Frases de apoio

Junto de cada card, o agente manda uma frase curta, por exemplo: "Te mandei aqui o resumo dos cuidados para depois dos dreads 💛. Qualquer dúvida é só falar!"

Com o link de avaliação (mesmo tom do e-mail que o site envia): "Ficamos muito felizes por ter você com a gente! Se puder, deixe uma avaliação no Google contando como foi o seu atendimento: https://g.page/r/CUFwpwTBzXTjEBM/review 💛"

## Card "Agendamento": o que mudou

O card atual diz: **"SINAL NÃO REEMBOLSÁVEL — O valor do sinal não é reembolsável, pois garante a sua vaga..."**, sem citar a devolução com 2 dias ou mais, sem a exceção do sinal de 50% em dezembro/temporada e com regra de reagendamento incompleta.

A versão nova (`card-agendamento-novo.png`, editável em `materiais/fontes/card-agendamento-novo.html`) traz:
- Sinal de R$ 50, descontado do valor final, e 50% em novembro, dezembro e na temporada fora de SP.
- Cancelando com 2 dias ou mais: sinal devolvido. Em cima da hora: não reembolsável.
- Ausência sem aviso: sinal não devolvido nem reaproveitado.
- Reagendamento: avisando com até 2 dias, o sinal continua valendo; no segundo reagendamento, o cliente escolhe entre os horários livres da agenda; após o terceiro reagendamento, o sinal é perdido; com 1 dia ou no próprio dia, é preciso novo sinal.
- Tolerância de atraso: 15 minutos, taxa de R$ 20 a cada 15 minutos, cancelamento com 30 minutos.

Até a equipe aprovar a versão nova, o agente **não envia o card "Agendamento"** e responde por texto (frases em `03-sinal-e-cancelamento.md`).

## E-mails de confirmação e avaliação (decisão da equipe)

A equipe considera importante que:
- o **cliente** receba a confirmação do agendamento **no WhatsApp e também por e-mail**;
- a **equipe** receba a confirmação **no e-mail da Afro Dreads**, com os dados do cliente agendado e o serviço.

Situação do site: o e-mail de confirmação ia **só para o cliente**. A equipe pediu, com certeza, o aviso também no e-mail da Afro Dreads, e ele foi criado no sistema de agendamento (ver o PR correspondente).

**Pedido de avaliação:** a equipe quer **manter os dois**: o link enviado pelo WhatsApp depois de "finalizado" e o e-mail que o site envia 1 dia depois. O agente não precisa evitar a repetição.

## PENDENTE

- PENDENTE: aprovação da versão nova do card "Agendamento" pela equipe.
- PENDENTE: texto e pin da localização a cadastrar na configuração do agente (o endereço não fica nesta pasta).
- PENDENTE: confirmar em qual endereço a equipe recebe o aviso de novos agendamentos (o sistema usa afrodreadsofc@gmail.com por padrão).
