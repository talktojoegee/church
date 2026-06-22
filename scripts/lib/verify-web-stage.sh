#!/usr/bin/env bash
# Validate a Hostinger-ready Next.js standalone stage directory.
# Usage: bash scripts/lib/verify-web-stage.sh /path/to/stage
set -euo pipefail

STAGE="${1:?Usage: verify-web-stage.sh /path/to/stage}"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

warn() {
  echo "WARN: $*" >&2
}

[[ -d "$STAGE" ]] || fail "Stage directory not found: $STAGE"

echo "==> Verifying Hostinger stage: $STAGE"

# Required — runnable standalone app
[[ -f "$STAGE/server.js" ]] || fail "Missing server.js at stage root (do NOT deploy .next/server/ alone)"
[[ -d "$STAGE/node_modules" ]] || fail "Missing node_modules/ — standalone build incomplete"
[[ -d "$STAGE/.next" ]] || fail "Missing .next/ directory"

# Static assets (build:hostinger copies these into standalone)
if [[ ! -d "$STAGE/.next/static" ]]; then
  warn ".next/static/ missing — pages may load without CSS/JS. Re-run build:hostinger."
fi

# Common mistake: partial .next output uploaded instead of standalone zip
if [[ -d "$STAGE/server" && ! -f "$STAGE/server.js" ]]; then
  fail "Found server/ folder but no server.js — this looks like .next/server, not standalone"
fi
if [[ -f "$STAGE/BUILD_ID" && ! -f "$STAGE/server.js" ]]; then
  fail "Found BUILD_ID manifest without server.js — this is .next/ output, not a deploy zip"
fi

[[ -f "$STAGE/package.json" ]] || warn "package.json missing (will be added by build-web-stage.sh)"

# Size sanity check
nm_count="$(find "$STAGE/node_modules" -maxdepth 1 -mindepth 1 2>/dev/null | wc -l | tr -d ' ')"
[[ "${nm_count:-0}" -gt 0 ]] || fail "node_modules/ appears empty"

echo "==> Stage layout OK"
echo ""
echo "Top-level contents:"
(
  cd "$STAGE"
  ls -la
) | head -20

echo ""
echo "Required for Hostinger Node.js Web App upload:"
echo "  server.js  package.json  node_modules/  .next/  public/ (optional)"
