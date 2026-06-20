# Deploy ChMS on Hostinger Business (two Node.js apps)

Run the **NestJS API** and **Next.js web** as **two separate Node.js applications** on Hostinger Web Hosting — no VPS required.

| URL | App | Startup file |
|-----|-----|--------------|
| `https://api.paggglobal.org` | NestJS API | `dist/main.js` |
| `https://paggglobal.org` | Next.js (public site + admin) | `server.js` |

Both apps use the **same built codebase**; hPanel points each domain at a different folder inside it.

---

## Why not build on Hostinger?

Hostinger’s Git auto-deploy and `.builds/` folder often break **pnpm**, **Corepack**, and **esbuild** (`EACCES`, `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`).

**Build elsewhere, upload the result:**

| Method | Command |
|--------|---------|
| **From your Mac (recommended)** | `bash deploy.sh` |
| **GitHub Actions** | Push to `main` → download `chms-deploy` artifact → upload |
| **Manual Docker build** | `bash scripts/build-linux-docker.sh` then upload tarball |

Do **not** rely on Hostinger’s default “install dependencies” in Git settings.

### Deploy bundle size (~240 MB compressed)

`scripts/package-hostinger.sh` packages only what Hostinger needs:

| Included | Excluded |
|----------|----------|
| API `dist/` + production runtime deps (~440 MB) | TypeScript, ESLint, Jest, Turbo |
| Next.js **standalone** web (~94 MB) | Full `apps/web/.next/` build cache |
| Prisma schema + migrate/seed tools (~290 MB) | `apps/mobile`, source `.ts` files, docs |

Typical tarball: **~240 MB** (was ~1.2 GB with the full monorepo).

---

## Architecture

```
paggglobal.org          → Node.js app → apps/web/.next/standalone/apps/web/server.js
api.paggglobal.org      → Node.js app → apps/api/dist/main.js
Hostinger MySQL         → DATABASE_URL in API .env
~/domains/api.../uploads → file uploads (persistent, outside public_html)
```

---

## Step 1 — hPanel: domains & SSL

1. **Domains** → `paggglobal.org` → ensure nameservers point to Hostinger.
2. **Subdomains** → create `api` → `api.paggglobal.org`.
3. **SSL** → enable **Free SSL** for `paggglobal.org` and `api.paggglobal.org`.

---

## Step 2 — MySQL database

1. **Databases** → **MySQL Databases**.
2. Create database + user (e.g. `u421975600_chms`).
3. Note credentials for `DATABASE_URL`:

```env
DATABASE_URL="mysql://u421975600_chms:YOUR_PASSWORD@localhost:3306/u421975600_chms"
```

---

## Step 3 — SSH one-time setup

hPanel → **Advanced** → **SSH Access** → enable.

```bash
ssh u421975600@YOUR-SSH-HOST.hostinger.com

export TMPDIR=$HOME/tmp
mkdir -p $TMPDIR ~/.bashrc.d
curl -fsSL https://get.pnpm.io/install.sh | sh -
echo 'export PNPM_HOME="$HOME/.local/share/pnpm"' >> ~/.bashrc
echo 'export PATH="$PNPM_HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

mkdir -p ~/domains/api.paggglobal.org/uploads
```

Create production `.env` on the server (never commit this):

```bash
nano ~/domains/api.paggglobal.org/public_html/.env
```

Use values like:

```env
NODE_ENV=production
DATABASE_URL="mysql://u421975600_chms:YOUR_PASSWORD@localhost:3306/u421975600_chms"

API_PREFIX=api
CORS_ORIGINS="https://paggglobal.org,https://www.paggglobal.org"
COOKIE_DOMAIN=.paggglobal.org

JWT_ACCESS_SECRET="paste-openssl-rand-base64-48"
JWT_REFRESH_SECRET="paste-another-secret"

SUPER_ADMIN_EMAIL=admin@paggglobal.org
SUPER_ADMIN_PASSWORD=YourSecurePassword
SUPER_ADMIN_NAME=Super Admin
DEFAULT_CHURCH_NAME=Power And Glory Generation

UPLOAD_DIR=/home/u421975600/domains/api.paggglobal.org/uploads
MAX_UPLOAD_MB=50

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=no-reply@paggglobal.org
SMTP_PASSWORD=your-mail-password
MAIL_FROM="Power And Glory Generation <no-reply@paggglobal.org>"

PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=
```

Generate secrets on your Mac: `openssl rand -base64 48`

> `NEXT_PUBLIC_*` vars are baked in at **build time** on your Mac / GitHub Actions, not read from this file at runtime for the web app.

---

## Step 4 — Deploy from your Mac

```bash
cp deploy.env.example deploy.env
# Edit deploy.env with Hostinger SSH host, user, key
bash deploy.sh --seed    # first deploy only
bash deploy.sh           # later updates
```

`deploy.sh` builds a Linux bundle (via Docker), uploads it, extracts to **both** domain folders, runs migrations, and preserves `.env`.

### `deploy.env` example

```env
DEPLOY_HOST=fr-int-web1649.hostinger.com
DEPLOY_USER=u421975600
DEPLOY_SSH_KEY=~/.ssh/id_ed25519
DEPLOY_API_REMOTE_DIR=domains/api.paggglobal.org
DEPLOY_WEB_REMOTE_DIR=domains/paggglobal.org

NEXT_PUBLIC_API_URL=https://api.paggglobal.org/api
NEXT_PUBLIC_APP_NAME=Power And Glory Generation
```

---

## Step 5 — Create two Node.js apps in hPanel

Do this **after** the first `deploy.sh` (files must exist on the server).

### API — `api.paggglobal.org`

hPanel → **Websites** → `api.paggglobal.org` → **Advanced** → **Node.js**

| Setting | Value |
|---------|--------|
| Node version | **20.x** |
| Application mode | Production |
| Application root | `public_html/apps/api` |
| Application startup file | `dist/main.js` |

**Environment variables** (hPanel or rely on `public_html/.env` if your plan loads it):

- Do **not** set `API_PORT` — Hostinger injects `PORT` automatically.
- Set `NODE_ENV=production` and other secrets if not using `.env`.

Click **Create** / **Save** → **Restart**.

### Web — `paggglobal.org`

| Setting | Value |
|---------|--------|
| Node version | **20.x** |
| Application mode | Production |
| Application root | `public_html/apps/web/.next/standalone/apps/web` |
| Application startup file | `server.js` |

Hostinger also injects `PORT` for the web app.

Click **Create** / **Save** → **Restart**.

> After every `deploy.sh`, **restart both Node.js apps** in hPanel.

---

## Step 6 — Verify

```bash
curl https://api.paggglobal.org/api/health
```

Open:

- `https://paggglobal.org` — public site
- `https://paggglobal.org/login` — admin login

---

## Updating

```bash
bash deploy.sh
```

Then in hPanel: **Restart** both Node.js apps.

---

## GitHub Actions (optional CI)

Push to `main` → **Actions** → **Build for production** → download `chms-deploy` artifact.

Upload and extract on the server:

```bash
scp chms-deploy.tar.gz u421975600@HOST:~/domains/api.paggglobal.org/
ssh u421975600@HOST
cd ~/domains/api.paggglobal.org
# backup .env, extract, restore .env — or use deploy.sh --skip-build
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Corepack / pnpm errors on Git deploy | Disable Hostinger auto-install; use `deploy.sh` instead |
| `esbuild EACCES` in `.builds/` | Build on Mac/GitHub Actions, not on Hostinger |
| API 502 / not listening | Restart Node app; ensure you did **not** hard-code `API_PORT` (use Hostinger `PORT`) |
| 401 / CORS errors | `CORS_ORIGINS` must include `https://paggglobal.org` |
| Next.js missing CSS/images | `build-prod.sh` copies `.next/static` into standalone — redeploy |
| DB connection refused | Check `DATABASE_URL`; user must have rights on the DB |
| Uploads disappear after deploy | Set `UPLOAD_DIR` to `~/domains/api.paggglobal.org/uploads` (outside `public_html`) |
| `pnpm: command not found` on SSH | Re-run pnpm install script with `TMPDIR=$HOME/tmp` |

---

## Files reference

| File | Purpose |
|------|---------|
| `deploy.sh` | Build (Docker) + upload + extract both domains |
| `scripts/package-hostinger.sh` | Slim production bundle (~240 MB tarball) |
| `scripts/build-linux-docker.sh` | Build + slim package in Docker |
| `scripts/build-prod.sh` | Shared + Prisma + API + Web standalone |
| `scripts/hostinger-deploy.sh` | Server-side build (only if SSH build works) |
| `.github/workflows/build.yml` | CI artifact |
| `apps/web/next.config.js` | `output: 'standalone'` for Hostinger |
