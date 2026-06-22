#!/bin/sh
set -e
cd /app/api
echo "==> Applying database migrations"
/app/node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma
echo "==> Starting API"
exec node dist/main.js
