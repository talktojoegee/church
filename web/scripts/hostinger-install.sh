#!/usr/bin/env bash
# Hostinger hPanel → Install command (npm — avoids pnpm v11 strictDepBuilds failures)
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

npm ci 2>/dev/null || npm install

echo "==> Install complete"
