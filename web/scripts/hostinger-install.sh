#!/usr/bin/env bash
# Hostinger hPanel → Install command (monorepo root install).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f packages/shared/index.ts ]]; then
  echo "ERROR: packages/shared is missing."
  echo "  Deploy from monorepo root or set Git root to repo root with web output in web/."
  exit 1
fi

export TMPDIR="${TMPDIR:-${HOME:-/tmp}/tmp}"
mkdir -p "$TMPDIR"
export CI=true

pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "==> Install complete (monorepo)"
