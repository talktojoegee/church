# Deploying ChMS

| Platform | Guide |
|----------|--------|
| **Hostinger Business (two Node.js apps)** | [hostinger/DEPLOYMENT.md](./hostinger/DEPLOYMENT.md) |
| AWS EC2 + Docker | [aws/DEPLOYMENT.md](./aws/DEPLOYMENT.md) |
| Hostinger VPS + Docker | See below |

---

## Hostinger VPS — Docker (recommended)

Stack: **MySQL + NestJS API + Next.js + Caddy** (automatic HTTPS).

| URL | Service |
|-----|---------|
| `https://paggglobal.org` | `web` container |
| `https://api.paggglobal.org` | `api` container |

### 1. VPS setup (one time)

1. Create a Hostinger **VPS** (Ubuntu 22.04+).
2. Point DNS **A records** to the VPS IP:
   - `paggglobal.org`
   - `www.paggglobal.org`
   - `api.paggglobal.org`
3. SSH in and install Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# log out and back in
docker compose version
```

### 2. Clone the repo on the VPS

```bash
sudo mkdir -p /opt/chms
sudo chown $USER:$USER /opt/chms
git clone https://github.com/talktojoegee/church.git /opt/chms
cd /opt/chms
cp docker/.env.example docker/.env
nano docker/.env   # passwords, JWT secrets, SMTP, etc.
```

Generate secrets:

```bash
openssl rand -base64 48
```

### 3. Start production stack

```bash
cd /opt/chms
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env up -d --build
```

First deploy — seed the database:

```bash
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env \
  exec api sh -c 'cd /app && ./node_modules/.bin/tsx prisma/seed.ts'
```

### 4. Verify

```bash
docker compose -f docker/docker-compose.prod.yml ps
curl https://api.paggglobal.org/api/health
```

Open `https://paggglobal.org`.

### 5. Deploy updates from your Mac

```bash
cp deploy.env.example deploy.env   # DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH=/opt/chms
bash deploy-vps.sh
bash deploy-vps.sh --seed          # first time only
```

Or on the VPS manually:

```bash
cd /opt/chms && git pull && docker compose -f docker/docker-compose.prod.yml --env-file docker/.env up -d --build
```

### Useful commands

```bash
# Logs
docker compose -f docker/docker-compose.prod.yml logs -f api web caddy

# Restart
docker compose -f docker/docker-compose.prod.yml restart api web

# Stop
docker compose -f docker/docker-compose.prod.yml down
```

### Files

| File | Purpose |
|------|---------|
| `docker/docker-compose.prod.yml` | Production stack |
| `docker/Dockerfile.api` | NestJS image |
| `docker/Dockerfile.web` | Next.js image |
| `docker/Caddyfile` | Reverse proxy + SSL |
| `docker/.env` | Secrets (on VPS only) |

---

## Shared hosting (legacy — not recommended)

This guide also covers shared hosting. **VPS + Docker** is strongly recommended for a Next.js + NestJS stack with background jobs and two Node processes.

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

## GitHub deploy on Hostinger (shared hosting)

Hostinger’s auto-install uses **Corepack**, which often fails on shared hosting. Install **pnpm once over SSH**, then let Git run a custom build script.

### One-time SSH setup

```bash
export TMPDIR=$HOME/tmp
mkdir -p $TMPDIR
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc
pnpm --version
```

Create production `.env` in the repo root on the server (not committed to Git):

```bash
nano ~/domains/api.paggglobal.org/public_html/.env
```

Create uploads directory:

```bash
mkdir -p ~/domains/api.paggglobal.org/uploads
```

### hPanel → Git → connect GitHub

1. Open the site that holds the repo (e.g. `api.paggglobal.org`) → **Git** → connect your GitHub repo.
2. **Disable** default “install dependencies” if it runs `corepack` / `pnpm` automatically.
3. Set **Build command** to:

```bash
bash scripts/hostinger-deploy.sh
```

4. Add all production variables under **Node.js → Environment variables** (or keep a `.env` file on the server).

### Two Node.js apps (same repo, two domains)

After each deploy, restart **both** apps in hPanel:

| Domain | Application root | Startup file |
|--------|------------------|--------------|
| `api.paggglobal.org` | `apps/api` | `dist/main.js` |
| `paggglobal.org` | `apps/web/.next/standalone/apps/web` | `server.js` |

Web app env: `NEXT_PUBLIC_API_URL=https://api.paggglobal.org/api`

First deploy only (SSH):

```bash
cd ~/domains/api.paggglobal.org/public_html
pnpm db:seed
```

### Git deploy flow

```
GitHub push → Hostinger pulls → bash scripts/hostinger-deploy.sh → restart Node apps
```

### Hostinger `.builds` folder (esbuild EACCES)

If install fails with:

```
spawnSync .../esbuild/bin/esbuild EACCES
```

Hostinger runs builds inside `.builds/source/repository/`, which often has **`noexec`** — native binaries cannot run. **Do not build on Hostinger’s Git auto-deploy.**

**Recommended:** use **GitHub Actions** (`.github/workflows/build.yml`) to build on push, then deploy the artifact:

1. Push to `main` → Actions tab → download `chms-deploy` artifact
2. Or build locally: `pnpm build:prod`
3. Upload to server via SSH/FTP:
   - `apps/api/dist/` + API `node_modules` (production)
   - `apps/web/.next/standalone/`
   - `prisma/`, `.env`

**Alternative — SSH build in `public_html` (not `.builds`):**

```bash
cd ~/domains/api.paggglobal.org/public_html
git pull origin main
source ~/.bashrc
export TMPDIR=$HOME/tmp
bash scripts/hostinger-deploy.sh
```

Disable Hostinger’s automatic install/build in Git settings; only use git pull + manual script in `public_html`.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| 401 on all routes | Check `CORS_ORIGINS` includes your web URL |
| DB connection refused | Verify `DATABASE_URL`, allow remote IP in MySQL |
| Next.js 404 on assets | Copy `.next/static` into standalone folder |
| Email not sending | Configure SMTP vars; without them, emails are logged only (dev stub) |
| Prisma client missing | Run `pnpm db:generate` before build |
