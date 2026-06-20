#!/usr/bin/env bash
# One-shot migrate + generate + optional seed on Hostinger server.
#
# From your Mac:
#   ssh -p 65002 -i ~/.ssh/hostinger_paggglobal u421975600@HOST \
#     'cd ~/domains/api.paggglobal.org/public_html && bash -s -- --seed' \
#     < scripts/hostinger-server-migrate.sh
set -euo pipefail

cd "${CHMS_PUBLIC_HTML:-$PWD}"
if [[ ! -f .env || ! -d prisma ]]; then
  echo "ERROR: run from ~/domains/api.paggglobal.org/public_html"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/hostinger-remote-tools.sh"

if [[ ! -f .env ]]; then
  echo "ERROR: .env missing in public_html"
  exit 1
fi

echo "==> Rebuilding root Prisma/tsx tools from API pnpm store"
rm -rf node_modules/prisma node_modules/@prisma node_modules/tsx node_modules/esbuild \
  node_modules/.bin/prisma node_modules/.bin/tsx 2>/dev/null || true
mkdir -p node_modules/.bin

PNPM_SEARCH_ROOT="apps/api"
hostinger_copy_pnpm_into node_modules '@prisma+*' 'prisma@*' 'argon2@*'

echo "==> Running migrations"
hostinger_prisma migrate deploy --schema=prisma/schema.prisma

echo "==> Generating Prisma client for API"
hostinger_sync_api_prisma_client

# tsx goes in tools/ — npm install in public_html root removes @prisma/client
hostinger_install_tsx

if [[ "${1:-}" == "--seed" ]]; then
  echo "==> Seeding database"
  hostinger_ensure_seed_deps apps/api
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  hostinger_tsx prisma/seed.ts
fi

mkdir -p apps/api/tmp apps/web/.next/standalone/apps/web/tmp
touch apps/api/tmp/restart.txt apps/web/.next/standalone/apps/web/tmp/restart.txt

echo "==> Done. Restart Node.js apps in hPanel."
