#!/usr/bin/env bash
# Apply Prisma migrations to Hostinger MySQL from your Mac (SSH tunnel).
#
# Prisma CLI on Hostinger SSH often core-dumps due to shared-hosting thread limits.
# Running migrate locally through a tunnel avoids this (same approach as seed-hostinger.sh).
#
# Usage: bash scripts/migrate-hostinger.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/deploy.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/deploy.env"
fi

: "${DEPLOY_HOST:?Set DEPLOY_HOST in deploy.env}"
: "${DEPLOY_USER:?Set DEPLOY_USER in deploy.env}"
DEPLOY_API_REMOTE_DIR="${DEPLOY_API_REMOTE_DIR:-domains/api.paggglobal.org}"
LOCAL_TUNNEL_PORT="${LOCAL_TUNNEL_PORT:-3307}"

SSH_OPTS=()
if [[ -n "${DEPLOY_SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-i "$DEPLOY_SSH_KEY")
fi
if [[ -n "${DEPLOY_SSH_PORT:-}" ]]; then
  SSH_OPTS+=(-p "$DEPLOY_SSH_PORT")
fi

REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"
REMOTE_ENV="\$HOME/${DEPLOY_API_REMOTE_DIR}/public_html/.env"

echo "==> Reading server DATABASE_URL for migrate"
REMOTE_DATABASE_URL="$(
  ssh "${SSH_OPTS[@]}" "$REMOTE" "grep -m1 '^DATABASE_URL=' $REMOTE_ENV | cut -d= -f2- | tr -d '\"' | tr -d \"'\""
)"

if [[ -z "$REMOTE_DATABASE_URL" ]]; then
  echo "ERROR: DATABASE_URL not found on server at $REMOTE_ENV"
  exit 1
fi

MIGRATE_DATABASE_URL="$(
  node -e "
    const raw = process.argv[1].trim();
    const u = new URL(raw);
    u.hostname = '127.0.0.1';
    u.port = process.argv[2];
    console.log(u.toString());
  " "$REMOTE_DATABASE_URL" "$LOCAL_TUNNEL_PORT"
)"

cleanup() {
  if [[ -n "${TUNNEL_PID:-}" ]] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "==> Opening SSH tunnel localhost:${LOCAL_TUNNEL_PORT} -> server MySQL"
ssh "${SSH_OPTS[@]}" -f -N -L "${LOCAL_TUNNEL_PORT}:127.0.0.1:3306" "$REMOTE"
TUNNEL_PID="$(pgrep -f "ssh.*${LOCAL_TUNNEL_PORT}:127.0.0.1:3306" | head -1 || true)"
sleep 1

if [[ ! -x "$ROOT/node_modules/.bin/prisma" ]]; then
  echo "ERROR: prisma CLI missing — run: pnpm install"
  exit 1
fi

echo "==> Running prisma migrate deploy from Mac (through tunnel)"
export DATABASE_URL="$MIGRATE_DATABASE_URL"
"$ROOT/node_modules/.bin/prisma" migrate deploy --schema=prisma/schema.prisma

echo "==> Migrations complete."
