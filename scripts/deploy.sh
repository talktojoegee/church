#!/usr/bin/env bash
# Build (Docker/Linux) and deploy to Hostinger over SSH.
#
# Setup (one time):
#   cp deploy.env.example deploy.env
#   # Edit deploy.env with your Hostinger SSH host, user, paths
#   # Create .env on the server in public_html (first deploy only)
#
# Usage:
#   bash deploy.sh              # build + upload + extract + migrate
#   bash deploy.sh --skip-build # upload existing ../chms-deploy.tar.gz
#   bash deploy.sh --skip-upload --skip-extract  # migrate/seed only (keep server .env)
#   bash deploy.sh --seed       # also run prisma seed (first deploy)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ARCHIVE="${ROOT}/../chms-deploy.tar.gz"
SKIP_BUILD=false
SKIP_UPLOAD=false
SKIP_EXTRACT=false
RUN_SEED=false

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    --skip-upload) SKIP_UPLOAD=true ;;
    --skip-extract) SKIP_EXTRACT=true ;;
    --seed) RUN_SEED=true ;;
    -h|--help)
      echo "Usage: bash deploy.sh [--skip-build] [--skip-upload] [--skip-extract] [--seed]"
      exit 0
      ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

# Load local deploy config (not committed)
if [[ -f "$ROOT/deploy.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/deploy.env"
fi

: "${DEPLOY_HOST:?Set DEPLOY_HOST in deploy.env (e.g. ssh host from hPanel)}"
: "${DEPLOY_USER:?Set DEPLOY_USER in deploy.env (e.g. u421975600)}"
DEPLOY_API_REMOTE_DIR="${DEPLOY_API_REMOTE_DIR:-${DEPLOY_REMOTE_DIR:-domains/api.paggglobal.org}}"
DEPLOY_WEB_REMOTE_DIR="${DEPLOY_WEB_REMOTE_DIR:-domains/paggglobal.org}"

SSH_OPTS=()
SCP_OPTS=()
if [[ -n "${DEPLOY_SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-i "$DEPLOY_SSH_KEY")
  SCP_OPTS+=(-i "$DEPLOY_SSH_KEY")
fi
if [[ -n "${DEPLOY_SSH_PORT:-}" ]]; then
  # ssh uses -p; scp uses -P (OpenSSH quirk)
  SSH_OPTS+=(-p "$DEPLOY_SSH_PORT")
  SCP_OPTS+=(-P "$DEPLOY_SSH_PORT")
fi

REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"
SCP_TARGET="${REMOTE}:${DEPLOY_API_REMOTE_DIR}/chms-deploy.tar.gz"

# Injected into SSH scripts (avoid expanding unset DEPLOY_NODE_BIN in heredoc).
REMOTE_NODE_PATH=""
if [[ -n "${DEPLOY_NODE_BIN:-}" ]]; then
  REMOTE_NODE_PATH="$(dirname "${DEPLOY_NODE_BIN}")"
fi

echo "==> Deploy target: ${REMOTE}"
echo "    API: ${DEPLOY_API_REMOTE_DIR}/public_html"
echo "    Web: ${DEPLOY_WEB_REMOTE_DIR}/public_html"

if [[ "$SKIP_BUILD" == false ]]; then
  export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.paggglobal.org/api}"
  export NEXT_PUBLIC_APP_NAME="${NEXT_PUBLIC_APP_NAME:-Power And Glory Generation}"
  bash "$ROOT/scripts/build-linux-docker.sh"
else
  [[ -f "$ARCHIVE" ]] || { echo "Missing $ARCHIVE — run without --skip-build"; exit 1; }
  echo "==> Skipping build, using $ARCHIVE"
fi

if [[ "$SKIP_UPLOAD" == false ]]; then
  echo "==> Uploading archive"
  scp "${SCP_OPTS[@]}" "$ARCHIVE" "$SCP_TARGET"
else
  echo "==> Skipping upload (using existing chms-deploy.tar.gz on server)"
fi

echo "==> Extracting on server and running migrations"
if [[ "$SKIP_EXTRACT" == true ]]; then
  echo "==> Skipping extract (using existing public_html on server)"
fi
ssh "${SSH_OPTS[@]}" "$REMOTE" bash -s <<EOF
set -euo pipefail

# Hostinger SSH shells often lack node on PATH (Node.js is enabled via hPanel only).
if [[ -n "${REMOTE_NODE_PATH}" ]]; then
  export PATH="${REMOTE_NODE_PATH}:\$PATH"
elif ! command -v node >/dev/null 2>&1; then
  for dir in \
    /opt/alt/alt-nodejs22/root/usr/bin \
    /opt/alt/alt-nodejs20/root/usr/bin \
    /opt/alt/alt-nodejs18/root/usr/bin; do
    if [[ -x "\$dir/node" ]]; then
      export PATH="\$dir:\$PATH"
      break
    fi
  done
fi
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node not found over SSH."
  echo "Enable Node.js 20+ in hPanel, or set DEPLOY_NODE_BIN in deploy.env"
  exit 1
fi
echo "==> Using Node \$(node -v)"

API_DIR="\$HOME/${DEPLOY_API_REMOTE_DIR}"
WEB_DIR="\$HOME/${DEPLOY_WEB_REMOTE_DIR}"

if [[ "${SKIP_EXTRACT}" != "true" ]]; then
  extract_bundle() {
    local target="\$1"
    local env_backup=""
    cd "\$target"
    if [[ -f public_html/.env ]]; then
      env_backup="\$(mktemp)"
      cp public_html/.env "\$env_backup"
    fi
    rm -rf public_html
    mkdir -p public_html
    echo "==> Extracting chms-deploy.tar.gz (may take a few minutes)..."
    tar --warning=no-unknown-keyword -xzf chms-deploy.tar.gz -C public_html
    if [[ -n "\$env_backup" && -f "\$env_backup" ]]; then
      cp "\$env_backup" public_html/.env
      rm -f "\$env_backup"
    fi
  }

  mkdir -p "\$API_DIR/uploads"
  extract_bundle "\$API_DIR"
  mkdir -p "\$WEB_DIR"
  rsync -a --delete "\$API_DIR/public_html/" "\$WEB_DIR/public_html/"
fi

cd "\$API_DIR/public_html"
if [[ ! -f .env ]]; then
  echo "WARN: No .env on server — create ~/domains/api.paggglobal.org/public_html/.env before the app will run."
  exit 1
fi
echo "==> DATABASE_URL user/host: \$(grep -m1 '^DATABASE_URL=' .env | sed -E 's#.*://([^:/]+):([^@]+)@([^:/]+)/.*#\\1@\\3#')"

if ! find apps/api/node_modules/.pnpm -path '*/.prisma/client/index.js' -print -quit 2>/dev/null | grep -q .; then
  echo "ERROR: Prisma client missing in bundle — rebuild with bash deploy-hostinger.sh"
  exit 1
fi
if ! (cd apps/api && node -e "const e=require('@prisma/client').DepartmentMemberRole; if(!e||!e.HOD) process.exit(1)"); then
  echo "ERROR: Prisma enums missing in bundle — rebuild with bash deploy-hostinger.sh"
  exit 1
fi
echo "==> Prisma client verified (enums present)"

echo "==> Copying .env into API app root (Passenger cwd)"
cp .env apps/api/.env

echo "==> Enabling Node.js routing (.htaccess)"
WEB_APP="\$API_DIR/public_html/apps/web/.next/standalone/apps/web"
API_APP="\$API_DIR/public_html/apps/api"
mkdir -p "\$WEB_APP/tmp" "\$API_APP/tmp"
cat > "\$WEB_DIR/public_html/.htaccess" <<HTA
PassengerAppRoot \$WEB_APP
PassengerAppType node
PassengerNodejs /opt/alt/alt-nodejs22/root/bin/node
PassengerStartupFile server.js
PassengerBaseURI /
PassengerRestartDir \$WEB_APP/tmp
HTA
cat > "\$API_DIR/public_html/.htaccess" <<HTA
PassengerAppRoot \$API_APP
PassengerAppType node
PassengerNodejs /opt/alt/alt-nodejs22/root/bin/node
PassengerStartupFile dist/main.js
PassengerBaseURI /
PassengerRestartDir \$API_APP/tmp
HTA
chmod 644 "\$API_DIR/public_html/.htaccess" "\$WEB_DIR/public_html/.htaccess"
touch "\$WEB_APP/tmp/restart.txt" "\$API_APP/tmp/restart.txt"
EOF

echo "==> Running database migrations (from Mac via SSH tunnel — avoids Hostinger thread limits)"
bash "$ROOT/scripts/migrate-hostinger.sh"

if [[ "$RUN_SEED" == true ]]; then
  echo "==> Running database seed (from Mac via SSH tunnel — avoids Hostinger thread limits)"
  bash "$ROOT/scripts/seed-hostinger.sh"
fi

echo ""
echo "==> Deploy complete."
echo "    In hPanel → Node.js for api.paggglobal.org:"
echo "      - Application root: public_html/apps/api"
echo "      - Startup file: dist/main.js"
echo "      - Remove any DATABASE_URL (or other) env vars in hPanel — the app reads public_html/.env"
echo "      - Restart the app"
echo "    Web: paggglobal.org → public_html/apps/web/.next/standalone/apps/web → server.js"
echo "    Test: curl https://api.paggglobal.org/api/health"
