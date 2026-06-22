#!/usr/bin/env bash
# Full-stack E2E: API smoke tests + Playwright web tests.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="${API_URL:-http://localhost:4000/api}"
WEB_URL="${WEB_URL:-http://localhost:3000}"

wait_for() {
  local url="$1" name="$2" tries="${3:-60}"
  for ((i = 1; i <= tries; i++)); do
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || echo 000)"
    if [[ "$code" =~ ^[23] ]]; then
      echo "==> $name ready"
      return 0
    fi
    sleep 2
  done
  echo "ERROR: $name not ready at $url"
  return 1
}

wait_for_mysql() {
  local tries="${1:-60}"
  for ((i = 1; i <= tries; i++)); do
    if docker compose -f "$ROOT/docker-compose.yml" exec -T mysql mysqladmin ping -h localhost -pchms_password --silent 2>/dev/null; then
      echo "==> MySQL ready"
      return 0
    fi
    sleep 2
  done
  echo "ERROR: MySQL not ready"
  return 1
}

echo "==> Installing monorepo dependencies"
cd "$ROOT"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "==> Starting MySQL"
docker compose -f "$ROOT/docker-compose.yml" up -d
wait_for_mysql 30

echo "==> Preparing API"
cd "$ROOT/api"
[[ -f .env ]] || cp .env.example .env
pnpm exec prisma migrate deploy
pnpm db:seed

API_PID=""
WEB_PID=""
cleanup() {
  [[ -n "$API_PID" ]] && kill "$API_PID" 2>/dev/null || true
  [[ -n "$WEB_PID" ]] && kill "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT

if ! curl -sf "$API_URL/health" >/dev/null 2>&1; then
  echo "==> Building & starting API (production mode)"
  pnpm run build
  pnpm start >/tmp/chms-api-e2e.log 2>&1 &
  API_PID=$!
  wait_for "$API_URL/health" "API"
fi

cd "$ROOT/web"
[[ -f .env.local ]] || echo 'NEXT_PUBLIC_API_URL=http://localhost:4000/api' > .env.local

if ! curl -sf "$WEB_URL" >/dev/null 2>&1; then
  echo "==> Starting Web"
  pnpm dev >/tmp/chms-web-e2e.log 2>&1 &
  WEB_PID=$!
  wait_for "$WEB_URL" "Web"
fi

echo ""
echo "========================================"
echo " API E2E"
echo "========================================"
cd "$ROOT"
node scripts/e2e-api.mjs

echo ""
echo "========================================"
echo " WEB E2E (Playwright)"
echo "========================================"
cd "$ROOT/e2e"
pnpm exec playwright install chromium
SKIP_WEB_SERVER=1 WEB_URL="$WEB_URL" pnpm test

echo ""
echo "==> All E2E tests passed"
