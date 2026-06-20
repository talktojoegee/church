#!/usr/bin/env bash
# Hostinger install hook — use as hPanel "Install command" if available.
# Default pnpm install fails on Hostinger: .builds/ is often noexec (esbuild EACCES).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export TMPDIR="${TMPDIR:-${HOME:-/tmp}/tmp}"
mkdir -p "$TMPDIR"

export PNPM_HOME="${PNPM_HOME:-${HOME}/.local/share/pnpm}"
export PATH="${PNPM_HOME}/bin:${PATH}"

echo "==> Hostinger install (ignore-scripts — avoids esbuild EACCES on noexec .builds/)"

if [[ -f pnpm-lock.yaml ]]; then
  pnpm install --ignore-scripts --frozen-lockfile
else
  pnpm install --ignore-scripts
fi

# Best-effort: rebuild native addons that compile without executing bundled bins in node_modules.
pnpm rebuild argon2 @prisma/client prisma 2>/dev/null || true

echo "==> Install complete"
