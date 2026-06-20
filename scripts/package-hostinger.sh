#!/usr/bin/env bash
# Build a slim Hostinger deploy tree (run after pnpm build:prod from repo root).
#
# Includes only:
#   - API dist + production runtime deps
#   - Next.js standalone web bundle
#   - Prisma schema/migrations + tools for migrate/seed
#   - @chms/shared (for seed script)
#
# Usage: bash scripts/package-hostinger.sh [/path/to/stage-dir]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="${1:-/tmp/chms-hostinger-stage}"
case "$STAGE" in
  /*) ;;
  *) STAGE="$ROOT/$STAGE" ;;
esac

cd "$ROOT"

if [[ ! -f apps/api/dist/main.js ]]; then
  echo "ERROR: apps/api/dist/main.js missing — run pnpm build:prod first"
  exit 1
fi

if [[ ! -f apps/web/.next/standalone/apps/web/server.js ]]; then
  echo "ERROR: Next.js standalone missing — run pnpm build:prod first"
  exit 1
fi

echo "==> Staging slim Hostinger bundle at ${STAGE}"
rm -rf "$STAGE"
mkdir -p "$STAGE/apps/api" "$STAGE/apps/web/.next" "$STAGE/packages/shared"

echo "==> API (production dependencies only)"
pnpm --filter @chms/api deploy --prod --legacy "$STAGE/apps/api"
rm -rf "$STAGE/apps/api/src" "$STAGE/apps/api/test" 2>/dev/null || true

echo "==> Web standalone"
cp -a apps/web/.next/standalone "$STAGE/apps/web/.next/"

echo "==> Shared package (for seed)"
cp packages/shared/package.json "$STAGE/packages/shared/"
cp -a packages/shared/dist "$STAGE/packages/shared/"

echo "==> Prisma schema + migrate/seed tools"
cp -r prisma "$STAGE/prisma"

# shellcheck disable=SC1091
source "$ROOT/scripts/sync-prisma-client.sh"

echo "==> @chms/shared shim for optional server-side seed"
mkdir -p "$STAGE/node_modules/@chms/shared"
cp -a "$STAGE/packages/shared/dist" "$STAGE/packages/shared/package.json" "$STAGE/node_modules/@chms/shared/"

echo "==> Sync Prisma client (with enums) into API runtime"
sync_prisma_client "$ROOT" "$STAGE/apps/api"
echo "==> Prisma client ready in API runtime"

cat > "$STAGE/package.json" <<'EOF'
{
  "private": true,
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
EOF

API_SIZE="$(du -sh "$STAGE/apps/api" | cut -f1)"
WEB_SIZE="$(du -sh "$STAGE/apps/web/.next/standalone" | cut -f1)"
ROOT_SIZE="$(du -sh "$STAGE/node_modules" 2>/dev/null | cut -f1 || echo '0')"
TOTAL_SIZE="$(du -sh "$STAGE" | cut -f1)"
echo "==> Slim bundle ready"
echo "    API:   ${API_SIZE}"
echo "    Web:   ${WEB_SIZE}"
echo "    Tools: ${ROOT_SIZE} (@chms/shared shim)"
echo "    Total: ${TOTAL_SIZE} (uncompressed)"
