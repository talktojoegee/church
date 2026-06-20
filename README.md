# Church Management System (ChMS)

Three **standalone apps** — no monorepo. Deploy API and Web separately on Hostinger.

| App | Folder | Deploy to | Stack |
|-----|--------|-----------|-------|
| **API** | [`api/`](api/) | `api.paggglobal.org` | NestJS + Prisma + MySQL |
| **Web** | [`web/`](web/) | `paggglobal.org` | Next.js 15 |
| **Mobile** | [`mobile/`](mobile/) | App stores | Flutter |

## Hostinger deploy (recommended)

Each app has its own `README.md` with exact hPanel settings:

1. **Create two Node.js apps** in hPanel (one per domain)
2. **Connect separate GitHub repos** (see below) or use subfolder deploy with root directory `./` after splitting repos
3. Follow [`api/README.md`](api/README.md) for NestJS settings
4. Follow [`web/README.md`](web/README.md) for Next.js settings
5. **Disable CDN** on `api.paggglobal.org`
6. Run migrations from Mac: `cd api && bash scripts/migrate-hostinger.sh`

## Split into separate GitHub repos

For the cleanest Hostinger Git integration, publish each folder as its own repo:

```bash
# API
cd api && git init && git add . && git commit -m "Initial API"
git remote add origin git@github.com:YOU/chms-api.git && git push -u origin main

# Web
cd web && git init && git add . && git commit -m "Initial web"
git remote add origin git@github.com:YOU/chms-web.git && git push -u origin main

# Mobile (optional)
cd mobile && git init && ...
```

Point Hostinger:
- `api.paggglobal.org` → **chms-api** repo
- `paggglobal.org` → **chms-web** repo

## Legacy / optional

- **Docker VPS / AWS:** `docker/`, `aws/` (optional; not required for Hostinger shared hosting)
- **SSH tarball deploy:** deprecated — use Git deploy per app instead

## Local development

```bash
# Terminal 1 — API
cd api && pnpm install && cp .env.example .env && pnpm dev

# Terminal 2 — Web
cd web && pnpm install && echo 'NEXT_PUBLIC_API_URL=http://localhost:4000/api' > .env.local && pnpm dev

# Mobile
cd mobile && flutter pub get && flutter run
```
