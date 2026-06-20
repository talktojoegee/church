#!/usr/bin/env bash
# Deploy ChMS to Hostinger VPS with Docker Compose.
#
# Prerequisites on VPS:
#   - Docker + Docker Compose plugin installed
#   - Git repo cloned to DEPLOY_PATH (default /opt/chms)
#   - docker/.env created from docker/.env.example
#   - DNS: paggglobal.org + api.paggglobal.org → VPS IP
#   - Ports 80 and 443 open
#
# Usage:
#   cp deploy.env.example deploy.env   # set DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH
#   bash scripts/deploy-vps-docker.sh
#   bash scripts/deploy-vps-docker.sh --seed   # first deploy only
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_SEED=false

for arg in "$@"; do
  case "$arg" in
    --seed) RUN_SEED=true ;;
    -h|--help)
      echo "Usage: bash scripts/deploy-vps-docker.sh [--seed]"
      exit 0
      ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

if [[ -f "$ROOT/deploy.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/deploy.env"
fi

: "${DEPLOY_HOST:?Set DEPLOY_HOST in deploy.env}"
: "${DEPLOY_USER:?Set DEPLOY_USER in deploy.env}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/chms}"

SSH_OPTS=()
if [[ -n "${DEPLOY_SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-i "$DEPLOY_SSH_KEY")
fi

REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"

echo "==> Deploying to VPS: ${REMOTE}:${DEPLOY_PATH}"

ssh "${SSH_OPTS[@]}" "$REMOTE" bash -s <<EOF
set -euo pipefail
cd "${DEPLOY_PATH}"
if [[ ! -f docker/.env ]]; then
  echo "ERROR: ${DEPLOY_PATH}/docker/.env missing. Copy docker/.env.example to docker/.env on the VPS."
  exit 1
fi
git pull origin main
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env up -d --build
docker compose -f docker/docker-compose.prod.yml ps
EOF

if [[ "$RUN_SEED" == true ]]; then
  echo "==> Seeding database"
  ssh "${SSH_OPTS[@]}" "$REMOTE" \
    "cd ${DEPLOY_PATH} && docker compose -f docker/docker-compose.prod.yml --env-file docker/.env exec -T api sh -c 'cd /app && ./node_modules/.bin/tsx prisma/seed.ts'"
fi

echo ""
echo "==> Deploy complete."
echo "    https://paggglobal.org"
echo "    https://api.paggglobal.org/api/health"
echo "    Logs: ssh ${REMOTE} 'cd ${DEPLOY_PATH} && docker compose -f docker/docker-compose.prod.yml logs -f'"
