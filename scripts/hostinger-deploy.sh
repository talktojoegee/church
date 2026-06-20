#!/usr/bin/env bash
# Hostinger GitHub deploy hook — API app (api.paggglobal.org).
# hPanel build command: bash scripts/hostinger-deploy.sh
# Prefer: bash scripts/build-hostinger-api.sh (same result).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export TMPDIR="${HOME}/tmp"
mkdir -p "$TMPDIR"

export PNPM_HOME="${HOME}/.local/share/pnpm"
export PATH="${PNPM_HOME}/bin:${PATH}"
hash -r 2>/dev/null || true

if ! command -v pnpm &>/dev/null; then
  echo "ERROR: pnpm not found. In hPanel set Package manager to pnpm, or SSH:"
  echo "  curl -fsSL https://get.pnpm.io/install.sh | sh -"
  exit 1
fi

echo "==> pnpm $(pnpm --version) in $(pwd)"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

bash "$ROOT/scripts/build-hostinger-api.sh"

echo "==> Done. Migrations: run bash scripts/migrate-hostinger.sh from your Mac (not on Hostinger)."
echo "    Restart the app in hPanel if it did not auto-restart."
