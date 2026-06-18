# Church Management System (ChMS)

A full-featured church management platform — finance, payroll, HR, attendance,
membership, follow-up, sermons, testimonies, outreaches, communication, and
reporting.

Built as a TypeScript monorepo:

- **`apps/api`** — NestJS REST API (MySQL via Prisma)
- **`apps/web`** — Next.js (App Router) frontend
- **`packages/shared`** — shared types, permission catalog, role definitions
- **`prisma`** — database schema, migrations, and seed

## Tech stack

NestJS · Next.js · Prisma · MySQL 8 · Tailwind CSS · TanStack Query · JWT (RBAC)

## Prerequisites

- Node.js >= 20
- pnpm >= 10 (`corepack enable`)
- Docker (for local MySQL) — or any MySQL 8 instance

## Getting started (local)

```bash
# 1. Install dependencies
pnpm install

# 2. Create your .env from the template
cp .env.example .env

# 3. Start MySQL (Docker)
pnpm docker:up

# 4. Build shared package + generate Prisma client
pnpm --filter @chms/shared build
pnpm db:generate

# 5. Run the first migration
pnpm db:migrate -- --name init

# 6. Seed roles, permissions, church + super admin
pnpm db:seed

# 7. Run everything (API + web)
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api
- API health: http://localhost:4000/api/health

Default super admin comes from `.env` (`SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`).

## Useful scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run API + web in watch mode |
| `pnpm build` | Build all apps |
| `pnpm db:migrate` | Create/apply a dev migration |
| `pnpm db:deploy` | Apply migrations in production |
| `pnpm db:seed` | Seed reference data |
| `pnpm db:studio` | Open Prisma Studio |

## Deployment (Hostinger)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for full VPS and shared-hosting instructions.

Quick production build:

```bash
pnpm build:prod
pm2 start ecosystem.config.cjs   # VPS only
```

Two supported targets:

1. **VPS (recommended):** PM2 + Nginx reverse proxy + MySQL
2. **Business shared hosting:** NestJS API + Next.js standalone as Node apps via hPanel

## Module overview

| Module | Status |
|---|---|
| Auth & RBAC | ✅ |
| Branches, Departments, Members | ✅ |
| Groups & Attendance | ✅ |
| Finance (tithes, funds, expenses, pledges) | ✅ |
| HR & Payroll | ✅ |
| Sermons, Testimonies, Events, Outreaches | ✅ |
| Communication (email/SMS) & Follow-up | ✅ |
| Reports & Dashboard | ✅ |
| Settings | ✅ |

## Roadmap

All core phases (0–9) are implemented. Future enhancements: file uploads for sermons/photos, SMS provider integration, PDF/Excel export, member portal, and mobile app.
