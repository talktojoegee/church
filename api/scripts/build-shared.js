#!/usr/bin/env node
/** Compile @chms/shared without invoking pnpm (Hostinger build has no pnpm in PATH). */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const apiRoot = path.join(__dirname, '..');
const tsc = require.resolve('typescript/bin/tsc');
const tsconfig = path.join(apiRoot, 'src/shared/tsconfig.json');

const result = spawnSync(process.execPath, [tsc, '-p', tsconfig], {
  stdio: 'inherit',
  cwd: apiRoot,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
console.log('==> Built @chms/shared');
