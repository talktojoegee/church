#!/usr/bin/env bash
# Enable LiteSpeed Passenger routing for ChMS on Hostinger (run once per domain).
# Creates public_html/.htaccess so Node serves traffic instead of static 403.
#
# Usage: bash scripts/hostinger-enable-node.sh
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
DEPLOY_WEB_REMOTE_DIR="${DEPLOY_WEB_REMOTE_DIR:-domains/paggglobal.org}"

SSH_OPTS=()
if [[ -n "${DEPLOY_SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-i "$DEPLOY_SSH_KEY")
fi
if [[ -n "${DEPLOY_SSH_PORT:-}" ]]; then
  SSH_OPTS+=(-p "$DEPLOY_SSH_PORT")
fi

REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"

ssh "${SSH_OPTS[@]}" "$REMOTE" bash -s <<EOF
set -euo pipefail

WEB_ROOT="\$HOME/${DEPLOY_WEB_REMOTE_DIR}/public_html"
API_ROOT="\$HOME/${DEPLOY_API_REMOTE_DIR}/public_html"
WEB_APP="\$WEB_ROOT/apps/web/.next/standalone/apps/web"
API_APP="\$API_ROOT/apps/api"

for dir in "\$WEB_APP/server.js" "\$API_APP/dist/main.js"; do
  if [[ ! -f "\$dir" ]]; then
    echo "ERROR: Missing \$dir — run deploy.sh first"
    exit 1
  fi
done

mkdir -p "\$WEB_APP/tmp" "\$API_APP/tmp"

cat > "\$WEB_ROOT/.htaccess" <<HTA
PassengerAppRoot \$WEB_APP
PassengerAppType node
PassengerNodejs /opt/alt/alt-nodejs22/root/bin/node
PassengerStartupFile server.js
PassengerBaseURI /
PassengerRestartDir \$WEB_APP/tmp
HTA

cat > "\$API_ROOT/.htaccess" <<HTA
PassengerAppRoot \$API_APP
PassengerAppType node
PassengerNodejs /opt/alt/alt-nodejs22/root/bin/node
PassengerStartupFile dist/main.js
PassengerBaseURI /
PassengerRestartDir \$API_APP/tmp
HTA

chmod 644 "\$WEB_ROOT/.htaccess" "\$API_ROOT/.htaccess"
touch "\$WEB_APP/tmp/restart.txt" "\$API_APP/tmp/restart.txt"

echo "==> Web .htaccess:"
cat "\$WEB_ROOT/.htaccess"
echo "==> API .htaccess:"
cat "\$API_ROOT/.htaccess"
echo "==> Done. Test:"
echo "    curl -sI https://paggglobal.org | head -3"
echo "    curl -s https://api.paggglobal.org/api/health"
EOF
