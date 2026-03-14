# HealthTour - Replit Project Guide

## Overview

HealthTour is a multi-tenant Health Tourism Operations SaaS platform. It provides a React Native (Expo) mobile application and an Express.js backend to streamline health tourism operations for clinics, managers, and patients. The platform includes features such as automated billing with a scheduler, a credential request workflow, robust authentication with detailed password policies, session management, and audit logging. Key capabilities include multi-tenancy support, JWT-based authentication for staff, patient key-based login with single-device binding, and a structured patient plan management system (doctors, hotels, transport, documents). It also offers integrated PDF upload/download with role-based access and pluggable storage solutions (local disk or S3/MinIO).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React Native / Expo)

The frontend uses Expo with `expo-router` for file-based navigation, supporting role-based navigation for admin, manager, and patient roles. API interactions use a client layer, server state is managed with React Query, and authentication state with React Context, storing tokens in `AsyncStorage`. The UI features Inter fonts, a white adminTheme, and reusable components. Key features include a segmented control for Guests/Doctors, a premium patient detail page with a sticky hero header, scrollable sections, and bottom sheet modals for write actions. Document viewing uses `expo-web-browser`. All service screens (Doctors, Hotels, Transports, Document Types) offer full CRUD.

### Backend (Express.js)

The backend is an Express 5 application in TypeScript, with a structured separation of concerns (routes, database access, authentication, repository pattern). It includes specific API routes for manager, admin, patient, and general authentication. Authentication uses JWT access and refresh tokens, with sessions and device bindings persisted in the database. Critical endpoints have rate limiting. File uploads (PDF only, 10MB max) are handled by a pluggable storage provider (local disk or S3/MinIO). Audit logging tracks key actions.

### Database (Drizzle ORM + PostgreSQL)

The application uses **Replit built-in PostgreSQL** with Drizzle ORM (`drizzle-orm/node-postgres`, driver: `pg`). The schema defines entities for `clinics`, `users`, `patients`, `doctors`, `hotels`, `transports`, `patientPlans`, `appointments`, `documentTypes`, `patientDocuments`, `refreshTokens`, `devices`, `invoices`, `auditLogs`, and `notifications`. Multi-tenancy is supported via `clinicId` on relevant resources. Extended fields include `websiteUrl`, `billingEmail`, `notes`, `deletedAt` (soft-delete), and `primaryManagerUserId` for `clinics`, and `fullName`, `phoneE164` for `users`. Soft-deleted clinics are automatically excluded from queries and lead to deactivation of associated manager users.

**Typed config (`server/config.ts`):** Validates all env vars with Zod. Automatically selects `DATABASE_URL_TEST` when `NODE_ENV=test`, falling back to auto-deriving by appending `_test` to the production DB name. Logs safe DB info (host + dbname, never password) at startup.

**Test/Prod separation:**
- Dev/Prod DB: `heliumdb` (uses `DATABASE_URL`)
- Test DB: `heliumdb_test` (uses `DATABASE_URL_TEST` or auto-derived; created on Replit's same Postgres instance)
- `server/scripts/resetTestDb.ts`: Safe reset script with guards — refuses if `NODE_ENV !== "test"`, DB name lacks "test", or host matches a cloud provider pattern.
- `server/scripts/resetLaunchDb.ts`: Production launch reset script — truncates all data via TRUNCATE CASCADE (preserves schema), refuses if `NODE_ENV=test` or dbname contains "test". DRY-RUN by default; requires `RESET_CONFIRM="YES_DELETE_ALL"` to execute. Optional bootstrap SUPER_ADMIN via `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD`. Run via "DB Reset Launch" workflow or `NODE_ENV=development tsx server/scripts/resetLaunchDb.ts`.
- New npm scripts: `db:migrate`, `db:seed`, `test:db:reset`, updated `test` + `test:watch` to inject `NODE_ENV=test`.

**Transaction Manager (`server/tx/TransactionManager.ts`):** Provides `tx.run(async trx => {...})` abstraction for Drizzle transactions. Critical flows wrapped atomically:
- Bulk user/patient deactivation (`deactivateBothInTransaction`)
- Invoice overdue → UNPAID + clinic/user suspension (`markOverdueInvoicesAsUnpaid`)
- Invoice paid → clinic/user reactivation (`reactivateClinicAfterPayment`)

### Create Manager Flow

A `CreateUserSheet` component facilitates staff user creation, allowing selection of clinic and role (MANAGER/ADMIN). It collects user details, includes a clinic picker for managers, and an option to set a primary manager. Upon success, a one-time OTP modal displays the generated password.

### Admin Dashboard Module

The `server/modules/adminDashboard/` implements a SOLID-layered dashboard aggregation. It uses DTOs for data structuring, a repository for database queries (counts, total billed, recent invoices, activity from audit logs), a use case for business logic (computing period, parallel execution of repo methods), and a controller/routes for API exposure (`GET /v1/admin/dashboard`).

### Admin Dashboard UI

The Admin Dashboard (`app/(admin)/dashboard.tsx`) uses modular components: `useAdminDashboard` hook for data fetching, `BannerCarousel` for overview slides, `KpiGrid` for pressable KPI cards, `RecentInvoicesList` for recent invoices, and `ActivityFeed` for audit events. Navigation to filtered views is handled by `services/navigation/filteredNavigation.ts`.

### Premium AdminHeader Architecture

**Files:**
- `components/admin/AdminHeader.tsx` — single presentational component used across all admin screens; internally calls `useAdminHeaderData` for data; exposes `title`, `backButton`, `onBack`, `left`, `right`, `rightExtra` props
- `hooks/useAdminHeaderData.ts` — fetches unread count + diagnostics health; returns `{ unreadCount, healthOk, healthLoaded, envLabel, cityLabel, email, role, initials }`
- `components/admin/AdminProfileMenu.tsx` — Modal bottom sheet; handles logout (with inline confirmation) + logout-all + Settings navigation; calls `useAuth()` directly for `logout()`

**Header layouts:**
- **Main mode** (no `backButton`/`left`): `[H brand] [title / ENV+TZ chips] | [rightExtra?] [health dot] [bell] [profile btn]`
- **Back mode** (`backButton=true` or `left` provided): `[← / custom left] [title] | [right?] [health dot] [bell] [profile btn]`
- When `right` prop is provided: fully replaces the entire right actions area (used only in users/index selection mode)
- When `rightExtra` prop is provided: inserted before the default health/bell/profile actions (used for "New" buttons)

**Screen changes:** `clinics/index.tsx` changed `right={<NewBtn/>}` → `rightExtra={<NewBtn/>}`; `users/index.tsx` uses `right` only in selection mode and `rightExtra` in normal mode — all other screens need zero changes.

**Health dot:** Small circle (10px), green=OK, amber=DEGRADED, grey=loading; taps → `/(admin)/settings`
**ENV chip:** Amber "DEV" or green "PROD" derived from diagnostics `nodeEnv`
**TZ chip:** City name extracted from diagnostics `timezone` (e.g., "Istanbul" from "Europe/Istanbul")
**Profile button:** Initials circle + chevron → opens `AdminProfileMenu` with inline confirm flow for logout

### Admin Diagnostics Module

`server/modules/adminDiagnostics/` is a SOLID-layered module providing `GET /v1/admin/diagnostics` (ADMIN + SUPER_ADMIN). It returns a stable DTO always with HTTP 200 — DB ping is wrapped in try/catch and returns `ok: false` with latency on failure rather than throwing. DTO: `{ api: {ok, latencyMs}, db: {ok, latencyMs}, env: {nodeEnv, timezone}, server: {version} }`.

**Root cause of old Settings failures:** All four previous system-status endpoints (`/v1/admin/system/status`, `/system/jobs`, `/system/email`, `/system/security-metrics`) used `requireRole("ADMIN")` which excludes `SUPER_ADMIN`. Since the demo admin has role `SUPER_ADMIN`, all four returned 403 → `isError=true` → "Failed to load" on every card.

**Admin Settings screen** (`app/(admin)/settings/index.tsx`) was rewritten to:
- Remove the four failing queries and their JSX sections (SYSTEM STATUS, SCHEDULER & BILLING JOBS, EMAIL DELIVERY, SECURITY OVERVIEW)
- Add four production-ready sections: **DIAGNOSTICS** (live `/v1/admin/diagnostics` data with Run + Copy buttons), **BILLING POLICY** (fully static billing rules card, never fails), **SUPPORT** (mailto report + copy support code JSON), **DATA MANAGEMENT** (static retention policy + Open Exports button)
- Fix: Administration section now visible for both ADMIN and SUPER_ADMIN roles

### Admin Patients Module

The `server/modules/adminPatients/` implements a SOLID-layered patient management module. It includes:
- **Schemas** (`schemas/adminPatients.schemas.ts`): Zod param validation and DTO types for `PatientSummaryDto` and `RegenerateAccessKeyDto`.
- **Repo** (`repos/AdminPatientsReadRepo.drizzle.ts`): Drizzle-based read repo using a manual SQL join on `clinics` (since the `patientsRelations` schema does not define a clinic relation), plus `deactivatePatient` and `regenerateAccessKey` methods.
- **Use cases**: `GetPatientSummary`, `DeactivatePatient` (with 409 guard for already-inactive), `RegenerateAccessKey` (revokes device + all refresh tokens + generates new `GUEST-XXXX-XXXX` key).
- **Controller** and **Routes**: `GET /v1/admin/patients/:id`, `POST /v1/admin/patients/:id/deactivate` (ADMIN+), `POST /v1/admin/patients/:id/regenerate-access-key` (SUPER_ADMIN only).
- **Frontend**: `lib/api/adminPatients.ts` API client and `components/patients/PatientSummarySheet.tsx` — a React Native `Modal` + `Animated` slide-up sheet with: masked key (GUEST-••••-XXXX), eye toggle to reveal, copy to clipboard, clinic chip linking to clinic detail, deactivate + regenerate actions with `Alert.alert` confirmations, and a new-key banner after regeneration. Wired into `app/(admin)/users/index.tsx` via `handleRowPress` — tapping any PATIENT row opens the sheet.
- **Duplicate removed**: `router.post("/patients/:id/regenerate-access-key", ...)` block deleted from `server/api/adminRoutes.ts`.

### Admin Users Module + Bulk Deactivation

The `server/modules/adminUsers/` module provides SOLID-layered user management, including bulk deactivation. It defines DTOs for deactivation targets and results. A repository handles listing unified entities (managers, patients, admins) with search/filter, and individual deactivation. A use case manages bulk deactivation logic, preventing self-deactivation and primary manager deactivation, and adding audit logs. The API exposes `POST /v1/admin/users/bulk-deactivate`. Frontend components include `useSelection` hook, `UserListRowCard` for user display with selection, `SelectionToolbar` for bulk actions, and `BulkDeleteModal` for confirmation. The `app/(admin)/users/index.tsx` screen is fully rewritten to incorporate these features.

### API Routes

The API includes manager routes (`/v1/manager/*`) for CRUD operations on patients, doctors, hotels, transports, patient plans, appointments, and documents, including specific endpoints for document assignment, signed URL generation, and patient details aggregation. Admin routes (`/v1/admin/*`) control clinics, users, and invoices. Patient routes support document uploads. Authentication routes handle staff and patient login, token refresh, and logout.

### Shared Error Infrastructure

**Error Codes** (`server/shared/errors/ErrorCodes.ts`): Central catalog of all error codes (AUTH-001..006, BILL-001, VAL-001, NOT-001, DB-001..002, SYS-001, EXT-EMAIL-001, EXT-STORAGE-001).

**AppError** (`server/shared/errors/AppError.ts`): Typed application error class with `code`, `userMessage`, `statusCode`, `isOperational`, and `details` fields. `server/auth/errors.ts` re-exports it.

**requestIdMiddleware** (`server/shared/middleware/requestId.ts`): Assigns a UUID v4 `requestId` to every request, echoed in `X-Request-Id` response header. Added to the Express middleware chain before body parsing.

**globalErrorHandler** (`server/shared/middleware/errorHandler.ts`): Unified Express error handler converting `AppError`, `ZodError`, and PG constraint errors to structured `{code, message, requestId, details}` JSON responses. Replaces the old inline `setupErrorHandler`.

### Circuit Breaker

`server/shared/circuitBreaker/CircuitBreaker.ts` implements a CLOSED → OPEN → HALF_OPEN state machine (configurable `failureThreshold` / `cooldownMs`). `CircuitBreakerEmailProvider.ts` wraps all email providers; `getEmailProvider.ts` returns the circuit-breaker-wrapped instance.

### System Error UI (Frontend)

**SystemErrorContext** (`context/SystemErrorContext.tsx`): Global React context with `showSystemError(info)` / `dismissError()`. The `SystemErrorBridge` component in `_layout.tsx` wires `setSystemErrorHandler` from `lib/query-client.ts` to the context so any 5xx API response automatically triggers the maintenance overlay.

**MaintenanceBottomSheet** (`components/system/MaintenanceBottomSheet.tsx`): Turkish-language modal shown for system-level errors. Displays `errorCode` and `requestId` for support reference.

**Query client** (`lib/query-client.ts`): `handleBadResponse` parses error body from failed responses and calls `_onSystemError` when `status >= 500` or the code is in `SYSTEM_ERROR_CODES`. Exports `setSystemErrorHandler` for wiring. Also exports `ApiErrorBody` type and enriched error objects with `.code`, `.requestId`, `.status`.

## External Dependencies

### Runtime Services

-   **PostgreSQL**: Primary data store, configured via `DATABASE_URL`.
-   **Replit Hosting**: Handles CORS (`REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`) and API URL (`EXPO_PUBLIC_DOMAIN`).

### Environment Variables Required

-   `DATABASE_URL`: PostgreSQL connection string.
-   `SESSION_SECRET`: For session signing.
-   `EXPO_PUBLIC_DOMAIN`: API base URL for mobile app.
-   `REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`: Replit-specific for CORS.
-   `STORAGE_PROVIDER`: Specifies storage backend (`local` or `s3`).
-   `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`: S3 credentials (if `STORAGE_PROVIDER` is `s3`).
-   `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`: Optional, for MinIO compatibility.

### Key NPM Dependencies

-   `expo`, `expo-router`: Mobile framework and routing.
-   `@tanstack/react-query`: Frontend server state management.
-   `drizzle-orm`, `drizzle-kit`: ORM and migration tooling for PostgreSQL.
-   `express`: Backend web framework.
-   `jsonwebtoken`, `bcryptjs`: Authentication tokens and password hashing.
-   `zod`: API input validation.
-   `multer`: File upload handling.
-   `express-rate-limit`: API rate limiting.
-   `@aws-sdk/client-s3`: S3/MinIO integration.
-   `date-fns`: Date utility library.