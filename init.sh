#!/usr/bin/env bash
# Inicializa a estrutura do sistema multi-agente (idempotente: pode rodar de novo
# sem apagar nada que já exista).
set -euo pipefail
cd "$(dirname "$0")"

command -v jq >/dev/null 2>&1 || echo "Aviso: 'jq' nao encontrado — validacao de JSON em run_agent.sh sera pulada."

mkdir -p agents/spec agents/dev agents/qa agents/security agents/implement
mkdir -p schemas work/archive scripts

[ -f feature_list.json ] || echo '{ "features": [] }' > feature_list.json

chmod +x scripts/run_agent.sh 2>/dev/null || true
chmod +x init.sh 2>/dev/null || true

echo "Estrutura do sistema multi-agente pronta."
echo "Proximo passo: descreva o requisito e peca para rodar a fase 'spec'."
