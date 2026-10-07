# Camada comercial do agente — auditoria, conflitos e proposta (06/10/2026)

Etapas 1 a 3 do pedido "Implementação — camada comercial avançada". Nada foi alterado no
agente por causa deste documento. A implementação (etapa 4) espera as decisões da seção 4.

## 1. Auditoria — o que já existe

| Área | Onde está | Situação |
|---|---|---|
| Prompt (especificação) | `agente/00-prompt-do-agente-v2.md` (27 seções) | Ativo. Dividido em camadas por `src/lib/agent/spec.ts` (persona, conhecimento, regras, fluxo, guardrails, código). Seção nova precisa entrar em `V2_LAYERS`. |
| Inteligência comercial atual | V2 §1 (missão), §5 (conversa natural), §6 (intenção + temperatura), §7 (objetivo do projeto), §13 (estados A–G), §14 (regra de condução), §23 (regras de conversão), §26 (checklist) | Já é consultiva: responde antes de perguntar, uma pergunta por vez, sem pressão, conversão como consequência. Falta: objeções, valor/benefício, prova social, fechamento explícito, estágio do funil, follow-up. |
| Base de conhecimento | `agente/01`–`07` (só local, fora do git) | **Não chega ao modelo** (só o V2 vai). Já registrado na auditoria de 05/10. |
| Ferramentas do modelo | `src/lib/agent/tools.ts` | Só propõem: `request_handoff` e `update_lead_data` (intent, temperature, thickness etc.). Não há ferramenta de preço, agenda ou pagamento, de propósito. |
| Travas em código | `src/lib/agent/guardrails.ts` | Bloqueiam preço não autorizado (inclusive por extenso), desconto, %, promoção vencida, "tem vaga/horário", "agendado/confirmado", pagamento, endereço, links fora da lista, vazamento interno, promessa de resultado, texto longo, resposta repetida. |
| Estado da conversa | `src/lib/conversations/` (BOT → HUMAN → FINISHED) | Handoff deixa a IA em silêncio (V2 §17, garantido no código). |
| Memória | Histórico da conversa vai inteiro ao modelo (`context.ts`); dados do lead via `update_lead_data` | Funciona; regra "nunca pergunte de novo" já existe (§5.3). |
| WhatsApp/ManyChat | `src/app/api/agent/inbound` + fluxo "Agente - roteador" | Só contatos de teste recebem resposta. O servidor nunca envia mensagem por conta própria (só responde ao ManyChat em até 10 s). |
| Agendamento | Site: `/api/availability`, `/api/bookings`, sinal via Mercado Pago, `conversations/bookingLink.ts`; orçamento da Thay: `/api/admin/quotes` + `/api/quotes/[token]` | O agente não acessa agenda nem orçamento. Estado F manda encaminhar para a Thay. |
| Prova social real | `src/lib/testimonials.ts` (Google 5,0 ⭐, 56 avaliações, depoimentos reais); página Sobre (Thay com 14 anos de experiência, marca com 10 anos, nascida em São Luís) | Existe no site, **não está** na base do agente. |
| Testes | 36 arquivos, 561 testes passando | Modelo falso (roteirizado): testam código e travas, não o "jeito" do modelo. |

## 2. Mapa de conflitos — regras atuais × nova camada

| # | Nova camada pede | Regra atual | Impacto |
|---|---|---|---|
| C1 | §7: apresentar preço claro, "não esconder preço", "fica em R$ X e inclui…" | V2 §9 + base 01/05: **não existe tabela**; a Thay passa o valor depois de ver foto e referência; o agente nunca dá valor nem faixa. Trava `unauthorized_price` bloqueia qualquer R$ fora da promoção. | Alto. Mudar exige tabela oficial e afrouxar a trava. |
| C2 | §9/§10: "posso verificar os horários?", apresentar horários, concluir agendamento; escassez real ("tenho dois horários") | Estado F: não prometer disponibilidade, encaminhar na hora. Travas `availability_claim` e `booking_claim`. O agente não lê a agenda. | Alto. Sem ferramenta de agenda, o agente não tem como saber horário real. |
| C3 | §11: follow-up de lead que sumiu | O servidor nunca envia mensagem sozinho; fora da janela de 24 h o WhatsApp exige modelo pago aprovado pela Meta. | Alto (infraestrutura nova). |
| C4 | §5: prova social (avaliações, número de clientes) | Não está na base do agente (está no site). | Baixo, com sua autorização. |
| C5 | §3: vender valor ("o que está incluso", consultoria, acompanhamento) | A base não diz o que está incluso no serviço. O site diz: avaliação individual por foto, explicação de cada método, valor combinado, hora marcada. | Médio: só posso usar o que está confirmado. |
| C6 | Exemplos com ❤️ e "Claro! ❤️" | V2 §4: no máximo 1 emoji, de preferência 💛; trava de estilo. | Baixo: mantenho 💛 (identidade). |
| C7 | §17: estágios CURIOSIDADE … INATIVO | Já existem `intent` (9 valores) e `temperature` (quente/morno/frio). | Baixo: estágio entra como campo novo, opcional. |
| C8 | §8: "pediu desconto" | Igual à regra atual (nunca oferecer). | Nenhum. |
| C9 | §15: critérios de escalada | V2 §14 já lista quase todos. Faltam: conflito entre informações e "situação excepcional". | Nenhum (só complemento). |

## 3. Proposta

**Arquitetura (modular e separável):**
- Novo arquivo `agente/08-camada-comercial.md`, com os princípios em linguagem de atendimento (diagnóstico, SPIN adaptado, valor, personalização, persuasão ética, objeções, fechamento, micro-compromissos, ritmo da conversa). Sem citar livros.
- Carregado depois do V2, na parte fixa (cacheada) do prompt, como camada `commercial` em `spec.ts`. Interruptor `AGENT_COMMERCIAL_LAYER=off` para desligar sem mexer no resto.
- Regra de precedência escrita no topo da camada: **as regras do V2 (§2 a §3, preço, agenda, handoff) vencem sempre**. A camada muda o *como falar*, não *o que pode ser dito*.
- `update_lead_data` ganha o campo opcional `stage` (estágio do funil). Aditivo, não quebra nada.
- Travas novas (bloqueio): escassez e urgência inventadas ("últimas vagas", "alta procura", "agenda lotada", "promoção acabando", "só hoje").

**Arquivos que mudam:** `agente/08-camada-comercial.md` (novo), `src/lib/agent/spec.ts`/`prompt.ts` (carregar a camada), `src/lib/agent/tools.ts` (`stage`), `src/lib/agent/guardrails.ts` (escassez), testes correspondentes, e V2 §14 (2 critérios de escalada).

**Não mudam:** regras de preço, sinal, cancelamento, promoção, handoff, roteiro do cliente novo, regras de foto/espessura, travas existentes, integração ManyChat.

**Riscos:** respostas mais longas (a camada pede mais valor; a trava de tamanho segura); tom "vendedor" se mal calibrado; prompt maior → um pouco mais de custo e tempo (a parte fixa é cacheada).

**Testes:**
1. Automáticos, com modelo falso: prompt contém a camada; ela pode ser desligada; travas bloqueiam escassez inventada, preço e agenda nos 20 cenários.
2. Avaliação com o Claude de verdade (os 20 cenários pedidos), rodada no Preview, com as respostas num relatório para você aprovar. Custo estimado: menos de US$ 1. **Só isso mede o comportamento**; teste com modelo falso não mede o jeito de falar.

## 4. Decisões do dono (06/10/2026) e como ficaram

1. **Preço (C1):** manter. A Thay passa o valor. Nada muda nas regras de preço.
2. **Fechamento e agenda (C2):** o agente conduz até a decisão e passa para a Thay com o resumo "pronto para agendar". Não oferece horário.
3. **Prova social (C4):** não usar. Fica proibido citar avaliações, número de clientes e depoimentos.
4. **Follow-up (C3):** só dentro de 24 h, um único lembrete. **Ainda não construído**: depende de o servidor enviar mensagem pela API do ManyChat (precisa de uma chave de API, a mesma que resolve o limite de 10 s). O texto do lembrete já está previsto na seção 28.6/20 dos testes.

## 5. O que foi implementado

- `agente/08-camada-comercial.md` (seção 28): diagnóstico, SPIN adaptado, valor, personalização, persuasão ética, preço sem parecer evasivo, objeções, fechamento, estágio do cliente, escalada, linguagem.
- `src/lib/agent/spec.ts`: camada `commercial`. `promptSourceFs.ts`/`agent-db`/rota: carregam V2 + camada. `AGENT_COMMERCIAL_LAYER=off` desliga.
- `tools.ts`: `stage` (10 estágios) em `update_lead_data`.
- `guardrails.ts`: trava `invented_scarcity` (últimas vagas, agenda lotada, alta procura, só hoje, promoção acabando, corre que...).
- Testes: `commercial.test.ts` (20 cenários, rascunho vendedor demais é barrado e o consultivo passa) e `spec.test.ts`.
- `scripts/eval-camada-comercial.ts`: roda os 20 cenários no Claude de verdade e gera `docs/eval-camada-comercial-AAAA-MM-DD.md`. **Ainda não executado** (precisa da chave da Anthropic no terminal).
