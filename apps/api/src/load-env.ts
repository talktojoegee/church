import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

/** Load .env before Nest/Prisma init. override=true beats hPanel-injected env vars. */
const envPaths = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
  resolve(__dirname, '../.env'),
  resolve(__dirname, '../../../.env'),
];

const loaded = new Set<string>();
for (const path of envPaths) {
  if (loaded.has(path) || !existsSync(path)) continue;
  loaded.add(path);
  config({ path, override: true });
}
