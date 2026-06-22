#!/usr/bin/env bash
# Build API deploy stage directory (Linux). Used by GitHub Actions and zip scripts.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -d "$SCRIPT_DIR/../api" ]]; then
  API="$(cd "$SCRIPT_DIR/../api" && pwd)"
else
  # Docker: api/ is mounted at /app with -w /app
  API="$(pwd)"
fi
STAGE="${1:?Usage: build-api-stage.sh /path/to/stage}"

mkdir -p "$STAGE"
# Stage may be a Docker volume mount — clear contents, not the mount point
find "$STAGE" -mindepth 1 -delete 2>/dev/null || rm -rf "$STAGE"/* "$STAGE"/.[!.]* "$STAGE"/..?* 2>/dev/null || true

cd "$API"
if ! command -v pnpm >/dev/null; then
  npm install -g pnpm@11.8.0
fi

pnpm install --frozen-lockfile 2>/dev/null || pnpm install
pnpm run build

DEPLOY_DIR="$(mktemp -d)"
trap 'rm -rf "$DEPLOY_DIR"' EXIT
pnpm --filter=. deploy --prod --legacy "$DEPLOY_DIR"

cp -a "$DEPLOY_DIR"/. "$STAGE"/
cp -a "$API/dist" "$STAGE/dist"
cp -a prisma "$STAGE/prisma"
mkdir -p "$STAGE/tmp"
bash "$API/scripts/sync-prisma-client.sh" "$STAGE" "$API"

echo "==> API stage ready at $STAGE"
