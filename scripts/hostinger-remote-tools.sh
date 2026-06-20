#!/usr/bin/env bash
# Helpers for migrate/seed on Hostinger (source from deploy.sh or run on server).
set -euo pipefail

hostinger_find_pnpm_store() {
  local pattern="$1"
  local base="${2:-.}"
  find "$base/node_modules/.pnpm" -maxdepth 1 -type d -name "${pattern}" -print -quit 2>/dev/null || true
}

hostinger_copy_pnpm_into() {
  local dest="$1"
  shift
  mkdir -p "$dest"
  for pattern in "$@"; do
    local store
    store="$(hostinger_find_pnpm_store "$pattern" "${PNPM_SEARCH_ROOT:-.}")"
    if [[ -n "$store" && -d "$store/node_modules" ]]; then
      cp -aL "$store/node_modules/." "$dest/"
    fi
  done
}

hostinger_prisma() {
  if [[ -x ./node_modules/.bin/prisma ]] \
    && NODE_PATH="$PWD/node_modules" node -e "require('@prisma/engines'); require('@prisma/debug')" >/dev/null 2>&1; then
    ./node_modules/.bin/prisma "$@"
    return
  fi

  local store
  store="$(hostinger_find_pnpm_store 'prisma@*' apps/api)"
  if [[ -z "$store" ]]; then
    store="$(hostinger_find_pnpm_store 'prisma@*' .)"
  fi
  if [[ -n "$store" ]]; then
    NODE_PATH="$store/node_modules" node "$store/node_modules/prisma/build/index.js" "$@"
    return
  fi

  echo "ERROR: prisma CLI not found (broken node_modules — redeploy or run hostinger-server-migrate.sh)"
  exit 1
}

hostinger_ensure_seed_deps() {
  mkdir -p node_modules/@chms/shared
  if [[ ! -f node_modules/@chms/shared/package.json ]]; then
    cp -a packages/shared/dist packages/shared/package.json node_modules/@chms/shared/
  fi
  PNPM_SEARCH_ROOT="${1:-apps/api}"
  hostinger_copy_pnpm_into node_modules 'argon2@*'
}

hostinger_sync_api_prisma_client() {
  hostinger_prisma generate --schema=prisma/schema.prisma
  local client_dir
  client_dir="$(find apps/api/node_modules/.pnpm -path '*/node_modules/@prisma/client/default.js' -print -quit 2>/dev/null || true)"
  if [[ -z "$client_dir" ]]; then
    echo "WARN: Could not find API @prisma/client pnpm path"
    return
  fi
  local pnpm_nm
  pnpm_nm="$(dirname "$(dirname "$(dirname "$client_dir")")")"
  mkdir -p "$pnpm_nm/.prisma" "$pnpm_nm/@prisma/client"
  cp -aL node_modules/.prisma/. "$pnpm_nm/.prisma/"
  cp -aL node_modules/@prisma/client/. "$pnpm_nm/@prisma/client/"
}

hostinger_tsx() {
  export PATH="$PWD/node_modules/.bin:$PWD/tools/node_modules/.bin:$PATH"
  if [[ -x ./node_modules/.bin/tsx ]] \
    && NODE_PATH="$PWD/node_modules" node -e "require('esbuild')" >/dev/null 2>&1; then
    ./node_modules/.bin/tsx "$@"
    return
  fi
  if [[ -x ./tools/node_modules/.bin/tsx ]]; then
    NODE_PATH="$PWD/node_modules:$PWD/tools/node_modules" ./tools/node_modules/.bin/tsx "$@"
    return
  fi

  local store
  store="$(hostinger_find_pnpm_store 'tsx@*' .)"
  if [[ -n "$store" ]]; then
    NODE_PATH="$PWD/node_modules:$store/node_modules" node "$store/node_modules/tsx/dist/cli.mjs" "$@"
    return
  fi

  echo "ERROR: tsx not found"
  exit 1
}

hostinger_install_tsx() {
  if [[ -x ./tools/node_modules/.bin/tsx ]]; then
    return
  fi
  echo "==> Installing tsx into tools/ (keeps Prisma node_modules intact)"
  mkdir -p tools
  npm install tsx@4.19.2 --prefix tools --omit=dev --no-package-lock --no-audit --no-fund
}
