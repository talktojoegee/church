#!/usr/bin/env bash
# Hostinger hPanel → Install command (optional; pnpm-workspace.yaml also disables esbuild builds).
set -euo pipefail
cd "$(dirname "$0")/.."
export TMPDIR="${TMPDIR:-${HOME:-/tmp}/tmp}"
mkdir -p "$TMPDIR"
pnpm install --ignore-scripts --frozen-lockfile 2>/dev/null || pnpm install --ignore-scripts
pnpm rebuild argon2 @prisma/client prisma 2>/dev/null || true
echo "==> Install complete"
