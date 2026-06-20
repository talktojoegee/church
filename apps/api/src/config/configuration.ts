export interface AppConfig {
  env: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
    cookieDomain: string;
  };
  superAdmin: {
    email: string;
    password: string;
    name: string;
  };
  org: {
    churchName: string;
    currency: string;
    locale: string;
    timezone: string;
  };
  upload: {
    dir: string;
    maxMb: number;
  };
}

export default (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  // Hostinger Node.js apps inject PORT; API_PORT is used on VPS/Docker.
  port: parseInt(process.env.PORT ?? process.env.API_PORT ?? '4000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    cookieDomain: process.env.COOKIE_DOMAIN ?? '',
  },
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL ?? 'admin@church.local',
    password: process.env.SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!',
    name: process.env.SUPER_ADMIN_NAME ?? 'Super Admin',
  },
  org: {
    churchName: process.env.DEFAULT_CHURCH_NAME ?? 'My Church',
    currency: process.env.DEFAULT_CURRENCY ?? 'NGN',
    locale: process.env.DEFAULT_LOCALE ?? 'en-NG',
    timezone: process.env.DEFAULT_TIMEZONE ?? 'Africa/Lagos',
  },
  upload: {
    dir: process.env.UPLOAD_DIR ?? './uploads',
    maxMb: parseInt(process.env.MAX_UPLOAD_MB ?? '50', 10),
  },
});
