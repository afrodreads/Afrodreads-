# Base de conhecimento do agente de WhatsApp da Afro Dreads

Arquivos:
0. `00-prompt-do-agente.md` — **prompt de sistema completo do agente** (autossuficiente), com os campos a preencher na configuração.
1. `01-servicos-e-duracoes.md` — serviços, durações, requisito de comprimento, itens do orçamento, promoção vigente, manutenção.
2. `02-metodos.md` — métodos e materiais explicados de forma simples para quem não conhece.
3. `03-sinal-e-cancelamento.md` — passo a passo do agendamento, sinal, comprovante, pagamento e cancelamento.
4. `04-perguntas-frequentes.md` — respostas oficiais para as dúvidas mais comuns.
5. `05-quando-passar-para-humano.md` — roteiro da recepção, o que coletar, quando e como encaminhar para a Thay.
6. `06-tom-de-voz.md` — como o agente escreve.
7. `07-materiais-para-enviar.md` — os cards oficiais que o agente pode enviar como imagem (arquivos em `materiais/`).

## Regras de ouro

1. Responda **só** com o que está nesta pasta. Se não estiver aqui, não invente: encaminhe para a Thay.
2. **Nunca** informe preço de orçamento nem disponibilidade de agenda. O único valor que o agente pode citar é o da promoção vigente (até o fim de outubro). O endereço completo só é enviado **depois de o agendamento estar confirmado**, junto do card de cuidados (ver `07-materiais-para-enviar.md`); antes disso, só o bairro.
3. Itens marcados como **PENDENTE** ainda não foram confirmados pela equipe: trate como "não sei" e encaminhe.
4. **Devolução de sinal**: reembolsável cancelando com 2 dias ou mais de antecedência; em cima da hora e em ausência sem aviso, não. O card "Agendamento" atual está impreciso sobre isso: enviar só a versão nova, depois de aprovada (ver `07-materiais-para-enviar.md`).
5. Uma pergunta por mensagem, mensagens curtas.

## Dados de contato que o agente pode usar

- Bairro: Pirituba, zona noroeste de São Paulo. Há estacionamento no local. O endereço completo e o pin do mapa são enviados depois de o agendamento estar confirmado (cadastrados na configuração do agente; não ficam escritos nesta pasta).
- Estúdio: terça a sábado, das 10h às 18h, com hora marcada.
- Atendimento no WhatsApp: segunda a sexta das 10h às 21h, sábado das 10h às 15h; domingos e feriados fechado.
- Site: https://www.afrodreads.com.br
- Instagram e TikTok: @afrodreads_ — YouTube: @afrodreadsofc

## De onde vieram as informações

- **Cards oficiais enviados aos clientes** (Agendamento, Manutenção, Cuidados antes da manutenção, Cuidados depois dos dreads): fonte principal para regras de sinal, reagendamento, atraso, manutenção e cuidados.
- Site: `src/lib/services.ts`, `src/lib/faq.ts`, `src/lib/pricing.ts`, `src/lib/guides.ts`, `src/lib/serviceDetails.ts` e página `/como-agendar`.
- Conversas do WhatsApp Business (30/09/2026): roteiro da recepção automática e mensagens-padrão da Thay (materiais, regra dos 4 dedos, formas de pagamento, comprovante do sinal, promoção). Nenhum nome, telefone ou dado de cliente foi copiado para esta pasta.
- Vídeo de referência sobre agentes de WhatsApp (Enzo Barbatto): princípios de responder só com a base, qualificar antes de passar para humano e respeitar a janela de 24h da Meta.

Se uma regra mudar no site ou no atendimento, atualize também aqui.
