<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Sistema Multi-Agente de Desenvolvimento

Este projeto usa um fluxo de 5 fases (Spec → Dev → QA → Security → Implement) para
features não triviais. Cada fase produz um JSON estruturado em `work/`, que serve de
entrada para a fase seguinte. Veja `agents/<fase>/<fase>_agent.md` para o papel de
cada fase e `schemas/<fase>_schema.json` para o formato exato da saída.

Fluxo: `Usuário → Spec → Dev → QA → Security → Implement → Deploy`, com loops de
feedback (QA → Dev se testes falharem; Security → QA/Dev se achar vulnerabilidade).

Quando o usuário pedir para seguir esse fluxo numa tarefa, produza o JSON de cada
fase no arquivo correspondente em `work/`, seguindo o schema, antes de passar para a
próxima fase — não pule fases. Arquivos anteriores de uma mesma feature vão para
`work/archive/` antes de começar uma rodada nova.
