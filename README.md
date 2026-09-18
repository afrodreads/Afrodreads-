# Afro Dreads — Site + Agendamento + Checkout

Next.js (App Router) + Prisma/Postgres + Mercado Pago (Checkout Pro).

## Estrutura já criada

- `src/app` — páginas: home (`/`), portfólio (`/portfolio`), agendamento (`/agendamento`),
  checkout (`/checkout/[bookingId]`), retorno do pagamento (`/agendamento/[bookingId]/sucesso|pendente|erro`).
- `src/app/api` — `bookings`, `bookings/[id]/cancel`, `availability`, `mercadopago/create-preference`, `mercadopago/webhook`.
- `src/lib` — `services.ts` (catálogo e durações), `pricing.ts` (regra do sinal e cancelamento),
  `schedule.ts` (geração de horários disponíveis), `mercadopago.ts`, `prisma.ts`.
- `prisma/schema.prisma` — modelos `Service`, `Booking`, `Payment`, `BlockedDate`.
- `src/components` — layout, home (hero com vídeo, serviços), portfólio (slider antes/depois,
  simulador de cor) e o fluxo de agendamento em etapas.

## Regras de negócio já implementadas

- Durações por serviço em `src/lib/services.ts`.
- Sinal: R$50 fixo, exceto em dezembro ou atendimento por temporada fora de SP (50% do valor) —
  `calculateDeposit` em `src/lib/pricing.ts`.
- Cancelamento: 2+ dias devolve o sinal, 1 dia ou no mesmo dia não devolve —
  `isDepositRefundable` em `src/lib/pricing.ts`, usado em `api/bookings/[id]/cancel`.
- Pagamento via Mercado Pago Checkout Pro: Pix, boleto e cartão ficam disponíveis por padrão
  para uma Conta Negócio habilitada. O parcelamento não é limitado manualmente, então usa o
  máximo permitido pelo Mercado Pago, com juros repassados ao cliente (comportamento padrão
  quando não há campanha de "parcelamento sem juros" configurada na conta).

## Rodando localmente

1. Instale o **Node.js LTS** (não detectado nesta máquina — baixe em nodejs.org ou instale
   com `winget install OpenJS.NodeJS.LTS`).
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Copie `.env.example` para `.env` e preencha:
   - `DATABASE_URL`: string de conexão Postgres (Vercel Postgres/Neon, Supabase, etc.)
   - `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_PUBLIC_KEY`: da Conta Negócio (use as credenciais
     de teste primeiro, em Suas integrações > Credenciais no painel do Mercado Pago)
   - `MERCADOPAGO_WEBHOOK_SECRET`: chave secreta da assinatura do webhook (mesma tela de credenciais)
4. Crie as tabelas e popule os serviços:
   ```bash
   npx prisma migrate dev --name init
   npm run seed
   ```
5. Rode o projeto:
   ```bash
   npm run dev
   ```

## Assets pendentes (adicionar em `public/`)

- `public/videos/hero.mp4` — vídeo de fundo do hero
- `public/images/hero-poster.jpg` — poster/fallback do vídeo
- `public/images/portfolio/*.jpg` — pares antes/depois usados no portfólio

## Deploy (Vercel)

1. Suba o repositório no GitHub e importe no Vercel.
2. Configure as mesmas variáveis de ambiente do `.env` no painel do projeto (Production e Preview).
3. Configure a `NEXT_PUBLIC_SITE_URL` com o domínio real (necessário para `back_urls` e `notification_url`
   do Mercado Pago funcionarem).
4. No painel do Mercado Pago, configure a URL de webhook para
   `https://SEU_DOMINIO/api/mercadopago/webhook`.
5. Use um Postgres gerenciado (Vercel Postgres/Neon) e rode `npx prisma migrate deploy` no build
   ou antes do primeiro deploy.

## Próximos passos sugeridos

- Painel administrativo (login) para gerenciar preços por serviço, bloquear datas e ver a agenda.
- Definir preços por serviço (hoje o valor é combinado manualmente e informado no agendamento).
- Envio de e-mail/WhatsApp de confirmação após o pagamento do sinal.
- Endpoint de estorno automático (Refunds API do Mercado Pago) quando o cancelamento é elegível.
- Testes automatizados para `calculateDeposit` e `isDepositRefundable`.
- Trocar as imagens/vídeo de placeholder pelos assets reais da Afro Dreads.
