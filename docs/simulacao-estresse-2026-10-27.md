# Simulação de estresse do agente — 27/10/2026

Método: 21 cenários simulados com o mesmo modelo de produção (Claude Sonnet 5.5) lendo o prompt real (v2 + camada comercial) e os dados do sistema (com e sem meses abertos). Cada resposta foi lida na conversa completa. NÃO passou pelo código (guardrails, ferramentas, formatação WhatsApp, agrupamento) e é uma amostra por cenário.

## Resultado
- Rodada 1: falhas em tom e vícios (ecoar a foto, elogio genérico, "anotado", preço sem investigar, re-perguntar o que já foi dito).
- Correções: nova seção 28.12 (vícios a evitar), regras de negócio (micro própria vs agulhado, meses abertos pelo sistema, sem pintura/cor para cabelo próprio), remoção de todas as instruções "anote" (agora "registre no resumo, sem comentar"), pergunta de abertura sim/não ("Hoje você já está com dreads?").
- Reteste: 6, 17, 16, 18, 19, 19b, 2, 3, 10 OK; 4 e 14 melhoraram.

## Antes / depois
- Preço (6): "o de 1.500 era sintético, humano…?" → "Você tinha pensado em investir mais ou menos quanto?"
- Cenário 19: "…anotado." → "Com 10 cm e o próprio cabelo já dá pra trabalhar bem, me manda uma foto de como ele está hoje?"
- Cenário 4 ("Sim"): "Só pra eu não errar, você já tem dreads ou vai começar do zero?" → "Hoje você já está com dreads?" e, ao "Sim", segue ("Então você quer fazer a manutenção deles?").
- Cenário 14: sumiu o "Anotado, Helena…".

## Pontos que ainda merecem atenção
1. Cenário 4: ao "Sim" a atendente assume "manutenção" (suposição razoável, mas é suposição).
2. Cenário 14: pergunta "só seu cabelo ou micro agulhado?" duas vezes seguidas com palavras diferentes (a cliente já tinha dito "até o ombro").
3. Cenário 10: cita a Thay antes da passagem ("a Thay passa o valor e os horários…"), contra a regra 28.12; baixo risco.
4. Meses: quando informados, apresenta "novembro e dezembro" sem perguntar o mês; sem meses, não fala de agenda (OK).

## Limitações
Simulação por subagentes (sem pipeline real, sem imagens reais, uma amostra por cenário, cenário 4 turno 3 só parcial). Confirmação final ideal: rodar `scripts/estresse-agente.ts` com chave própria do usuário.

## Recomendação
Pronto para publicar como piloto controlado (gate de leads), com monitoramento das primeiras conversas, desde que o usuário aprove. Nada foi publicado; `AGENT_OPEN_MONTHS` NÃO foi definido na Vercel (será `novembro,dezembro` só após aprovação).
