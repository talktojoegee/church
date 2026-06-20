#!/bin/sh
set -e
cd /app
echo "==> Applying database migrations"
./node_modules/.bin/prisma migrate deploy
cd /app/apps/api
echo "==> Starting API"
exec node dist/main.js
