import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** Strip quotes and trailing slashes so env + browser Origin match reliably. */
export function normalizeOrigin(value: string): string {
  let origin = value.trim();
  if (
    (origin.startsWith('"') && origin.endsWith('"')) ||
    (origin.startsWith("'") && origin.endsWith("'"))
  ) {
    origin = origin.slice(1, -1);
  }
  return origin.replace(/\/+$/, '');
}

export function parseCorsOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(',').map(normalizeOrigin).filter(Boolean))];
}

export function createCorsOptions(allowedOrigins: string[]): CorsOptions {
  const allowed = new Set(allowedOrigins.map(normalizeOrigin));

  return {
    origin: (origin, callback) => {
      // Same-origin, curl, health probes — no Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalized = normalizeOrigin(origin);
      if (allowed.has(normalized)) {
        // Echo the request origin (required when credentials: true).
        callback(null, origin);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Origin',
    ],
    exposedHeaders: ['Content-Disposition'],
    optionsSuccessStatus: 204,
    preflightContinue: false,
  };
}
