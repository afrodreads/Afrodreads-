# Fase 9 — SEO Local (Agente 9)

A fase se aplica: o negócio atende presencialmente em Pirituba, SP.
Base: `01-business.md`, `04-competitors.md`, `05-keywords.md`, `06-serp.md`, `07-geo.md`.
Legenda: **FATO VERIFICADO** · **INFORMADO PELO CLIENTE** · **INFERÊNCIA** · **RECOMENDAÇÃO**.

## 1. Situação atual

| Item | Estado | Tag |
|---|---|---|
| Área de atuação | Pirituba, zona noroeste de São Paulo. Endereço completo só é enviado após a confirmação do agendamento | INFORMADO PELO CLIENTE |
| Google Business Profile | Existe, com avaliações reais (link fornecido pelo dono). Nota exibida no site: 5,0 · 56 avaliações | INFORMADO PELO CLIENTE; número no código = FATO VERIFICADO |
| Conteúdo local no site | Só "Pirituba, São Paulo" em título/descrição/schema/contato. Nenhum texto sobre o bairro, transporte ou região | FATO VERIFICADO (`03-inventory.md`) |
| Schema local | `HairSalon` com `addressLocality`, `areaServed: São Paulo, SP`, horário. Sem `geo`, sem endereço de rua (**correto**, por decisão do dono) | FATO VERIFICADO |
| Diretórios / citações | A marca **não foi encontrada** no Fresha, GetNinjas nem dread.com.br | INFERÊNCIA (buscas em `04` e `07`) |
| Concorrência local | Fresha (páginas programáticas por bairro, incluindo Pirituba), Catia Dreads (via Fresha), Agulheria Dread SP (só redes sociais), Estúdio Baroni (Cerqueira César, com endereço público e preços públicos) | FATO VERIFICADO (`04-competitors.md`, `05-keywords.md`) |
| Hiperlocal "dreads em Pirituba" | Nenhum site próprio otimizado aparece; a SERP mostra Fresha e perfis de redes sociais | FATO VERIFICADO (`05-keywords.md`) |

## 2. Termos locais que valem (e os que não valem)

Volume **NÃO VERIFICADO** para todos; a evidência é a SERP.

| Termo | Prioridade | Ação |
|---|---|---|
| dreads em pirituba / dreadlocks pirituba | MÁXIMA | Título/H1/descrição da home e `/servicos`, seção "Onde estamos", GBP |
| dreads zona norte sp / zona noroeste | ALTA | Mencionar "zona noroeste de São Paulo" no texto; sem página própria |
| fazer dreads sp / dreadlocks são paulo | ALTA | Home + `/servicos` com "São Paulo" em contexto natural |
| agendar dreads pirituba | ALTA | Página de contato e CTA; `/como-agendar` (ver Fase 11) |
| manutenção de dreads sp / retwist sp | ALTA | Página do serviço Retwist |
| dreads perto de mim | Via GBP | **Não** criar página; depende de Google Business Profile, reviews e NAP |
| melhor dreadlocker são paulo | Via reputação | **Não** criar "lista de melhores" da própria empresa; ganhar menções externas |

## 3. O que NÃO fazer

- **Sem páginas por bairro** ("dreads na Freguesia do Ó", "dreads em Perus" etc.): conteúdo replicado é exatamente o modelo do Fresha, e o SKILL proíbe location pages sem valor local único. Só vale uma página de bairro se houver conteúdo real (ex.: "Como chegar a Pirituba de metrô/CPTM/ônibus vindo de X") — e isso cabe dentro da página Contato/Onde estamos, não em páginas separadas.
- **Sem publicar o endereço completo** nem usar endereço falso no schema. A abordagem correta é de área de serviço (`areaServed`) e bairro/cidade.
- **Sem tratar São Luís do Maranhão como página SEO** até haver calendário e volume de atendimento sazonal. Se o dono quiser, uma seção "Temporadas" na página Sobre/Contato, com datas reais, é suficiente.

## 4. Recomendações (RECOMENDAÇÃO)

1. **Google Business Profile** (o ativo local mais forte, e que o dono já tem):
   - Conferir categoria principal e secundárias, serviços listados (os 9 do site), descrição com "Pirituba", horário **idêntico** ao do site (terça a sábado, 10h–18h segundo o código), fotos reais recentes, link para `/servicos` e para o agendamento.
   - Responder todas as avaliações; pedir avaliação após cada atendimento, com mais detalhe (serviço feito, experiência).
   - Postar novidades/antes-e-depois periodicamente.
2. **Seção "Onde estamos" no site** (home e `/contato`): bairro, zona noroeste, estações/linhas de transporte que atendem Pirituba, tempo aproximado de deslocamento a partir de pontos conhecidos. *Depende do dono:* confirmar as rotas que os clientes usam de fato, para não inventar.
3. **NAP consistente**: nome "Afro Dreads", telefone e horário iguais no site, JSON-LD, llms.txt, GBP, Instagram, TikTok, YouTube.
4. **Citações e diretórios**: cadastrar no Fresha (que domina "dreadlocks perto de mim" com páginas de Pirituba), GetNinjas e pedir inclusão no dread.com.br. São fontes que hoje aparecem nas respostas de IA para intenção local.
5. **Conteúdo com sabor local genuíno** (base para GEO): FAQ "Vale a pena vir de outra região de SP? Como é a sessão de 8–12 h?", "Como chegar", "O que levar para sessões longas". Isso responde diretamente à objeção de deslocamento relatada pelo dono.
6. **Título e H1**: hoje o title da home já traz "em Pirituba, SP" (**FATO VERIFICADO**); manter e replicar o padrão em todas as páginas de serviço.
7. **Reviews no schema**: só marcar avaliações se puderem ser mantidas atualizadas e se seguirem as regras do Google para review snippets (avaliações sobre a própria empresa no próprio site podem não gerar rich result). Ver Fase 15.

## 5. Medição

Search Console (início da coleta em 26/09/2026): consultas contendo "pirituba", "zona norte", "sp"; Google Business Profile Insights: buscas, visualizações, ligações, cliques em "como chegar"; contagem de cliques no WhatsApp. **Sem baselines inventados** — todos começam da data acima.
