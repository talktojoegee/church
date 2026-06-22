#!/usr/bin/env bash
# Build + zip ChMS API for Hostinger upload (Linux amd64 via Docker).
#
# Usage:
#   bash scripts/zip-api.sh
#   bash scripts/zip-api.sh --skip-build   # zip existing /tmp/chms-api-stage
#
# Output: dist/chms-api-deploy.zip
# Upload to server, extract into public_html/apps/api (or app root), set dist/main.js entry.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="$ROOT/api"
OUT_DIR="$ROOT/dist"
STAGE="${STAGE:-/tmp/chms-api-stage}"
ZIP="$OUT_DIR/chms-api-deploy.zip"
SKIP_BUILD=false

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    -h|--help)
      echo "Usage: bash scripts/zip-api.sh [--skip-build]"
      exit 0
      ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

mkdir -p "$OUT_DIR"

if [[ "$SKIP_BUILD" != true ]]; then
  if ! docker info >/dev/null 2>&1; then
    echo "ERROR: Docker is not running."
    echo ""
    echo "  Option A — Build zips in GitHub (no Docker on your Mac):"
    echo "    Push to main → GitHub → Actions → 'Hostinger deploy zips'"
    echo "    Download chms-api-deploy / chms-web-deploy artifacts"
    echo ""
    echo "  Option B — Hostinger Git deploy (recommended):"
    echo "    hPanel → Node.js → connect repo, root api/ or web/"
    echo ""
    echo "  Option C — Fix Docker Desktop, then re-run this script"
    exit 1
  fi
  echo "==> Building API (linux/amd64) in Docker"
  docker run --rm --platform linux/amd64 \
    -v "$API":/app \
    -v "$ROOT/scripts":/scripts:ro \
    -v "$STAGE":/stage \
    -w /app \
    -e CI=true \
    node:22-bookworm bash /scripts/build-api-stage.sh /stage
fi

if [[ ! -f "$STAGE/dist/main.js" ]]; then
  echo "ERROR: $STAGE/dist/main.js missing — build failed"
  exit 1
fi

echo "==> Creating $ZIP"
rm -f "$ZIP"
(
  cd "$STAGE"
  zip -rq "$ZIP" . \
    -x "*.map" \
    -x "*/.turbo/*" \
    -x "*/test/*" \
    -x "*/src/*"
)

SIZE="$(du -sh "$ZIP" | cut -f1)"
echo "==> Done: $ZIP ($SIZE)"
echo "    Extract on server → set Node entry: dist/main.js"
echo "    Env: CORS_ORIGINS=https://paggglobal.org,https://www.paggglobal.org"
