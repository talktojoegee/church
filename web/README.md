# ChMS Web (Next.js)

Standalone frontend for [Power And Glory Generation](https://paggglobal.org). Deploy this repo to **paggglobal.org**.

## Local development

```bash
pnpm install
echo 'NEXT_PUBLIC_API_URL=http://localhost:4000/api' > .env.local
pnpm dev
```

Web: http://localhost:3000

## Hostinger Git deploy (hPanel)

Create a **Node.js app** for `paggglobal.org` and connect this GitHub repo.

| Setting | Value |
|---------|--------|
| Framework | Next.js |
| Branch | `main` |
| Node version | **22.x** |
| Root directory | `web` |
| Package manager | **pnpm** |
| Install command | `bash scripts/hostinger-install.sh` |
| Build command | `pnpm run build:hostinger` |
| Output directory | `.next/standalone` |
| Entry file | `server.js` |

### Environment variables (build-time)

Set in hPanel **before** build:

```env
NEXT_PUBLIC_API_URL=https://api.paggglobal.org/api
NEXT_PUBLIC_APP_NAME=Power And Glory Generation
NODE_ENV=production
```

### After first build

If static assets 404, copy them into standalone (one-time or add to build):

```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

Or use build command:

```bash
pnpm run build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public
```

### Test

```bash
curl -I https://paggglobal.org
```

## Separate GitHub repo

```bash
cd web
git init
git remote add origin git@github.com:YOU/chms-web.git
git add .
git commit -m "Initial web"
git push -u origin main
```

Point Hostinger `paggglobal.org` at `chms-web`.
