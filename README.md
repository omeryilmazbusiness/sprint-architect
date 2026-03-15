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

## Launch Database Reset (Clean Production Launch)

> **⚠️ IRREVERSIBLE — This wipes ALL application data. There is no undo.**

Use `db:reset:launch` to reset the database to a clean "first production release" state — no clinics, no users, no patients, no invoices. Schema (tables, indexes, enums) is preserved; only rows are removed.

### Commands

```bash
# DRY-RUN (safe — shows row counts, makes no changes):
RESET_CONFIRM="" NODE_ENV=development tsx server/scripts/resetLaunchDb.ts

# Real reset — wipes ALL data:
RESET_CONFIRM="YES_DELETE_ALL" NODE_ENV=development tsx server/scripts/resetLaunchDb.ts

# Real reset + create bootstrap SUPER_ADMIN (recommended for launch):
RESET_CONFIRM="YES_DELETE_ALL" \
  BOOTSTRAP_ADMIN_EMAIL="ops@yourcompany.com" \
  BOOTSTRAP_ADMIN_PASSWORD="SecurePass123!" \
  NODE_ENV=development tsx server/scripts/resetLaunchDb.ts
```

You can also trigger the reset from the **"DB Reset Launch"** workflow in the Replit panel (which runs DRY-RUN mode by default — set `RESET_CONFIRM` in your secrets to enable the real wipe).

### Safety Guards (will refuse and abort if any check fails)

1. `NODE_ENV` must NOT be `"test"` — prevents accidental use on test databases
2. Database name must NOT contain `"test"` — double-check against wrong target
3. `RESET_CONFIRM` must equal `"YES_DELETE_ALL"` — if anything else, DRY-RUN only

### DRY-RUN Mode

When `RESET_CONFIRM` is unset or doesn't match, the script:
- Prints a table-by-table row count summary
- Shows exactly what would be wiped
- Exits with code 0 (no changes made)

### Bootstrap Admin

Provide both `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` to create an initial `SUPER_ADMIN` account after the wipe. The account is created with `mustChangePassword=true` — the operator must change the password on first login.

**Password requirements:** Minimum 12 characters.

### Expected Result After Reset

| Table                | Rows |
|----------------------|------|
| clinics              | 0    |
| users                | 0 (or 1 if bootstrap) |
| patients             | 0    |
| invoices             | 0    |
| appointments         | 0    |
| all other tables     | 0    |

> The mobile app will show an empty system. No clinics, managers, or patients exist until created through the app.

---

## Wipe Manager Data (DEV only)

> **⚠️ IRREVERSIBLE — DEV ONLY. Removes clinic-scoped patient data. There is no undo.**

Use `wipeManagerData.ts` to clear all manager-operated data (patients, doctors, document types, appointments, plans, hotels, transports, etc.) without touching clinics, user accounts, or schema.

This is useful when you want a clean slate for testing manager workflows without doing a full database reset.

### Tables wiped (FK-safe order)

| Order | Table                 | Note                                          |
|-------|-----------------------|-----------------------------------------------|
| 1     | `patient_documents`   | Document uploads assigned to patients         |
| 2     | `appointments`        | All scheduled appointments                    |
| 3     | `patient_plans`       | Hotel / transport / doctor assignments        |
| 4     | `credential_requests` | Patient login credential requests             |
| 5     | `notifications`       | Clinic-scoped push notifications              |
| 6     | `audit_logs`          | Clinic-scoped audit entries                   |
| 7     | `invoices`            | Patient invoices                              |
| 8     | `refresh_tokens`      | Patient-linked tokens only (managers kept)    |
| 9     | `devices`             | Patient device bindings only                  |
| 10    | `patients`            | Patient records                               |
| 11    | `document_types`      | Document type definitions per clinic          |
| 12    | `doctors`             | Doctor profiles                               |
| 13    | `hotels`              | Hotel records                                 |
| 14    | `transports`          | Transport / driver records                    |

Clinics, user accounts (managers / admins), schema, and job infrastructure are **never touched**.

### Commands

```bash
# Dry-run — shows row counts for what WOULD be deleted (no changes):
NODE_ENV=development tsx server/scripts/wipeManagerData.ts

# Real wipe — ALL clinic-scoped data:
WIPE_MANAGER_CONFIRM=YES_WIPE_MANAGER_DATA NODE_ENV=development tsx server/scripts/wipeManagerData.ts

# Dry-run — single clinic only:
WIPE_CLINIC_ID="<clinicId>" NODE_ENV=development tsx server/scripts/wipeManagerData.ts

# Real wipe — single clinic only:
WIPE_CLINIC_ID="<clinicId>" WIPE_MANAGER_CONFIRM=YES_WIPE_MANAGER_DATA NODE_ENV=development tsx server/scripts/wipeManagerData.ts
```

### Safety Guards (will refuse and abort if any check fails)

1. `NODE_ENV` must NOT be `"test"` — prevents accidental test-DB wipe
2. Database name must NOT contain `"test"` — double-checks `DATABASE_URL` target
3. `WIPE_MANAGER_CONFIRM` must equal `"YES_WIPE_MANAGER_DATA"` — if missing or wrong, **DRY-RUN only**

### Scope Modes

| Mode        | How to activate                          | What is deleted                        |
|-------------|------------------------------------------|----------------------------------------|
| Dry-run     | Omit `WIPE_MANAGER_CONFIRM` (default)   | Nothing — counts only                  |
| Full wipe   | No `WIPE_CLINIC_ID`                      | All clinic-scoped data across all clinics |
| Clinic wipe | Set `WIPE_CLINIC_ID="<id>"`             | Only that clinic's data                |

---

## Wipe Doctors & Guests (DEV only)

> **⚠️ IRREVERSIBLE — DEV ONLY. Removes doctors and patients (guests) with all their dependent rows.**

Use `wipeDoctorsAndGuests.ts` when you only need a fresh doctor/patient slate — it is faster and more targeted than a full manager wipe. All other tables (clinics, user accounts, document types, hotels, transports, etc.) are untouched.

### Tables wiped (FK-safe order)

| Order | Table                 | Note                                      |
|-------|-----------------------|-------------------------------------------|
| 1     | `patient_documents`   | Uploaded documents for patients           |
| 2     | `appointments`        | All appointments                          |
| 3     | `patient_plans`       | Hotel / transport / doctor assignments    |
| 4     | `credential_requests` | Patient credential requests               |
| 5     | `refresh_tokens`      | Patient-linked tokens only                |
| 6     | `devices`             | Patient device bindings only              |
| 7     | `patients`            | Patient (guest) records                   |
| 8     | `doctors`             | Doctor profiles                           |

### Commands

```bash
# Dry-run — shows counts, no changes:
NODE_ENV=development tsx server/scripts/wipeDoctorsAndGuests.ts

# Real wipe — all clinics:
WIPE_CONFIRM=YES_WIPE_DOCTORS_GUESTS NODE_ENV=development tsx server/scripts/wipeDoctorsAndGuests.ts

# Dry-run — single clinic:
WIPE_CLINIC_ID="<clinicId>" NODE_ENV=development tsx server/scripts/wipeDoctorsAndGuests.ts

# Real wipe — single clinic:
WIPE_CLINIC_ID="<clinicId>" WIPE_CONFIRM=YES_WIPE_DOCTORS_GUESTS NODE_ENV=development tsx server/scripts/wipeDoctorsAndGuests.ts
```

### Safety Guards

1. `NODE_ENV === "test"` → **hard abort**
2. Database name contains `"test"` → **hard abort**
3. `WIPE_CONFIRM` ≠ `"YES_WIPE_DOCTORS_GUESTS"` → **dry-run only, exits 0**

### What the output proves

After a real wipe the script prints a post-wipe verification table — every row shows `0 rows`. It exits non-zero if any remnants are found, so CI or scripts can detect failure.

---

## ⚠️ WARNING — Never Reset Prod Without Confirmation

**Never run the launch reset against your production database without a deliberate `RESET_CONFIRM="YES_DELETE_ALL"` flag.** The script has safety guards but production data cannot be recovered after a reset.

---

## Stack

- **Frontend:** Expo (React Native + Router), React Query, TypeScript
- **Backend:** Express, TypeScript, tsx
- **ORM:** Drizzle ORM (drizzle-orm/node-postgres)
- **Database:** PostgreSQL (Replit Built-in)
- **Auth:** JWT (access + refresh tokens)
- **Billing:** Automated scheduler (node-cron, Istanbul timezone)
