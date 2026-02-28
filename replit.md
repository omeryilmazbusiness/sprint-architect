# HealthTour - Replit Project Guide

## Overview

HealthTour is a multi-tenant Health Tourism Operations SaaS platform built as a React Native (Expo) mobile app with an Express.js backend. The app serves three user roles: **ADMIN** (manages all clinics and users), **MANAGER** (manages patients/operations within a specific clinic), and **PATIENT** (mobile user with a simplified login flow).

**Current state (Sprints 1-8 complete):** Full multi-tenant Health Tourism SaaS. Admin console with attention-needed metrics (overdue invoices, suspended clinics, clinics without managers), billing automation with clinic suspension/reactivation, auto-generated user passwords with one-time reveal, clinic detail with billing anchor day + invoice timeline, PDF document upload/download with S3/local storage, persistent DB auth tokens, rate limiting, audit logging, role-based dashboards for all three user types.

**Core domain concepts:**
- **Clinic** = tenant. All clinic-bound resources carry a `clinicId`.
- **Staff login** uses email + password → JWT access + refresh tokens (now DB-persisted).
- **Patient login** uses a `patientKey` + `deviceId` with single-device binding enforcement (now DB-persisted).
- **Patient Plan** = treatment plan per patient (assigned doctor, hotel, transport, documents).

---

## Demo Accounts

| Role | Credential | Notes |
|------|-----------|-------|
| Admin | admin@demo.com / Admin123! | Full platform access |
| Manager | manager@demo.com / Manager123! | Clinic-scoped access |
| Patient | Key: PATIENT-TEST-0001 | Sarah Mitchell |
| Patient | Key: PATIENT-TEST-0002 | James Thornton |

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend (React Native / Expo)

- **Framework:** Expo with `expo-router` for file-based routing.
- **Navigation structure:**
  - `app/index.tsx` → redirects based on auth state + role
  - `app/(auth)/login.tsx` → staff and patient login
  - `app/(tabs)/` → manager tabs: Dashboard, Patients, Operations, Settings
  - `app/(admin)/` → admin tabs: Dashboard, Clinics, Users, Invoices, Settings
  - `app/(admin)/clinics/` → Clinics list + detail (CRUD)
  - `app/(admin)/users/` → Users list + detail (CRUD + password reset)
  - `app/(admin)/invoices/` → Invoices list + detail (status management)
  - `app/(manager)/` → stack screens: patient detail, doctors, hotels, transports, invoices
  - `app/(patient)/` → patient dashboard (role-gated redirect)
- **API client layer:** `lib/api/adminClinics.ts`, `lib/api/adminUsers.ts`, `lib/api/adminInvoices.ts`
- **State management:** React Query for server state; React Context (`AuthContext`) for auth.
- **Auth tokens** stored in `AsyncStorage`, injected via query client.
- **Fonts:** Inter (400, 500, 600, 700) via `@expo-google-fonts/inter`.
- **Theme:** Light/dark using `useColorScheme()` + `constants/colors.ts` (navy #0A3D62 / teal #00B4D8).
- **Shared components:** `StatusBadge`, `MetricCard`, `LoadingView`, `ErrorView`, `EmptyState`, `ErrorBoundary`.

### Backend (Express.js)

- **Framework:** Express 5 with TypeScript, run via `tsx` in development.
- **File structure:**
  - `server/index.ts` → bootstrap, CORS, static file serving, DB seed
  - `server/routes.ts` → route mounting
  - `server/db.ts` → Drizzle PostgreSQL client singleton
  - `server/auth/` → auth subsystem (JWT, bcrypt, middleware, errors) — legacy `store.ts` removed
  - `server/repositories/` → DB access layer (patientRepo, doctorRepo, hotelRepo, transportRepo, appointmentRepo, documentRepo, planRepo, authRepo, invoiceRepo, **clinicRepo**, **userRepo**)
  - `server/api/managerRoutes.ts` → all manager CRUD + assignment endpoints + invoices
  - `server/api/adminRoutes.ts` → ADMIN-only: metrics endpoint, clinic CRUD, user CRUD, invoice management
  - `server/api/uploadRoutes.ts` → PDF upload (POST) + download (GET) with RBAC; streams files via storage provider
  - `server/api/auditLogger.ts` → fire-and-forget audit logging to DB
  - `server/api/patientDashboardRoute.ts` → patient self-service dashboard (includes rejectionReason)
  - `server/storage/StorageProvider.ts` → interface (saveFile + getReadStream)
  - `server/storage/LocalDiskStorageProvider.ts` → dev/local implementation; backward-compat with old URL-style keys
  - `server/storage/S3StorageProvider.ts` → S3/MinIO implementation using AWS SDK v3
  - `server/storage/getStorageProvider.ts` → factory; reads STORAGE_PROVIDER env var (local|s3)
  - `server/seed.ts` → seeds demo data + admin/manager users on startup (dev only)
- **Auth system:**
  - JWT access tokens (15 min TTL) + refresh tokens (30 days)
  - `authMiddleware`, `requireRole()`, `clinicScopeMiddleware` for RBAC + tenancy
  - **Tokens and device bindings are DB-persisted** via `refreshTokens` + `devices` tables. Server restart preserves sessions.
- **Rate limiting:** Login endpoints (10 req/15min), upload endpoint (5 req/min)
- **File uploads:** PDF only, 10MB max. Storage is pluggable: `STORAGE_PROVIDER=local` saves to `uploads/{clinicId}/{patientId}/` on disk; `STORAGE_PROVIDER=s3` saves to S3/MinIO using `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (and optional `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE` for MinIO).
- **Storage keys in DB:** `patient_documents.file_url` is a provider-agnostic storage key (format: `{clinicId}/{patientId}/{timestamp}-{uuid}.pdf`). Old records with URL-style keys (`/v1/documents/files/...`) are handled with backward-compat in `LocalDiskStorageProvider`.

### Database (Drizzle ORM + PostgreSQL)

- **Schema** (`shared/schema.ts`) defines:
  - `clinics`, `users` — auth/tenancy (clinics now have `billingUnitPrice`, `currency`)
  - `patients`, `doctors`, `hotels`, `transports` — core resources
  - `patientPlans` — treatment plan per patient (with doctorId, hotelId, transportId)
  - `appointments` — scheduled meetings (with patient, doctor, clinic)
  - `documentTypes`, `patientDocuments` — document tracking workflow (`fileUrl`, `rejectionReason` on patientDocuments)
  - `refreshTokens` — DB-persisted JWT refresh tokens (hashed with SHA-256)
  - `devices` — patient device bindings (single-device enforcement)
  - `invoices` — billing invoices per clinic per period (DRAFT/ISSUED/PAID)
  - `auditLogs` — immutable audit trail for key actions
- **Migration:** `npm run db:push` (drizzle-kit push)

### API Routes

All manager routes: `/v1/manager/*` (require MANAGER or ADMIN + clinic scope)
All admin routes: `/v1/admin/*` (require ADMIN)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | /v1/manager/patients | List / create patients |
| GET/PUT/DELETE | /v1/manager/patients/:id | Get / update / delete patient |
| GET | /v1/manager/metrics | Dashboard metrics |
| GET | /v1/manager/upcoming-appointments | Upcoming appointments list |
| GET/POST | /v1/manager/doctors | List / create doctors |
| PUT/DELETE | /v1/manager/doctors/:id | Update / delete doctor |
| GET/POST | /v1/manager/hotels | List / create hotels |
| PUT/DELETE | /v1/manager/hotels/:id | Update / delete hotel |
| GET/POST | /v1/manager/transports | List / create transports |
| PUT/DELETE | /v1/manager/transports/:id | Update / delete transport |
| GET | /v1/manager/patients/:id/plan | Get patient treatment plan |
| PUT | /v1/manager/patients/:id/assign-doctor | Assign doctor to patient plan |
| PUT | /v1/manager/patients/:id/assign-hotel | Assign hotel to patient plan |
| PUT | /v1/manager/patients/:id/assign-transport | Assign transport to patient plan |
| POST | /v1/manager/patients/:id/assign-documents | Assign document types to patient |
| GET | /v1/manager/patients/:id/documents | List patient documents |
| PUT | /v1/manager/documents/:id | Update document status (APPROVED/REJECTED + rejectionReason) |
| GET | /v1/manager/patients/:id/appointments | List patient appointments |
| POST | /v1/manager/appointments | Create appointment |
| PUT/DELETE | /v1/manager/appointments/:id | Update / delete appointment |
| GET | /v1/manager/document-types | List available document types |
| GET | /v1/manager/invoices | List invoices for manager's clinic |
| GET | /v1/manager/invoices/:id | Get specific invoice |
| GET | /v1/admin/metrics | Admin metrics: clinic/user/invoice counts + attentionNeeded section |
| GET | /v1/admin/clinics | List clinics (paginated, search, status filter) |
| POST | /v1/admin/clinics | Create clinic (auto-sets billingAnchorDay) |
| GET | /v1/admin/clinics/:id | Get clinic by ID |
| GET | /v1/admin/clinics/:id/detail | Get clinic detail: billing info + managers + invoice timeline |
| PUT | /v1/admin/clinics/:id | Update clinic (name, status, billingUnitPrice, currency, billingAnchorDay) |
| DELETE | /v1/admin/clinics/:id | Soft-delete clinic (sets INACTIVE) |
| GET | /v1/admin/users | List users (paginated, search, role, status, clinicId filter) |
| POST | /v1/admin/users | Create user (auto-generates password, returns generatedPassword once) |
| GET | /v1/admin/users/:id | Get user by ID |
| PUT | /v1/admin/users/:id | Update user |
| PUT | /v1/admin/users/:id/reset-password | Auto-generate new password, return it once |
| DELETE | /v1/admin/users/:id | Soft-delete user (sets INACTIVE) |
| POST | /v1/admin/invoices/generate | Generate invoices for all clinics (?period=YYYY-MM) |
| POST | /v1/admin/billing/run | Manually trigger billing cycle |
| GET | /v1/admin/invoices | List all invoices (admin, paginated) |
| GET | /v1/admin/invoices/:id | Get invoice by ID |
| PUT | /v1/admin/invoices/:id/status | Update invoice status (DRAFT/ISSUED/PAID — PAID auto-reactivates clinic) |
| POST | /v1/patient/documents/:id/upload | Upload PDF (patient auth, PDF only, 10MB, 5/min) |
| GET | /v1/documents/:id/download | Download PDF (auth required; ?token= query param supported) |
| GET | /v1/patient/dashboard | Patient self-service dashboard |
| POST | /v1/patient/auth/login | Patient login (patientKey + deviceId) |
| POST | /v1/auth/login | Staff login (rate-limited: 10/15min) |
| POST | /v1/auth/refresh | Token refresh |
| POST | /v1/auth/logout | Logout |

### Transport Field Mapping

The transport API accepts `phone` (internally `driverPhone`), `vehicleType` + `licensePlate` (combined into `vehicleInfo` as "type|plate"). When reading, split `vehicleInfo` on `|` to get type and plate separately.

---

## External Dependencies

### Runtime Services
- **PostgreSQL** — Required. `DATABASE_URL` env var. Full persistence via Drizzle.
- **Replit hosting** — CORS via `REPLIT_DEV_DOMAIN`/`REPLIT_DOMAINS`. API URL from `EXPO_PUBLIC_DOMAIN`.

### Environment Variables Required
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Session signing secret |
| `EXPO_PUBLIC_DOMAIN` | API base URL for the mobile app |
| `REPLIT_DEV_DOMAIN` | Auto-set by Replit |
| `REPLIT_DOMAINS` | Auto-set by Replit for CORS |
| `STORAGE_PROVIDER` | `local` (default) or `s3` |
| `S3_BUCKET` | S3 bucket name (required when `STORAGE_PROVIDER=s3`) |
| `S3_REGION` | AWS region (required when `STORAGE_PROVIDER=s3`) |
| `S3_ACCESS_KEY_ID` | AWS access key (required when `STORAGE_PROVIDER=s3`) |
| `S3_SECRET_ACCESS_KEY` | AWS secret key (required when `STORAGE_PROVIDER=s3`) |
| `S3_ENDPOINT` | Custom endpoint URL (optional — for MinIO) |
| `S3_FORCE_PATH_STYLE` | `true` for MinIO path-style access (optional) |

A `.env.example` file at the project root documents all variables.

### Key NPM Dependencies
| Package | Purpose |
|---|---|
| `expo` + `expo-router` | Mobile/web framework and routing |
| `@tanstack/react-query` | Server state management |
| `drizzle-orm` + `drizzle-kit` | ORM + migration tooling |
| `express` | Backend HTTP server |
| `jsonwebtoken` + `bcryptjs` | Auth tokens + password hashing |
| `zod` | API input validation |
| `multer` | Multipart file upload handling |
| `express-rate-limit` | API rate limiting |
| `expo-document-picker` | PDF file selection on mobile |
| `@aws-sdk/client-s3` | S3/MinIO file upload and streaming download |
| `expo-linear-gradient` + `expo-blur` | UI effects |
| `expo-glass-effect` | Native liquid glass tab bar (iOS 26+) |
| `react-native-keyboard-controller` | Keyboard handling |
| `@react-native-async-storage/async-storage` | Persistent token storage |
