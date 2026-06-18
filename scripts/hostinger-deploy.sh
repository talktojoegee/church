#!/usr/bin/env bash
# Hostinger GitHub deploy hook — run from repo root after each git pull.
# hPanel → Git → set Build command to: bash scripts/hostinger-deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export TMPDIR="${HOME}/tmp"
mkdir -p "$TMPDIR"

export PNPM_HOME="${HOME}/.local/share/pnpm"
export PATH="${PNPM_HOME}/bin:${PATH}"

if ! command -v pnpm &>/dev/null; then
  echo "ERROR: pnpm not found. SSH in once and install:"
  echo "  export TMPDIR=\$HOME/tmp && curl -fsSL https://get.pnpm.io/install.sh | sh -"
  exit 1
fi

echo "==> pnpm $(pnpm --version)"
echo "==> Installing dependencies"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "==> Production build"
pnpm build:prod

if [[ -f .env ]]; then
  echo "==> Applying database migrations"
  pnpm db:deploy
else
  echo "WARN: No .env in repo root — skip db:deploy. Create .env on the server or use hPanel env vars."
fi

echo "==> Deploy complete. Restart both Node.js apps in hPanel (API + Web)."
