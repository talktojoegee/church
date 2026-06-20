#!/usr/bin/env bash
# Hostinger hPanel → Install command
set -euo pipefail
cd "$(dirname "$0")/.."
export TMPDIR="${TMPDIR:-${HOME:-/tmp}/tmp}"
mkdir -p "$TMPDIR"
pnpm install --ignore-scripts --frozen-lockfile 2>/dev/null || pnpm install --ignore-scripts
echo "==> Install complete"
