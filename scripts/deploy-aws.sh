#!/usr/bin/env bash
# Deploy ChMS to AWS EC2 with Docker Compose.
#
# Prerequisites:
#   - EC2 running Ubuntu 22.04+ with Docker
#   - RDS MySQL reachable from EC2 security group
#   - Repo at DEPLOY_PATH with docker/.env configured
#   - deploy.env: DEPLOY_HOST (Elastic IP), DEPLOY_USER=ubuntu, DEPLOY_PATH=/opt/chms
#
# Usage:
#   bash deploy-aws.sh
#   bash deploy-aws.sh --seed
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_SEED=false

for arg in "$@"; do
  case "$arg" in
    --seed) RUN_SEED=true ;;
    -h|--help)
      echo "Usage: bash deploy-aws.sh [--seed]"
      exit 0
      ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

if [[ -f "$ROOT/deploy.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/deploy.env"
fi

: "${DEPLOY_HOST:?Set DEPLOY_HOST in deploy.env (EC2 Elastic IP)}"
: "${DEPLOY_USER:?Set DEPLOY_USER in deploy.env (usually ubuntu)}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/chms}"

SSH_OPTS=()
if [[ -n "${DEPLOY_SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-i "$DEPLOY_SSH_KEY")
fi

REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"

echo "==> Deploying to AWS EC2: ${REMOTE}:${DEPLOY_PATH}"

ssh "${SSH_OPTS[@]}" "$REMOTE" bash -s <<EOF
set -euo pipefail
cd "${DEPLOY_PATH}"
if [[ ! -f docker/.env ]]; then
  echo "ERROR: ${DEPLOY_PATH}/docker/.env missing. Copy docker/.env.aws.example to docker/.env"
  exit 1
fi
git pull origin main
docker compose -f docker/docker-compose.aws.yml --env-file docker/.env up -d --build
docker compose -f docker/docker-compose.aws.yml ps
EOF

if [[ "$RUN_SEED" == true ]]; then
  echo "==> Seeding database"
  ssh "${SSH_OPTS[@]}" "$REMOTE" \
    "cd ${DEPLOY_PATH} && docker compose -f docker/docker-compose.aws.yml --env-file docker/.env exec -T api sh -c 'cd /app && ./node_modules/.bin/tsx prisma/seed.ts'"
fi

echo ""
echo "==> Deploy complete."
echo "    https://paggglobal.org"
echo "    https://api.paggglobal.org/api/health"
