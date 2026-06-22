#!/usr/bin/env bash
# Deploy ChMS to AWS EC2 (Docker + RDS).
#
# Usage:
#   cp deploy.env.aws.example deploy.env   # first time
#   bash deploy-aws.sh                     # pull + rebuild on EC2
#   bash deploy-aws.sh --seed              # also run prisma seed
#   bash deploy-aws.sh --setup             # first-time EC2 bootstrap (Docker, clone)
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

usage() {
  cat <<'EOF'
Deploy ChMS to AWS EC2

Usage:
  bash deploy-aws.sh [--setup] [--seed]

Options:
  --setup   First-time server setup (install Docker, clone repo, create docker/.env)
  --seed    Run prisma seed after deploy (first deploy only)

By default, deploy syncs your local repo to EC2 (rsync). Set DEPLOY_FROM_GIT=true
in deploy.env to pull from GitHub instead (requires monorepo on main).

Requires deploy.env (copy from deploy.env.aws.example).
EOF
}

SETUP=false
SEED=false
for arg in "$@"; do
  case "$arg" in
    --setup) SETUP=true ;;
    --seed) SEED=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

ENV_FILE="${DEPLOY_ENV_FILE:-deploy.env}"
if [[ ! -f "$ROOT/$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found." >&2
  echo "  cp deploy.env.aws.example deploy.env" >&2
  echo "  # For Hostinger, keep a separate file: deploy.env.hostinger" >&2
  exit 1
fi
# shellcheck disable=SC1091
source "$ROOT/$ENV_FILE"

: "${DEPLOY_HOST:?Set DEPLOY_HOST in deploy.env}"
: "${DEPLOY_USER:=ubuntu}"
: "${DEPLOY_PATH:=/opt/chms}"
: "${DEPLOY_SSH_KEY:?Set DEPLOY_SSH_KEY in deploy.env}"
: "${GIT_REPO:=https://github.com/talktojoegee/church.git}"
: "${GIT_BRANCH:=main}"

SSH_OPTS=(-i "$DEPLOY_SSH_KEY" -o StrictHostKeyChecking=accept-new)
SCP_OPTS=(-i "$DEPLOY_SSH_KEY" -o StrictHostKeyChecking=accept-new)
if [[ -n "${DEPLOY_SSH_PORT:-}" ]]; then
  SSH_OPTS+=(-p "$DEPLOY_SSH_PORT")
  SCP_OPTS+=(-P "$DEPLOY_SSH_PORT")
fi
REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"

remote() {
  ssh "${SSH_OPTS[@]}" "$REMOTE" "$@"
}

scp_to_remote() {
  scp "${SCP_OPTS[@]}" "$@"
}

if [[ "$SETUP" == true ]]; then
  echo "==> Bootstrapping EC2 ($REMOTE)"
  scp_to_remote "$ROOT/aws/ec2-user-data.sh" "$REMOTE:/tmp/ec2-user-data.sh"
  remote "sudo bash /tmp/ec2-user-data.sh"
  remote "if [[ ! -d $DEPLOY_PATH/.git ]]; then git clone -b $GIT_BRANCH $GIT_REPO $DEPLOY_PATH; fi"
  if [[ -f "$ROOT/docker/.env" ]]; then
    echo "==> Uploading docker/.env"
    scp_to_remote "$ROOT/docker/.env" "$REMOTE:$DEPLOY_PATH/docker/.env"
  else
    remote "cd $DEPLOY_PATH && cp docker/.env.aws.example docker/.env"
    echo ""
    echo "WARN: Edit docker/.env on the server before first start:"
    echo "  ssh -i $DEPLOY_SSH_KEY $REMOTE"
    echo "  nano $DEPLOY_PATH/docker/.env"
    echo ""
  fi
fi

echo "==> Syncing project to $REMOTE:$DEPLOY_PATH"
RSYNC_EXCLUDES=(
  --exclude '.git'
  --exclude 'node_modules'
  --exclude '**/.next'
  --exclude '**/dist'
  --exclude '.env'
  --exclude 'docker/.env'
  --exclude 'deploy.env'
  --exclude 'deploy.env.*'
  --exclude 'chms-deploy.tar.gz'
)
if [[ "${DEPLOY_FROM_GIT:-}" == true ]]; then
  echo "==> Pulling $GIT_BRANCH from $GIT_REPO"
  remote bash -s <<EOF
set -euo pipefail
cd "$DEPLOY_PATH"
git fetch origin "$GIT_BRANCH"
git reset --hard "origin/$GIT_BRANCH"
EOF
else
  rsync -az --delete "${RSYNC_EXCLUDES[@]}" \
    -e "ssh ${SSH_OPTS[*]}" \
    "$ROOT/" "$REMOTE:$DEPLOY_PATH/"
fi

if [[ -f "$ROOT/docker/.env" ]]; then
  echo "==> Uploading docker/.env"
  scp_to_remote "$ROOT/docker/.env" "$REMOTE:$DEPLOY_PATH/docker/.env"
fi

echo "==> Building containers on $REMOTE"
remote bash -s <<EOF
set -euo pipefail
cd "$DEPLOY_PATH"
if [[ ! -f package.json ]]; then
  echo "ERROR: package.json missing on server. Push monorepo to GitHub or deploy without DEPLOY_FROM_GIT=true." >&2
  exit 1
fi
docker compose -f docker/docker-compose.aws.yml --env-file docker/.env up -d --build
EOF

if [[ "$SEED" == true ]]; then
  echo "==> Seeding database"
  remote "cd $DEPLOY_PATH && docker compose -f docker/docker-compose.aws.yml --env-file docker/.env \
    exec -T api sh -c 'cd /app/api && /app/node_modules/.bin/tsx prisma/seed.ts'"
fi

echo "==> Waiting for services..."
sleep 8

HEALTH_URL="${HEALTH_URL:-https://api.paggglobal.org/api/health}"
if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
  echo "==> Health OK: $HEALTH_URL"
  curl -s "$HEALTH_URL"
  echo ""
else
  echo "WARN: Could not reach $HEALTH_URL yet."
  echo "  Check logs: ssh -i $DEPLOY_SSH_KEY $REMOTE"
  echo "  docker compose -f docker/docker-compose.aws.yml logs -f api web caddy"
fi

echo ""
echo "==> Deploy complete"
