#!/usr/bin/env bash
# Build a Linux deploy bundle on Mac using Docker (for Hostinger upload).
# Usage: bash scripts/build-linux-docker.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OUTPUT="${ROOT}/../chms-deploy.tar.gz"
OUT_DIR="$(dirname "$OUTPUT")"
rm -f "$OUTPUT"

retry() {
  local attempt=1
  local max="${RETRY_MAX:-3}"
  local delay="${RETRY_DELAY:-8}"
  until "$@"; do
    if (( attempt >= max )); then
      echo "ERROR: Command failed after ${max} attempts: $*"
      return 1
    fi
    echo "WARN: Command failed (attempt ${attempt}/${max}), retrying in ${delay}s..."
    sleep "$delay"
    attempt=$((attempt + 1))
    delay=$((delay * 2))
  done
}

echo "==> Building in node:22-bookworm (linux/amd64 for Hostinger x86 servers)"
retry docker run --rm --platform linux/amd64 \
  -v "$ROOT":/app \
  -v chms-pnpm-store:/pnpm-store \
  -v "$OUT_DIR":/out \
  -w /app \
  -e CI=true \
  -e PNPM_HOME=/pnpm \
  -e PATH=/pnpm:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  -e NPM_CONFIG_FETCH_RETRIES=5 \
  -e NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
  -e NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
  -e NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.paggglobal.org/api}" \
  -e NEXT_PUBLIC_APP_NAME="${NEXT_PUBLIC_APP_NAME:-Power And Glory Generation}" \
  -e NEXT_BUILD_SKIP_REMOTE=1 \
  node:22-bookworm bash -c '
    set -euo pipefail

    retry_cmd() {
      local attempt=1
      local max=3
      local delay=8
      until "$@"; do
        if (( attempt >= max )); then
          echo "ERROR: Command failed after ${max} attempts: $*"
          return 1
        fi
        echo "WARN: Command failed (attempt ${attempt}/${max}), retrying in ${delay}s..."
        sleep "$delay"
        attempt=$((attempt + 1))
        delay=$((delay * 2))
      done
    }

    mkdir -p /pnpm /pnpm-store
    export PNPM_HOME=/pnpm
    export PATH="/pnpm:$PATH"

    if ! command -v pnpm >/dev/null; then
      echo "==> Installing pnpm 11.8.0"
      retry_cmd npm install -g pnpm@11.8.0
    fi
    pnpm --version

    rm -rf node_modules apps/*/node_modules packages/*/node_modules

    echo "==> Installing dependencies"
    retry_cmd pnpm install --frozen-lockfile --store-dir /pnpm-store

    echo "==> Production build"
    pnpm build:prod

    echo "==> Slim Hostinger package"
    bash scripts/package-hostinger.sh /tmp/chms-hostinger-stage

    echo "==> Compressing tarball"
    tar -czf /out/chms-deploy.tar.gz -C /tmp/chms-hostinger-stage .
  '

echo "==> Done: $OUTPUT"
echo "    Upload: scp $OUTPUT u421975600@YOUR_HOST:~/domains/api.paggglobal.org/"
