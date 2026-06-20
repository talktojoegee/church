# ChMS API (NestJS)

Standalone backend for [Power And Glory Generation](https://paggglobal.org). Deploy this repo to **api.paggglobal.org**.

## Local development

```bash
pnpm install
cp .env.example .env   # edit DATABASE_URL, JWT secrets, etc.
pnpm db:generate
pnpm db:migrate
pnpm db:seed           # optional first run
pnpm dev
```

API: http://localhost:4000/api

## Hostinger Git deploy (hPanel)

Create a **Node.js app** for `api.paggglobal.org` and connect this GitHub repo.

| Setting | Value |
|---------|--------|
| Framework | NestJS |
| Branch | `main` |
| Node version | **22.x** |
| Root directory | `./` |
| Package manager | **pnpm** |
| Install command | `bash scripts/hostinger-install.sh` |
| Build command | `pnpm run build` |
| Output directory | `dist` |
| Entry file | `main.js` |

### Environment variables (hPanel → Environment variables)

Copy from `hostinger.env.example`. Minimum:

```env
DATABASE_URL=mysql://USER:PASS@127.0.0.1:3306/DB
CORS_ORIGINS=https://paggglobal.org,https://www.paggglobal.org
COOKIE_DOMAIN=.paggglobal.org
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
NODE_ENV=production
```

Do **not** set `DATABASE_URL` in hPanel if you also use a `.env` file — prefer hPanel env vars only.

### After deploy

1. **Turn off CDN** for `api.paggglobal.org` (Performance → CDN → Off)
2. Run migrations from your Mac (SSH tunnel): see `scripts/migrate-hostinger.sh`
3. Test: `curl https://api.paggglobal.org/api/health`

## Migrations from Mac

```bash
# Edit scripts/migrate-hostinger.sh deploy.env paths, then:
bash scripts/migrate-hostinger.sh
```

## Separate GitHub repo

This folder is designed to be its **own repository**. To split:

```bash
cd api
git init
git remote add origin git@github.com:YOU/chms-api.git
git add .
git commit -m "Initial API"
git push -u origin main
```

Then point Hostinger `api.paggglobal.org` at `chms-api`.
