#!/usr/bin/env bash
# Hotfix Hostinger API: sync a correct Prisma client (with enums) onto the server.
#
# Usage: bash scripts/fix-prisma-hostinger.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/sync-prisma-client.sh"

if [[ -f "$ROOT/deploy.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/deploy.env"
fi

: "${DEPLOY_HOST:?Set DEPLOY_HOST in deploy.env}"
: "${DEPLOY_USER:?Set DEPLOY_USER in deploy.env}"
DEPLOY_API_REMOTE_DIR="${DEPLOY_API_REMOTE_DIR:-domains/api.paggglobal.org}"

SSH_OPTS=()
SCP_OPTS=()
if [[ -n "${DEPLOY_SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-i "$DEPLOY_SSH_KEY")
  SCP_OPTS+=(-i "$DEPLOY_SSH_KEY")
fi
if [[ -n "${DEPLOY_SSH_PORT:-}" ]]; then
  SSH_OPTS+=(-p "$DEPLOY_SSH_PORT")
  SCP_OPTS+=(-P "$DEPLOY_SSH_PORT")
fi

REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"
REMOTE_API="\$HOME/${DEPLOY_API_REMOTE_DIR}/public_html/apps/api"

echo "==> Generating Prisma client locally"
./node_modules/.bin/prisma generate --schema=prisma/schema.prisma >/dev/null

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/apps/api/node_modules/@prisma/client"
copy_prisma_client_tree "$LOCAL_NM/.prisma" "$STAGE/apps/api/node_modules/.prisma"
cp -a "$LOCAL_NM/@prisma/client/." "$STAGE/apps/api/node_modules/@prisma/client/"
verify_prisma_enums "$STAGE/apps/api"

echo "==> Uploading Prisma client to Hostinger"
REMOTE_NM="$(
  ssh "${SSH_OPTS[@]}" "$REMOTE" "find $REMOTE_API/node_modules/.pnpm -path '*/node_modules/@prisma/client/default.js' -print -quit 2>/dev/null | xargs dirname | xargs dirname | xargs dirname"
)"

if [[ -z "$REMOTE_NM" ]]; then
  echo "ERROR: Could not locate API Prisma path on server"
  exit 1
fi

COPYFILE_DISABLE=1 tar -czf "$STAGE/prisma-client.tgz" -C "$STAGE/apps/api/node_modules" .prisma
scp "${SCP_OPTS[@]}" "$STAGE/prisma-client.tgz" "$REMOTE:/tmp/chms-prisma-client.tgz"
ssh "${SSH_OPTS[@]}" "$REMOTE" "mkdir -p '$REMOTE_NM' && rm -rf '$REMOTE_NM/.prisma' && tar -xzf /tmp/chms-prisma-client.tgz -C '$REMOTE_NM' && rm -f /tmp/chms-prisma-client.tgz"

echo "==> Verifying enums on server"
ssh "${SSH_OPTS[@]}" "$REMOTE" "export PATH=/opt/alt/alt-nodejs22/root/usr/bin:\$PATH; cd $REMOTE_API && node -e \"const e=require('@prisma/client').DepartmentMemberRole; if(!e||!e.HOD){console.error('still broken'); process.exit(1)}; console.log('DepartmentMemberRole ok')\""

echo "==> Restarting API Passenger app"
ssh "${SSH_OPTS[@]}" "$REMOTE" "touch \$HOME/${DEPLOY_API_REMOTE_DIR}/public_html/apps/api/tmp/restart.txt"

echo "==> Prisma client fixed. Test: curl -I https://api.paggglobal.org/api/health"
