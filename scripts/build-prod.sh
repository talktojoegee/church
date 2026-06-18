#!/usr/bin/env bash
# Production build script — run from repo root
set -euo pipefail

echo "==> Building shared package"
pnpm --filter @chms/shared build

echo "==> Generating Prisma client"
pnpm db:generate

echo "==> Building API + Web"
pnpm build

echo "==> Copying Next.js standalone static assets"
STANDALONE="apps/web/.next/standalone/apps/web"
mkdir -p "$STANDALONE/.next"
cp -r apps/web/.next/static "$STANDALONE/.next/static"
if [ -d apps/web/public ]; then
  cp -r apps/web/public "$STANDALONE/public"
fi

echo "==> Build complete."
echo "    API:  node apps/api/dist/main.js"
echo "    Web:  node $STANDALONE/server.js"
echo "    Or:   pm2 start ecosystem.config.cjs"
