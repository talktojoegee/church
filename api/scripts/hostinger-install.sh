#!/usr/bin/env bash
# Hostinger hPanel → Install command (monorepo root install).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
export TMPDIR="${TMPDIR:-${HOME:-/tmp}/tmp}"
mkdir -p "$TMPDIR"
pnpm install --ignore-scripts --frozen-lockfile 2>/dev/null || pnpm install --ignore-scripts
pnpm --filter chms-api rebuild argon2 @prisma/client prisma 2>/dev/null || true
echo "==> Install complete (monorepo)"
