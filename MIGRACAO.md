# Migração — afrodreads-agent (worktree do repo afrodreads-site)

Mesmo repositório `afrodreads/Afrodreads-`, branch `feat/agente-4b`. Lista completa em `afrodreads-site/MIGRACAO.md`. Aqui só o que é deste diretório:

- Fora do Git: `C:\dev\afrodreads-agent\.env.local` (VERCEL_OIDC_TOKEN) e `C:\dev\afrodreads-agent\.vercel\`
- Variáveis (nomes): DATABASE_URL, DIRECT_URL, MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_PUBLIC_KEY, MERCADOPAGO_WEBHOOK_SECRET, NEXT_PUBLIC_SITE_URL, ADMIN_PASSWORD, ADMIN_SESSION_SECRET, RESEND_API_KEY, EMAIL_FROM, TEAM_NOTIFICATION_EMAIL
- Comandos: `npm install && npx prisma generate && npm run dev`
