# HealthTour — Health Tourism Operations SaaS

Multi-tenant SaaS mobile application for health tourism clinics. Built with Expo React Native (frontend), Express + TypeScript (backend), Drizzle ORM, and PostgreSQL.

---

## Database Provider

**Replit Built-in PostgreSQL (Local Postgres)**

| Field    | Value                          |
|----------|--------------------------------|
| Host     | `helium` (Replit internal)     |
| Port     | `5432`                         |
| Driver   | `pg` (node-postgres)           |
| ORM      | `drizzle-orm/node-postgres`    |
| Dev/Prod DB | `heliumdb`                  |
| Test DB  | `heliumdb_test`                |

---

## Environment Variables

| Variable           | Required     | Description                                                                                           |
|--------------------|--------------|-------------------------------------------------------------------------------------------------------|
| `DATABASE_URL`     | Always       | Production/development database connection string. Format: `postgres://user:pass@host:5432/heliumdb`  |
| `DATABASE_URL_TEST`| For tests    | Test database connection string. If not set, auto-derived by appending `_test` to the database name.  |
| `SESSION_SECRET`   | Always       | Secret key for JWT signing. Must be a long random string.                                             |
| `NODE_ENV`         | Always       | `development` \| `test` \| `production`                                                               |
| `PORT`             | Optional     | Server port (default: `5000`)                                                                         |

### Setting secrets in Replit

In your Replit project, go to **Secrets** (padlock icon) and add:

```
DATABASE_URL      = postgres://postgres:PASSWORD@helium:5432/heliumdb
DATABASE_URL_TEST = postgres://postgres:PASSWORD@helium:5432/heliumdb_test
SESSION_SECRET    = <long-random-string>
```

> The `DATABASE_URL_TEST` is optional — if not provided and `NODE_ENV=test`, it is auto-derived by replacing the database name with `<name>_test`.

---

## How to Connect

### psql

```bash
# Production / development database
psql "$DATABASE_URL"

# Test database
psql "$DATABASE_URL_TEST"
```

### TablePlus / DBeaver

Use the same credentials from `DATABASE_URL`, but change the **database name** to `heliumdb_test` for the test connection:

| Field    | Prod/Dev       | Test              |
|----------|----------------|-------------------|
| Host     | `helium`       | `helium`          |
| Port     | `5432`         | `5432`            |
| User     | `postgres`     | `postgres`        |
| Password | *(from secret)*| *(same password)* |
| Database | `heliumdb`     | `heliumdb_test`   |

---

## NPM Scripts

| Script              | Command                                          | Description                                              |
|---------------------|--------------------------------------------------|----------------------------------------------------------|
| `db:migrate`        | `npm run db:migrate`                             | Push schema changes to the **production** database       |
| `db:push`           | `npm run db:push`                                | Alias for `db:migrate`                                   |
| `db:seed`           | `npm run db:seed`                                | Seed the development database with demo data             |
| `test:db:reset`     | `npm run test:db:reset`                          | Drop + recreate + seed the **test** database safely       |
| `test`              | `npm test`                                       | Run Vitest tests against the test database only          |
| `test:watch`        | `npm run test:watch`                             | Watch mode for tests                                     |
| `server:dev`        | `npm run server:dev`                             | Start backend in development mode                        |

---

## Running Migrations

```bash
# Push schema to production/development DB (uses DATABASE_URL)
npm run db:migrate

# Push schema to test DB (uses DATABASE_URL_TEST)
DATABASE_URL="$DATABASE_URL_TEST" npm run db:migrate
```

> Drizzle Kit always reads `DATABASE_URL` — never `DATABASE_URL_TEST`. To run against the test DB, override `DATABASE_URL` temporarily.

---

## Seeding

```bash
# Seed development database (creates demo admin, manager, clinic, patients)
npm run db:seed
```

Demo accounts created by seed:

| Role    | Email               | Password    |
|---------|---------------------|-------------|
| Admin   | `admin@demo.com`    | `Admin123!` |
| Manager | `manager@demo.com`  | `Manager123!`|

---

## Test Database Reset

```bash
# Safe full reset: drops all tables, re-pushes schema, re-seeds
npm run test:db:reset
```

**Safety guards** (will refuse and exit if any check fails):
1. `NODE_ENV` must equal `"test"`
2. Database name must contain `"test"`
3. DB host must NOT match known cloud providers (Neon, Supabase, Railway, Render, RDS)

---

## Running Tests

```bash
# Tests automatically use the test database (NODE_ENV=test injected by the script)
npm test

# Reset test DB first, then run tests
npm run test:db:reset && npm test
```

> Tests never touch the production/development database. `NODE_ENV=test` is enforced by the `test` script, which causes `server/config.ts` to select `DATABASE_URL_TEST` automatically.

---

## Architecture

```
server/
  config.ts              # Typed env config (zod). Selects DB URL by NODE_ENV.
  db.ts                  # Drizzle + pg Pool. Uses dbUrl from config.ts.
  seed.ts                # Demo data seed (idempotent)
  tx/
    TransactionManager.ts  # tx.run(async trx => {...}) abstraction
  scripts/
    resetTestDb.ts        # Safe test DB reset (safety-guarded)
  modules/               # SOLID feature modules (controller → use-case → repo)
    adminUsers/
    adminDashboard/
  billing/
    billingService.ts    # Invoice/suspension/reactivation flows (ACID-wrapped)
```

### Transaction Coverage

| Operation                                | Transaction? |
|------------------------------------------|-------------|
| Bulk user/patient deactivation           | Yes         |
| Invoice overdue → UNPAID + clinic suspend | Yes         |
| Invoice paid → clinic reactivation       | Yes         |
| Single user deactivation                 | Yes (via bulk)   |

---

## ⚠️ WARNING — Never Reset Prod

**Never run `npm run test:db:reset` against your production database.** The script has safety guards but is designed for local/test databases only. Production data cannot be recovered after a reset.

---

## Stack

- **Frontend:** Expo (React Native + Router), React Query, TypeScript
- **Backend:** Express, TypeScript, tsx
- **ORM:** Drizzle ORM (drizzle-orm/node-postgres)
- **Database:** PostgreSQL (Replit Built-in)
- **Auth:** JWT (access + refresh tokens)
- **Billing:** Automated scheduler (node-cron, Istanbul timezone)
