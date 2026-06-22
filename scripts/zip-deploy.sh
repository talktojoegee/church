#!/usr/bin/env bash
# Build and zip API + Web deploy bundles for Hostinger.
#
# Usage: bash scripts/zip-deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
bash "$ROOT/scripts/zip-api.sh"
bash "$ROOT/scripts/zip-web.sh"
echo ""
echo "==> Deploy zips ready in $ROOT/dist/"
ls -lh "$ROOT/dist/"/*.zip
