#!/usr/bin/env bash
# Production build for Hostinger Git → Node.js app (paggglobal.org).
# hPanel build command: bash scripts/build-hostinger-web.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export TMPDIR="${TMPDIR:-${HOME:-/tmp}/tmp}"
mkdir -p "$TMPDIR"

: "${NEXT_PUBLIC_API_URL:=https://api.paggglobal.org/api}"
: "${NEXT_PUBLIC_APP_NAME:=Power And Glory Generation}"
export NEXT_PUBLIC_API_URL NEXT_PUBLIC_APP_NAME

echo "==> Building ChMS Web for Hostinger"
echo "    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"

pnpm --filter @chms/shared build
pnpm --filter @chms/web build

STANDALONE="$ROOT/apps/web/.next/standalone/apps/web"
mkdir -p "$STANDALONE/.next"
cp -r apps/web/.next/static "$STANDALONE/.next/static"
if [[ -d apps/web/public ]]; then
  cp -r apps/web/public "$STANDALONE/public"
fi

if [[ ! -f "$STANDALONE/server.js" ]]; then
  echo "ERROR: $STANDALONE/server.js missing — check next.config.js output: standalone"
  exit 1
fi

echo "==> Web ready for Hostinger (output: apps/web/.next/standalone/apps/web, entry: server.js)"
