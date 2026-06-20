#!/usr/bin/env node
/** Copy compiled shared package into pnpm's linked copy (file: deps are snapshotted at install). */
const fs = require('node:fs');
const path = require('node:path');

const src = path.join(__dirname, '../src/shared/dist');
const pkg = require.resolve('@chms/shared/package.json');
const dest = path.join(path.dirname(pkg), 'dist');

if (!fs.existsSync(src)) {
  console.error('ERROR: src/shared/dist missing — run node scripts/build-shared.js first');
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log('==> Synced @chms/shared dist →', dest);
