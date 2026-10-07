# Documento 08 — Equipe, Sociedade e Pagamentos

| Campo | Valor |
|-------|-------|
| Status | Rascunho para validação com contador e advogado |
| Fase | Pré-MVP / Validação |
| Capital disponível | R$ 1.700 |
| Prazo do MVP | Novembro |
| Primeiro caso real | Show de comédia de março (ver Anexo A) |

> As recomendações jurídicas e tributárias deste documento são um ponto de partida. Percentuais,
> CNAE, regime tributário e cláusulas devem ser confirmados com contador e advogado antes de assinar.

## 1. Equipe fundadora

A formação é o trio clássico de startup: **negócio, produto e vendas**.

| Pessoa | Cargo | Responsável por | Meta até novembro |
|--------|-------|-----------------|-------------------|
| Fundador | CEO / dono / chefe geral | Visão, decisões finais, marca, financeiro, parcerias, primeiro cliente (show de março) | CNPJ aberto, gateway aprovado, show de março dentro da plataforma |
| Programador experiente | CTO / sócio técnico | Construir e manter a plataforma, pagamentos com split, segurança | MVP no ar: venda, ingresso com QR, check-in, painel do produtor |
| Parceiro comercial | Head comercial | Trazer produtoras, casas de show e produtores; apresentar a plataforma; fechar parcerias | 10 produtores comprometidos a usar a plataforma |

### Apoio externo (pontual, sem sociedade)

| Papel | Quem | Custo estimado |
|-------|------|----------------|
| Desenvolvimento assistido | Claude Code, junto com o CTO | — |
| Design (marca e telas) | Freelancer pontual | R$ 500–800 |
| Abertura do CNPJ, CNAE e regime | Contabilidade online | R$ 150–300 |
| Termos de uso e política de privacidade | Modelo revisado por advogado, ou parceria | R$ 0–500 |
| Domínio e hospedagem | Registro.br + planos gratuitos (Vercel, banco de dados) | ~R$ 40 |

Opcional: um parceiro de divulgação da cena de comédia, com pequena participação, para trazer os
primeiros produtores.

## 2. Divisão da sociedade (sugestão)

O fundador fica com **mais de 50%** para manter o comando. Com mais de 75%, aprova sozinho as
decisões mais importantes na sociedade limitada (confirmar o percentual exato com o advogado).

| Sócio | Participação | Justificativa |
|-------|--------------|---------------|
| Fundador (CEO) | **60–65%** | Ideia, liderança, capital inicial, primeiro cliente |
| Programador (CTO) | **20–25%** | Constrói o principal ativo da empresa sem receber salário |
| Comercial | **5–10% + comissão** | A participação o mantém na empresa a longo prazo; a comissão paga o resultado de agora |
| Reserva (futuros talentos/investidor) | **~5–10%** | Fica com o fundador até ser usada |

**Comissão do comercial:** 20–30% da receita da plataforma gerada pelos produtores que ele trouxer,
durante os primeiros 12 meses de cada cliente. A empresa só paga quando entra dinheiro.

## 3. Acordo de sócios — cláusulas essenciais

Assinar **antes** do início do desenvolvimento. Até o CNPJ ficar pronto, um memorando de
entendimento assinado pelos três registra os combinados.

1. **Vesting:** participação liberada aos poucos (ex.: 4 anos), com **cliff de 1 ano**.
2. **Propriedade intelectual:** todo código, marca e material criado pertence à **empresa**.
3. **Saída de sócio (good/bad leaver):** quanto cada um leva ao sair por vontade própria, por justa
   causa etc.
4. **Não concorrência e confidencialidade:** proteção da carteira de produtores e do código.
5. **Tag along / drag along:** regras para uma venda futura da empresa.
6. **Pró-labore zero** até uma meta de receita mensal combinada.

### Critérios de escolha

- **Programador:** projetos já publicados, de preferência com pagamentos; teste de 2–3 semanas antes
  de formalizar a sociedade.
- **Comercial:** rede de contatos no meio de comédia e eventos e histórico de fechamento; meta de 3
  produtores em 30 dias antes de virar sócio.

## 4. Pagamentos e Pix direto para o produtor

### Modelos avaliados

| Modelo | Como funciona | Avaliação |
|--------|---------------|-----------|
| A. Chave Pix do produtor colada no evento | Comprador paga na chave do produtor, envia comprovante e o produtor libera o ingresso | Sem confirmação automática, risco de comprovante falso, sem controle de reembolso, sem receita para a plataforma |
| **B. Split automático** ✅ | Um único Pix; o gateway (Asaas, Pagar.me, Mercado Pago, Stripe) divide na hora: a parte do produtor vai direto para a subconta dele e só a taxa da plataforma cai na conta da empresa | Recomendado. Ingresso emitido automaticamente via webhook |
| C. Pix próprio do produtor + mensalidade | Como o A, com plano fixo pago pelo produtor | Mesmos problemas do A; possível plano gratuito no futuro |

### Modelo de receita recomendado (split)

1. **Padrão:** comprador paga **taxa de 10%** (cartão ou Pix), exibida em destaque antes da compra.
2. **"Ingresso sem taxa":** comprador paga só o preço do ingresso via Pix; o **produtor paga taxa
   menor (~4–5%)**, descontada no split. Compete diretamente com a venda "sem taxa" pelo WhatsApp,
   oferecendo ingresso automático, check-in e relatório.

Custo do Pix nos gateways: em geral entre 0,5% e 1%.

### Tributação e regulação

- Em serviços de arrecadação e repasse de valores de terceiros, a receita bruta da empresa é a
  **remuneração pelo serviço** (a taxa da plataforma), não o valor total dos ingressos.
- O split separa os valores automaticamente, deixa tudo comprovado e evita que a empresa guarde
  dinheiro de terceiros (o que poderia exigir autorização do Banco Central como instituição de
  pagamento).
- Regras práticas:
  - nunca receber dinheiro de ingresso na conta pessoal (CPF);
  - declarar a taxa da plataforma normalmente como receita da empresa;
  - deixar nos termos de uso que a plataforma é **intermediadora** e que o vendedor é o produtor.

### Taxa de conveniência

O STJ já considerou a taxa ilegal, mas decisão mais recente da Terceira Turma permite a cobrança
**desde que o preço total, com a taxa em destaque, seja informado antes da compra**. Há projetos de
lei para limitar a taxa, então a plataforma deve mostrar o preço final desde a primeira tela.

## 5. Escopo e prazo do MVP (até novembro)

**Entra:** página do evento, compra (Pix com split + cartão), ingresso com QR Code por
e-mail/WhatsApp, check-in pelo celular, painel simples do produtor.

**Fica para depois:** IA, CRM, aplicativo nativo.

**Caminho crítico:** abrir o CNPJ imediatamente. O gateway só aprova conta de empresa e a aprovação
pode levar dias. MEI provavelmente não atende intermediação — confirmar com o contador.

## Anexo A — Caso real: show de comédia de março

Dados da planilha de bilheteria (divisão 50/50 entre artistas e produção):

| Item | Valor |
|------|-------|
| Ingressos (500 no 1º lote + 204 no 2º) | 704 |
| Bilheteria bruta (GMV) | R$ 30.180,00 |
| (−) Custos de borderô | R$ 4.218,00 |
| Receita líquida | R$ 25.962,00 |
| Artistas, 50% (8 humoristas, R$ 1.622,63 cada) | R$ 12.981,00 |
| Produção, 50% | R$ 12.981,00 |
| (−) Custos de produção | R$ 2.950,00 |
| Valor líquido da produção | R$ 10.031,00 |
| Parte de cada produtora (3) | R$ 3.343,67 |

Ganho do fundador como produtor + dono da plataforma (custo de pagamento estimado em ~3,5%):

| Taxa de conveniência | Parte de produtor | Lucro da plataforma | Total |
|----------------------|-------------------|---------------------|-------|
| 7% | R$ 3.343,67 | R$ 982,36 | R$ 4.326,03 |
| **10%** | **R$ 3.343,67** | **R$ 1.856,07** | **R$ 5.199,74** |
| 12% | R$ 3.343,67 | R$ 2.438,54 | R$ 5.782,21 |

Com vendas majoritariamente por Pix (~1% de custo), o total com taxa de 10% sobe para ~R$ 6.030.

## Fontes

- [Asaas — qual API oferece split de pagamentos](https://blog.asaas.com/qual-api-oferece-split-de-pagamentos/)
- [Asaas — FAQ do split](https://docs.asaas.com/docs/faq-do-split)
- [Transfeera — split de pagamento](https://transfeera.com/blog/split-de-pagamento-transfeera/)
- [Tributo Devido — receita bruta em operações de marketplace](https://tributodevido.com.br/portal/composicao-da-receita-bruta-em-operacoes-de-marketplace/)
- [Receita Federal — critérios de receita bruta no Simples](https://amdjus.com.br/?p=33963)
- [Contabilidade.com — tributação de marketplace](https://contabilidade.com/blog/marketplace-paga-imposto-entenda-como-funciona-a-tributacao/)
- [Tecnoblog — STJ e taxa de conveniência](https://tecnoblog.net/noticias/taxa-conveniencia-ingressos-online-ilegal-stj/)
- [Sedep — STJ: taxa de conveniência é legal com informação prévia](https://www.sedep.com.br/?p=147134)
- [Nuvemshop — quanto a PJ paga para usar Pix em 2026](https://www.nuvemshop.com.br/blog/pix-pessoa-juridica/)
