# Migração — afrodreads-site (Next.js + Prisma, Vercel)

Repo: https://github.com/afrodreads/Afrodreads-.git (branch atual `feat/faixa-clube`). Os diretórios `afrodreads-agent`, `afrodreads-site-pixel`, `-seo` e `-sobre` são **worktrees do mesmo repositório** (um branch cada). Depois de clonar: `git worktree add ../afrodreads-agent feat/agente-4b` (idem para os outros).

## Fora do Git (copiar à mão)
- `C:\dev\afrodreads-site\.env` (banco, Mercado Pago, admin)
- `C:\dev\afrodreads-site\.env.local` (só VERCEL_OIDC_TOKEN; refaz com `vercel env pull`)
- `C:\dev\afrodreads-site\prospeccao-adegas\` (leads, mensagens e `api-google/`; NÃO foi commitado de propósito, tem dados de terceiros)
- `C:\dev\afrodreads-site\.claude\` (skills, agents, launch.json, worktrees; ignorado)
- `C:\dev\afrodreads-site\.vercel\` (refazer com `vercel link`)
- Regeneráveis, não copiar: `node_modules`, `.next`

## Variáveis (só nomes)
DATABASE_URL, DIRECT_URL, MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_PUBLIC_KEY, MERCADOPAGO_WEBHOOK_SECRET, NEXT_PUBLIC_SITE_URL, ADMIN_PASSWORD, ADMIN_SESSION_SECRET, RESEND_API_KEY, EMAIL_FROM, TEAM_NOTIFICATION_EMAIL, CLUBE_GRUPOS, CRON_SECRET, INTEGRATION_DATABASE_URL, VERCEL_OIDC_TOKEN, NODE_ENV, TZ

## Versões e comandos
Node 24.19 / npm 11.17 neste PC. Git 2.55. Python 3.12.10 (`C:\Users\lyonf\lyon-py`, só para gerar imagens).
```
npm install
npx prisma generate
npm run dev        # next dev
npm test           # tsx --test
npm run build      # prisma migrate deploy && next build (precisa DATABASE_URL)
```
Deploy: Vercel (`vercel link`, `vercel env pull`).

## Refazer no PC novo
- `gh auth login` (conta afrodreads) e `vercel login`
- Webhook do Mercado Pago aponta para o domínio de produção (não muda com o PC)
- Cron (CRON_SECRET) roda no Vercel, fica na nuvem
