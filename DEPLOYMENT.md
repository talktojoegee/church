# Deploying ChMS on Hostinger

This guide covers two deployment targets. **VPS is strongly recommended** for a Next.js + NestJS stack with background jobs and two Node processes.

---

## Prerequisites (both targets)

1. MySQL 8 database (Hostinger MySQL or remote)
2. Node.js 20+ on the server
3. Domain + SSL (Let's Encrypt via hPanel or Certbot on VPS)

## 1. Build locally or on the server

```bash
pnpm install
pnpm --filter @chms/shared build
cp .env.example .env   # configure for production
pnpm db:generate
pnpm db:deploy         # apply migrations (production)
pnpm db:seed           # first run only
pnpm build             # builds api + web
```

### Production `.env` essentials

```env
DATABASE_URL="mysql://USER:PASS@localhost:3306/chms"
NODE_ENV=production
API_PORT=4000
CORS_ORIGINS="https://yourdomain.com"
NEXT_PUBLIC_API_URL="https://yourdomain.com/api"
JWT_ACCESS_SECRET="long-random-string"
JWT_REFRESH_SECRET="another-long-random-string"
SMTP_HOST="smtp.hostinger.com"
SMTP_USER="no-reply@yourdomain.com"
SMTP_PASSWORD="your-mail-password"
MAIL_FROM="My Church <no-reply@yourdomain.com>"
```

---

## Option A — Hostinger VPS (recommended)

### Stack
- **Nginx** — reverse proxy + static files
- **PM2** — process manager for API + web
- **MySQL** — on VPS or Hostinger remote DB

### Steps

1. Upload/clone the repo to `/var/www/chms`
2. Run the build steps above
3. Start with PM2:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

4. Configure Nginx (`/etc/nginx/sites-available/chms`):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Next.js frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # NestJS API
    location /api {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

5. Enable site + SSL:

```bash
sudo ln -s /etc/nginx/sites-available/chms /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
# Use Certbot or hPanel SSL
```

---

## Option B — Hostinger Business Shared Hosting

Shared hosting supports **one Node.js app per domain** via hPanel → **Advanced → Setup Node.js App**. Running both API and Next.js SSR as separate apps is fragile. Recommended approach:

### Architecture on shared hosting

| Component | How to run |
|---|---|
| **API** | Node.js App → `apps/api/dist/main.js` on port assigned by Hostinger |
| **Web** | Second subdomain as Node.js App → `apps/web/.next/standalone/apps/web/server.js` |
| **MySQL** | Hostinger MySQL (remote `DATABASE_URL`) |
| **Static assets** | Copied automatically by Next standalone build |

### API Node app (hPanel)

- **Application root:** `apps/api`
- **Application startup file:** `dist/main.js`
- **Node version:** 20.x
- Set all `.env` variables in hPanel environment settings

### Web Node app (subdomain e.g. `app.yourdomain.com`)

After `pnpm --filter @chms/web build`, the standalone server lives at:

```
apps/web/.next/standalone/apps/web/server.js
```

- **Application root:** `apps/web/.next/standalone/apps/web`
- **Startup file:** `server.js`
- Set `PORT` to Hostinger-assigned port
- Set `NEXT_PUBLIC_API_URL=https://yourdomain.com/api`

Copy static assets (required for standalone):

```bash
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
cp -r apps/web/public apps/web/.next/standalone/apps/web/public 2>/dev/null || true
```

Point your main domain API path via `.htaccess` proxy or use API subdomain (`api.yourdomain.com`).

---

## Database migrations on deploy

Always run after pulling new code:

```bash
pnpm db:deploy
```

Never use `db:migrate` (dev-only shadow DB) in production.

---

## Updating

```bash
git pull
pnpm install
pnpm --filter @chms/shared build
pnpm db:deploy
pnpm build
pm2 restart all   # VPS
# or restart Node apps in hPanel (shared)
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| 401 on all routes | Check `CORS_ORIGINS` includes your web URL |
| DB connection refused | Verify `DATABASE_URL`, allow remote IP in MySQL |
| Next.js 404 on assets | Copy `.next/static` into standalone folder |
| Email not sending | Configure SMTP vars; without them, emails are logged only (dev stub) |
| Prisma client missing | Run `pnpm db:generate` before build |
