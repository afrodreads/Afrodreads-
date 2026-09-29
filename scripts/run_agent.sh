#!/usr/bin/env bash
# Ajuda a rodar uma fase do pipeline multi-agente: confere se a entrada esperada
# existe, valida o JSON de saida contra o schema (se 'jq' estiver disponivel) e
# mostra onde esta o arquivo de configuracao da fase.
#
# Este script nao chama nenhuma API sozinho — quem executa cada fase e o agente
# de codigo (Claude Code) lendo agents/<fase>/<fase>_agent.md e escrevendo
# work/<fase>_output.json. Uso: ./scripts/run_agent.sh <spec|dev|qa|security|implement>
set -euo pipefail
cd "$(dirname "$0")/.."

PHASE="${1:-}"
case "$PHASE" in
  spec)       REQUIRES=() ;;
  dev)        REQUIRES=("work/spec_output.json") ;;
  qa)         REQUIRES=("work/dev_output.json") ;;
  security)   REQUIRES=("work/qa_output.json") ;;
  implement)  REQUIRES=("work/spec_output.json" "work/dev_output.json" "work/qa_output.json" "work/security_output.json") ;;
  *)
    echo "Uso: $0 <spec|dev|qa|security|implement>" >&2
    exit 1
    ;;
esac

for f in "${REQUIRES[@]:-}"; do
  [ -z "$f" ] && continue
  if [ ! -f "$f" ]; then
    echo "Faltando $f — rode a fase anterior primeiro." >&2
    exit 1
  fi
  if command -v jq >/dev/null 2>&1 && ! jq empty "$f" >/dev/null 2>&1; then
    echo "$f existe mas nao e um JSON valido." >&2
    exit 1
  fi
done

echo "Fase: $PHASE"
echo "Config do papel: agents/$PHASE/${PHASE}_agent.md"
echo "Schema de saida: schemas/${PHASE}_schema.json"
echo "Escreva a saida em: work/${PHASE}_output.json"
