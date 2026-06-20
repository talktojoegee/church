#!/usr/bin/env bash
# Hostinger hPanel → Install command
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f src/shared/index.ts ]]; then
  echo "ERROR: web/src/shared is missing on the server."
  echo "  In hPanel → Git → Root directory must be: web"
  exit 1
fi

export TMPDIR="${TMPDIR:-${HOME:-/tmp}/tmp}"
mkdir -p "$TMPDIR"
export CI=true

pnpm install \
  --config.strict-dep-builds=false \
  --config.verify-deps-before-run=false \
  --frozen-lockfile 2>/dev/null \
  || pnpm install \
    --config.strict-dep-builds=false \
    --config.verify-deps-before-run=false

echo "==> Install complete"
