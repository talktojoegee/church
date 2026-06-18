#!/usr/bin/env bash
# Hostinger GitHub deploy hook — run from repo root after each git pull.
# hPanel → Git → set Build command to: bash scripts/hostinger-deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export TMPDIR="${HOME}/tmp"
mkdir -p "$TMPDIR"

export PNPM_HOME="${HOME}/.local/share/pnpm"
# Prefer user-installed pnpm over Hostinger Corepack (avoids version mismatch)
export PATH="${PNPM_HOME}/bin:${PATH}"
hash -r 2>/dev/null || true

if ! command -v pnpm &>/dev/null; then
  echo "ERROR: pnpm not found. SSH in once and install:"
  echo "  export TMPDIR=\$HOME/tmp && curl -fsSL https://get.pnpm.io/install.sh | sh -"
  exit 1
fi

echo "==> pnpm $(pnpm --version) in $(pwd)"
if [[ ! -f pnpm-workspace.yaml ]]; then
  echo "ERROR: pnpm-workspace.yaml not found — run deploy from repo root"
  exit 1
fi

echo "==> Installing dependencies"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Hostinger .builds/ may mount noexec — native bins (esbuild) fail with EACCES.
# If install fails here, build on GitHub Actions or locally and upload artifacts instead.
find "$ROOT/node_modules" -type f -path '*/esbuild/bin/esbuild' -exec chmod +x {} + 2>/dev/null || true
find "$ROOT/node_modules" -type f -path '*/@esbuild/*/bin/esbuild' -exec chmod +x {} + 2>/dev/null || true

echo "==> Production build"
pnpm build:prod

if [[ -f .env ]]; then
  echo "==> Applying database migrations"
  pnpm db:deploy
else
  echo "WARN: No .env in repo root — skip db:deploy. Create .env on the server or use hPanel env vars."
fi

echo "==> Deploy complete. Restart both Node.js apps in hPanel (API + Web)."
