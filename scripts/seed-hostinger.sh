#!/usr/bin/env bash
# Seed the Hostinger MySQL database from your Mac (bypasses shared-hosting thread limits).
#
# Prisma seed on Hostinger SSH often fails with "PANIC: timer has gone away" due to
# low ulimit on shared hosting. Running seed locally through an SSH tunnel avoids this.
#
# Usage: bash scripts/seed-hostinger.sh
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

echo "==> Reading server env for seed"
REMOTE_ENV_BLOCK="$(
  ssh "${SSH_OPTS[@]}" "$REMOTE" "grep -E '^(DATABASE_URL|SUPER_ADMIN_|DEFAULT_CHURCH_|DEFAULT_CURRENCY|DEFAULT_LOCALE|DEFAULT_TIMEZONE)=' $REMOTE_ENV || true"
)"

REMOTE_DATABASE_URL="$(echo "$REMOTE_ENV_BLOCK" | grep -m1 '^DATABASE_URL=' | cut -d= -f2- | tr -d '\"' | tr -d "'")"

if [[ -z "$REMOTE_DATABASE_URL" ]]; then
  echo "ERROR: DATABASE_URL not found on server at $REMOTE_ENV"
  exit 1
fi

# Route MySQL through local SSH tunnel (127.0.0.1 on server -> localhost:3307 on Mac)
SEED_DATABASE_URL="$(
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

if [[ ! -x "$ROOT/node_modules/.bin/tsx" ]]; then
  echo "ERROR: tsx missing — run: pnpm install"
  exit 1
fi

echo "==> Running seed from Mac (through tunnel)"
while IFS= read -r line; do
  [[ -n "$line" ]] || continue
  [[ "$line" == DATABASE_URL=* ]] && continue
  export "$line"
done <<< "$REMOTE_ENV_BLOCK"
export DATABASE_URL="$SEED_DATABASE_URL"
"$ROOT/node_modules/.bin/tsx" "$ROOT/prisma/seed.ts"

echo "==> Seed complete."
