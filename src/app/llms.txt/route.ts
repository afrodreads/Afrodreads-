import { FAQ_ITEMS } from "@/lib/faq";
import { GUIDES } from "@/lib/guides";
import { SERVICES } from "@/lib/services";

import { CANONICAL_URL as SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

// /llms.txt: resumo do negocio em texto simples para IAs (ChatGPT, Claude,
// Gemini, Perplexity). A lista de servicos vem de SERVICES, entao um servico
// novo aparece aqui automaticamente.
export function GET() {
  const services = SERVICES.map(
    (s) => `- [${s.name}](${SITE_URL}/servicos/${s.slug}) (${s.minHours}h a ${s.maxHours}h): ${s.description}`,
  ).join("\n");

  const guides = GUIDES.map((g) => `- [${g.h1}](${SITE_URL}/guias/${g.slug}): ${g.description}`).join("\n");
  const faq = FAQ_ITEMS.map((f) => `### ${f.question}\n${f.answer}`).join("\n\n");

  const body = `# Afro Dreads

> Estúdio especializado em dreadlocks e microlocs em Pirituba, São Paulo - SP. Faz formação (primeira aplicação), manutenção, revitalização, microlocs, penteados e outros serviços para dreads, com atendimento com hora marcada.

- História: a Afro Dreads nasceu em São Luís, no Maranhão, a partir da paixão da Thay por dreads, e hoje atende em São Paulo, com o Lyon. Os dreads são tratados como identidade e conexão com a cultura afro-brasileira.
- Localização: Pirituba, zona noroeste de São Paulo - SP, Brasil. O endereço completo é enviado após a confirmação do agendamento.
- Atendimento: terça a sábado, das 10h às 18h, com hora marcada.
- Telefone e WhatsApp: +55 11 91538-8113
- Instagram: https://instagram.com/afrodreads_
- TikTok: https://tiktok.com/@afrodreads_
- YouTube: https://youtube.com/@afrodreadsofc
- Valores: dependem do projeto (comprimento, quantidade, espessura, material, cor e tipo de procedimento) e são combinados pelo WhatsApp. O horário é reservado com um sinal.
- Avaliação no Google: 5,0 (56 avaliações).

## Páginas principais

- [Início](${SITE_URL}/): apresentação do estúdio, serviços em destaque, antes e depois e avaliações.
- [Serviços](${SITE_URL}/servicos): todos os serviços com descrição, duração, regras de sinal e cancelamento e perguntas frequentes.
- [Portfólio](${SITE_URL}/portfolio): fotos e vídeos de trabalhos reais, separados por serviço, e comparações de antes e depois.
- [Sobre](${SITE_URL}/sobre): quem conduz o estúdio (Lyon e Thay), como funciona a avaliação e o atendimento, o que fazemos e o que não fazemos.
- [Como agendar](${SITE_URL}/como-agendar): passo a passo do orçamento pelo WhatsApp, sinal, formas de pagamento e regras de cancelamento.
- [Contato](${SITE_URL}/contato): WhatsApp, Instagram e formulário para montar o projeto de dreads.

## Serviços

${services}

## Guias

${guides}

## Perguntas frequentes

${faq}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
