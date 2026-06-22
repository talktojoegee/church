# Church Management System (ChMS)

**pnpm monorepo** — API, Web, shared types, and E2E tests in one repo.

| Package | Path | Deploy to |
|---------|------|-----------|
| **API** | [`api/`](api/) | `api.paggglobal.org` |
| **Web** | [`web/`](web/) | `paggglobal.org` |
| **Shared** | [`packages/shared/`](packages/shared/) | (workspace library) |
| **E2E** | [`e2e/`](e2e/) | (local / CI only) |
| **Mobile** | [`mobile/`](mobile/) | App stores (Flutter) |

## Quick start

```bash
pnpm install

# Terminal 1 — MySQL + API
docker compose up -d
cp api/.env.example api/.env   # edit if needed
pnpm db:migrate
pnpm db:seed
pnpm dev:api

# Terminal 2 — Web
echo 'NEXT_PUBLIC_API_URL=http://localhost:4000/api' > web/.env.local
pnpm dev:web
```

- API: http://localhost:4000/api  
- Web: http://localhost:3000  

## Monorepo scripts (root)

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace packages |
| `pnpm dev` | API + Web in parallel |
| `pnpm build` | Build shared, API, and Web |
| `pnpm e2e` | Full stack E2E (Docker MySQL + API smoke + Playwright) |
| `pnpm db:migrate` | Apply Prisma migrations |
| `pnpm db:seed` | Seed database |

## Hostinger Git deploy

Deploy from this **single repo** with different root directories per app:

### API (`api.paggglobal.org`)

| Setting | Value |
|---------|--------|
| Root directory | **`api`** |
| Install | `bash scripts/hostinger-install.sh` |
| Build | `pnpm run build` |
| Output | `dist` |
| Entry | `main.js` |

Install script runs `pnpm install` from **monorepo root** (parent of `api/`).

### Web (`paggglobal.org`)

| Setting | Value |
|---------|--------|
| Root directory | **`web`** |
| Install | `bash scripts/hostinger-install.sh` |
| Build | `pnpm run build:hostinger` |
| Output | `.next/standalone` |
| Entry | `server.js` |

See [`api/README.md`](api/README.md) and [`web/README.md`](web/README.md) for env vars.

### Zip deploy (alternative)

```bash
bash scripts/zip-api.sh
bash scripts/zip-web.sh
```

## AWS deploy (EC2 + RDS + Docker)

See **[`aws/SETUP.md`](aws/SETUP.md)** for your `paggglobal` instance (`32.196.184.5`) and RDS `chms`.

```bash
cp deploy.env.aws.example deploy.env
cp docker/.env.aws.example docker/.env   # edit DATABASE_URL, JWT secrets
bash deploy-aws.sh --setup               # first time
bash deploy-aws.sh --seed                # seed admin user
bash deploy-aws.sh                       # routine deploy
```

## Local development

```bash
# All packages
pnpm install

# Shared library
pnpm build:shared

# API only
cd api && pnpm dev

# Web only  
cd web && pnpm dev
```

## E2E tests

```bash
bash scripts/e2e.sh
```

Starts MySQL (Docker), migrates + seeds API, runs API smoke tests and Playwright public-page tests.

## Mobile

```bash
cd mobile && flutter pub get && flutter run
```
