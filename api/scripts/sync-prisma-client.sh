#!/usr/bin/env bash
# Copy generated .prisma/client (with enums + Linux engine) into pnpm runtime path.
set -euo pipefail

find_pnpm_nm() {
  local base="$1"
  local client_default
  client_default="$(find "$base" -path '*/node_modules/@prisma/client/default.js' -print -quit 2>/dev/null || true)"
  [[ -n "$client_default" ]] || return 1
  dirname "$(dirname "$(dirname "$client_default")")"
}

copy_prisma_client_tree() {
  local src="$1"
  local dst="$2"
  rm -rf "$dst"
  mkdir -p "$dst"
  while IFS= read -r -d '' file; do
    local rel="${file#"$src"/}"
    case "$rel" in
      ._*) continue ;;
      *.dylib) continue ;;
      *.node)
        case "$(basename "$rel")" in
          libquery_engine-*.so.node) ;;
          *) continue ;;
        esac
        ;;
    esac
    mkdir -p "$dst/$(dirname "$rel")"
    cp -a "$file" "$dst/$rel"
  done < <(find "$src" -type f -print0)
}

APP_DIR="${1:?Usage: sync-prisma-client.sh /path/to/target-app [source-app]}"
SOURCE_DIR="${2:-$APP_DIR}"

src_nm="$(find_pnpm_nm "$SOURCE_DIR")" || { echo "ERROR: @prisma/client not found in $SOURCE_DIR"; exit 1; }
dst_nm="$(find_pnpm_nm "$APP_DIR")" || { echo "ERROR: @prisma/client not found in $APP_DIR"; exit 1; }

if [[ ! -f "$src_nm/.prisma/client/index.js" ]]; then
  echo "ERROR: Missing .prisma/client in $SOURCE_DIR — run prisma generate first"
  exit 1
fi

copy_prisma_client_tree "$src_nm/.prisma" "$dst_nm/.prisma"
(
  cd "$APP_DIR"
  node -e "const e=require('@prisma/client').DepartmentMemberRole; if(!e||!e.HOD) process.exit(1)"
)
echo "==> Prisma client synced"
