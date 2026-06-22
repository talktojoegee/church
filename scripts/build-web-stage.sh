#!/usr/bin/env bash
# Build Web standalone stage directory (Linux). Used by GitHub Actions and zip scripts.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -d /repo/web ]]; then
  ROOT=/repo
elif [[ -d "$SCRIPT_DIR/../web" ]]; then
  ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
else
  ROOT="$(pwd)"
fi
WEB="$(cd "$ROOT/web" && pwd)"
STAGE="${1:?Usage: build-web-stage.sh /path/to/stage}"

: "${NEXT_PUBLIC_API_URL:=https://api.paggglobal.org/api}"
: "${NEXT_PUBLIC_APP_NAME:=Power And Glory Generation}"
export NEXT_PUBLIC_API_URL NEXT_PUBLIC_APP_NAME

mkdir -p "$STAGE"
find "$STAGE" -mindepth 1 -delete 2>/dev/null || rm -rf "$STAGE"/* "$STAGE"/.[!.]* "$STAGE"/..?* 2>/dev/null || true

cd "$ROOT"
echo "==> pnpm install (monorepo)"
corepack enable pnpm 2>/dev/null || true
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "==> pnpm run build:hostinger (web)"
echo "    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"
cd "$WEB"
pnpm run build:hostinger

if [[ ! -f .next/standalone/server.js ]]; then
  echo "ERROR: .next/standalone/server.js not found — build:hostinger failed" >&2
  exit 1
fi

echo "==> Copying standalone output to stage"
cp -a .next/standalone/. "$STAGE/"
mkdir -p "$STAGE/tmp"

# Hostinger runs `npm install` on deploy and strips bundled node_modules from the zip.
# Include production dependencies so install recreates what server.js needs.
node -e "
const web = require('$WEB/package.json');
const pkg = {
  name: 'chms-web',
  version: '0.1.0',
  private: true,
  engines: { node: '>=20.0.0' },
  scripts: {
    build: \"node -e \\\"require('fs').accessSync('server.js'); console.log('Pre-built standalone — skipping next build')\\\"\",
    start: 'node server.js',
  },
  dependencies: web.dependencies,
};
require('fs').writeFileSync('$STAGE/package.json', JSON.stringify(pkg, null, 2) + '\n');
"
# Reproducible prod install on Hostinger (optional; npm install --omit=dev also works).
if [[ -f "$ROOT/pnpm-lock.yaml" ]]; then
  cp "$ROOT/pnpm-lock.yaml" "$STAGE/pnpm-lock.yaml"
fi

API_URL="$NEXT_PUBLIC_API_URL" cat > "$STAGE/HOSTINGER-DEPLOY.txt" <<EOF
CHMS Web — Hostinger ZIP deploy (pre-built Next.js standalone)
Built with NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

DO NOT extract into public_html manually. Use hPanel Node.js Web App upload.

hPanel → Websites → Add/Edit Node.js web app → Upload this ZIP:

  Node version:       22
  Output directory:   (EMPTY — not .next or .next/standalone)
  Entry file:         server.js
  Install command:    npm install --omit=dev
  Build command:      npm run build   (no-op — safe)
  Start command:      npm start

  Note: Hostinger deletes node_modules from the zip and reinstalls from package.json.
  The zip still bundles node_modules for local verify; server install must list dependencies.

Environment variables:
  NODE_ENV=production
  HOSTNAME=0.0.0.0

After deploy, zip root must contain (same folder as server.js):
  server.js
  package.json
  node_modules/
  .next/
  public/

WRONG (causes 403): public_html/server/, public_html/static/, BUILD_ID only — that is .next internals.

Disable Git auto-deploy when using ZIP upload.
Disable CDN for paggglobal.org.
EOF

bash "$ROOT/scripts/lib/verify-web-stage.sh" "$STAGE"
echo "==> Web stage ready at $STAGE"
