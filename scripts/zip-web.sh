#!/usr/bin/env bash
# Build + zip ChMS Web for Hostinger Node.js Web App upload (Linux amd64 via Docker).
#
# Usage:
#   bash scripts/zip-web.sh                 # build + zip (recommended)
#   bash scripts/zip-web.sh --verify        # validate stage only, no zip
#   bash scripts/zip-web.sh --skip-build    # zip existing stage
#   bash scripts/zip-web.sh --check-zip     # validate existing zip file
#
# Output:
#   dist/chms-web-deploy.zip
#   dist/chms-web-DEPLOY.txt                # hPanel settings cheat sheet
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/web"
OUT_DIR="$ROOT/dist"
STAGE="${STAGE:-/tmp/chms-web-stage}"
ZIP="$OUT_DIR/chms-web-deploy.zip"
DEPLOY_TXT="$OUT_DIR/chms-web-DEPLOY.txt"
SKIP_BUILD=false
VERIFY_ONLY=false
CHECK_ZIP=false

usage() {
  cat <<'EOF'
ChMS Web — build & zip for Hostinger Node.js Web App

Usage:
  bash scripts/zip-web.sh [options]

Options:
  (none)          Build linux/amd64 standalone in Docker, verify, create zip
  --skip-build    Zip an existing stage (STAGE=/path default /tmp/chms-web-stage)
  --verify        Validate stage directory only (no build, no zip)
  --check-zip     Validate dist/chms-web-deploy.zip contents
  -h, --help      Show this help

Environment:
  NEXT_PUBLIC_API_URL   default: https://api.paggglobal.org/api
  NEXT_PUBLIC_APP_NAME  default: Power And Glory Generation
  STAGE                 build output dir (default: /tmp/chms-web-stage)

Examples:
  bash scripts/zip-web.sh
  NEXT_PUBLIC_API_URL=https://api.paggglobal.org/api bash scripts/zip-web.sh

Hostinger deploy (recommended):
  1. hPanel → Websites → Add website → Node.js web app
  2. Upload dist/chms-web-deploy.zip (NOT manual extract into public_html)
  3. Output directory: EMPTY | Entry: server.js | Node: 22
  4. Build: npm run build | Start: npm start
  5. Env: NODE_ENV=production, HOSTNAME=0.0.0.0
  6. Disable CDN + Git auto-deploy for this domain

Without Docker: GitHub → Actions → "Hostinger deploy zips" → download artifact
EOF
}

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    --verify) VERIFY_ONLY=true ;;
    --check-zip) CHECK_ZIP=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)" >&2; exit 1 ;;
  esac
done

: "${NEXT_PUBLIC_API_URL:=https://api.paggglobal.org/api}"
: "${NEXT_PUBLIC_APP_NAME:=Power And Glory Generation}"

mkdir -p "$OUT_DIR"

verify_zip() {
  local zipfile="$1"
  [[ -f "$zipfile" ]] || { echo "ERROR: Zip not found: $zipfile" >&2; exit 1; }
  echo "==> Checking $zipfile"

  local entries
  entries="$(unzip -Z1 "$zipfile")"
  local normalized
  normalized="$(echo "$entries" | sed 's|^\./||')"

  # Use here-strings — pipefail + "echo | grep -q" exits 141 (SIGPIPE) on macOS
  if ! grep -Fx 'server.js' <<< "$normalized" >/dev/null; then
    echo "ERROR: Zip does not contain server.js at root — wrong deploy package" >&2
    echo "  This zip must be from bash scripts/zip-web.sh, not .next/ folder contents." >&2
    echo "  Zip entries (first 20):" >&2
    head -20 <<< "$entries" >&2
    exit 1
  fi

  if grep -Fx 'BUILD_ID' <<< "$normalized" >/dev/null \
    && ! grep -q '^node_modules/' <<< "$normalized"; then
    echo "ERROR: Zip looks like partial .next output (BUILD_ID without node_modules)" >&2
    exit 1
  fi

  if ! grep -qE '^\.next/' <<< "$normalized"; then
    echo "WARN: .next/ not found in zip — static assets may be missing" >&2
  fi

  echo "==> Zip structure OK (contains server.js)"
  echo ""
  echo "Root entries:"
  echo "$normalized" | awk -F/ 'NF==1 {print "  " $0}' | head -15
}

create_zip() {
  local zipfile="$1"
  rm -f "$zipfile"
  # macOS zip skips hidden dirs (e.g. .next) with "zip -r ." — use find | zip -@
  (
    cd "$STAGE"
    find . -mindepth 1 \
      ! -name '.DS_Store' \
      ! -path '*/.DS_Store' \
      -print \
      | zip -@ -q "$zipfile"
  )
}

write_deploy_cheatsheet() {
  cat > "$DEPLOY_TXT" <<EOF
ChMS Web deploy — $(date -u +"%Y-%m-%d %H:%M UTC")
API URL baked in: $NEXT_PUBLIC_API_URL

Upload file: dist/chms-web-deploy.zip
Method: hPanel → Websites → Node.js web app → Upload ZIP

hPanel settings:
  Node version:        22
  Output directory:    (leave EMPTY)
  Entry file:          server.js
  Install command:     npm install --omit=dev
  Build command:       npm run build
  Start command:       npm start

Environment:
  NODE_ENV=production
  HOSTNAME=0.0.0.0

After upload, Hostinger puts app files outside public_html and proxies via .htaccess.
Do NOT copy server/ or static/ from .next into public_html manually.

Verify in browser: https://paggglobal.org/
EOF
}

if [[ "$CHECK_ZIP" == true ]]; then
  verify_zip "$ZIP"
  exit 0
fi

if [[ "$VERIFY_ONLY" == true ]]; then
  bash "$ROOT/scripts/lib/verify-web-stage.sh" "$STAGE"
  exit 0
fi

if [[ "$SKIP_BUILD" != true ]]; then
  rm -rf "$STAGE"/*
  mkdir -p "$STAGE"

  if ! docker info >/dev/null 2>&1; then
    echo "ERROR: Docker is not running." >&2
    echo "" >&2
    echo "  Start Docker Desktop, then run:" >&2
    echo "    bash scripts/zip-web.sh" >&2
    echo "" >&2
    echo "  Or use GitHub Actions → Hostinger deploy zips → download chms-web-deploy" >&2
    exit 1
  fi

  echo "========================================"
  echo " ChMS Web — Docker build (linux/amd64)"
  echo "========================================"
  echo "  NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"
  echo "  NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME"
  echo ""

  docker run --rm --platform linux/amd64 \
    -v "$ROOT":/repo \
    -v "$ROOT/scripts":/scripts:ro \
    -v "$STAGE":/stage \
    -w /repo \
    -e CI=true \
    -e NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
    -e NEXT_PUBLIC_APP_NAME="$NEXT_PUBLIC_APP_NAME" \
    node:22-bookworm bash /scripts/build-web-stage.sh /stage
else
  bash "$ROOT/scripts/lib/verify-web-stage.sh" "$STAGE"
fi

echo ""
echo "==> Creating zip"
create_zip "$ZIP"

verify_zip "$ZIP"
write_deploy_cheatsheet

SIZE="$(du -sh "$ZIP" | cut -f1)"
echo ""
echo "========================================"
echo " Done"
echo "========================================"
echo "  Zip:      $ZIP ($SIZE)"
echo "  Guide:    $DEPLOY_TXT"
echo ""
echo "Next steps:"
echo "  1. hPanel → Websites → Node.js web app → Upload ZIP"
echo "  2. Upload: $ZIP"
echo "  3. Output directory: EMPTY | Entry: server.js | Node: 22"
echo "  4. Build: npm run build | Start: npm start"
echo "  5. Env: NODE_ENV=production HOSTNAME=0.0.0.0"
echo "  6. Disable CDN + Git auto-deploy → Restart"
echo ""
echo "  API URL in build: $NEXT_PUBLIC_API_URL"
echo "  Re-check zip:     bash scripts/zip-web.sh --check-zip"
