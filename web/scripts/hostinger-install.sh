#!/usr/bin/env bash
# Hostinger hPanel → Install command
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f src/shared/index.ts ]]; then
  echo "ERROR: web/src/shared is missing on the server."
  echo "  In hPanel → Git → Root directory must be: web"
  echo "  (Monorepo repo: talktojoegee/church, not the api folder)"
  exit 1
fi

export TMPDIR="${TMPDIR:-${HOME:-/tmp}/tmp}"
mkdir -p "$TMPDIR"
export CI=true

# strict-dep-builds=false: don't fail when sharp/unrs-resolver native builds are skipped
pnpm install --ignore-scripts --config.strict-dep-builds=false --frozen-lockfile \
  2>/dev/null \
  || pnpm install --ignore-scripts --config.strict-dep-builds=false
echo "==> Install complete"
