import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

function parseDatabaseUrl(raw: string) {
  const url = new URL(raw);
  const database = url.pathname.replace(/^\//, '');
  if (!database) {
    throw new Error('DATABASE_URL is missing a database name');
  }
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: Number(process.env.DATABASE_CONNECTION_LIMIT ?? 2),
  };
}

function normalizeDatabaseUrl(raw: string): string {
  let url = raw.trim();
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1);
  }
  return url;
}

/** JS MariaDB driver — avoids Prisma Rust engine panics on Hostinger shared hosting. */
export function createPrismaClient(): PrismaClient {
  const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL ?? '');
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const adapter = new PrismaMariaDb(parseDatabaseUrl(databaseUrl));
  return new PrismaClient({ adapter });
}
