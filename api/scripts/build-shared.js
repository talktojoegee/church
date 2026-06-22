#!/usr/bin/env node
/** Compile @chms/shared (monorepo packages/shared). */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const sharedRoot = path.join(__dirname, '../../packages/shared');
const tsc = require.resolve('typescript/bin/tsc', { paths: [path.join(__dirname, '..')] });
const tsconfig = path.join(sharedRoot, 'tsconfig.json');

const result = spawnSync(process.execPath, [tsc, '-p', tsconfig], {
  stdio: 'inherit',
  cwd: sharedRoot,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
console.log('==> Built @chms/shared');
