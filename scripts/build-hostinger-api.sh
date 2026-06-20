#!/usr/bin/env bash
# Production build for Hostinger Git → Node.js app (api.paggglobal.org).
# hPanel build command: bash scripts/build-hostinger-api.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
STAGE="$ROOT/hostinger-api"

export TMPDIR="${TMPDIR:-${HOME:-/tmp}/tmp}"
mkdir -p "$TMPDIR"

echo "==> Building ChMS API for Hostinger"
echo "    Output: hostinger-api/dist/main.js"

pnpm --filter @chms/shared build
pnpm db:generate
pnpm --filter @chms/api build

echo "==> Packaging production runtime"
rm -rf "$STAGE"
pnpm --filter @chms/api deploy --prod --legacy "$STAGE"

# shellcheck disable=SC1091
source "$ROOT/scripts/sync-prisma-client.sh"
sync_prisma_client "$ROOT" "$STAGE"

if [[ ! -f "$STAGE/dist/main.js" ]]; then
  echo "ERROR: $STAGE/dist/main.js missing after build"
  exit 1
fi

echo "==> API ready for Hostinger (output dir: hostinger-api, entry: dist/main.js)"
