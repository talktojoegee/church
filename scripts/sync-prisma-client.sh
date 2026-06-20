#!/usr/bin/env bash
# Copy a fully generated Prisma client (.prisma/client) into an API pnpm runtime path.
set -euo pipefail

find_pnpm_nm() {
  local base="$1"
  local client_default
  client_default="$(find "$base" -path '*/node_modules/@prisma/client/default.js' -print -quit 2>/dev/null || true)"
  if [[ -z "$client_default" ]]; then
    return 1
  fi
  dirname "$(dirname "$(dirname "$client_default")")"
}

verify_prisma_enums() {
  local api_dir="$1"
  (
    cd "$api_dir"
    node -e "const e=require('@prisma/client').DepartmentMemberRole; if(!e||!e.HOD){console.error('Prisma enums missing'); process.exit(1)}"
  )
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
      # Keep query engine binaries; skip other native addons (macOS build artifacts).
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

sync_prisma_client() {
  local src_base="$1"
  local dst_api_dir="$2"
  local src_nm dst_nm

  src_nm="$(find_pnpm_nm "$src_base")" || {
    echo "ERROR: Could not find generated @prisma/client in: $src_base"
    return 1
  }
  dst_nm="$(find_pnpm_nm "$dst_api_dir")" || {
    echo "ERROR: Could not find API @prisma/client in: $dst_api_dir"
    return 1
  }

  if [[ ! -f "$src_nm/.prisma/client/index.js" ]]; then
    echo "ERROR: Missing source .prisma/client — run: pnpm db:generate"
    return 1
  fi

  copy_prisma_client_tree "$src_nm/.prisma" "$dst_nm/.prisma"
  verify_prisma_enums "$dst_api_dir"
}
