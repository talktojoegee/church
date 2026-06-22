#!/usr/bin/env node
/**
 * Sync compiled @chms/shared dist into pnpm's linked package copy.
 * Skipped when workspace link already points at packages/shared (monorepo).
 */
const fs = require('node:fs');
const path = require('node:path');

const src = path.resolve(__dirname, '../../packages/shared/dist');
const pkg = require.resolve('@chms/shared/package.json');
const dest = path.resolve(path.dirname(pkg), 'dist');

if (!fs.existsSync(src)) {
  console.error('ERROR: packages/shared/dist missing — run: pnpm --filter @chms/shared build');
  process.exit(1);
}

if (src === dest || fs.realpathSync(src) === fs.realpathSync(dest)) {
  console.log('==> @chms/shared dist OK (workspace package)');
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log('==> Synced @chms/shared dist →', dest);
