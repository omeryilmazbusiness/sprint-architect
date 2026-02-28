# HealthTour - Replit Project Guide

## Overview

HealthTour is a multi-tenant Health Tourism Operations SaaS platform built as a React Native (Expo) mobile app with an Express.js backend. The app serves three user roles: **ADMIN** (manages all clinics and users), **MANAGER** (manages patients/operations within a specific clinic), and **PATIENT** (mobile user with a simplified login flow).

**Current state (Sprint 4 complete):** Fully functional app with real PostgreSQL persistence, complete manager CRUD workflows, patient detail screens, resource management (doctors/hotels/transports), real-time dashboard metrics, and a dedicated patient dashboard. All screens are connected to live APIs.

**Core domain concepts:**
- **Clinic** = tenant. All clinic-bound resources carry a `clinicId`.
- **Staff login** uses email + password → JWT access + refresh tokens.
- **Patient login** uses a `patientKey` + `deviceId` with single-device binding enforcement.
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
  - `app/(tabs)/` → manager/admin tabs: Dashboard, Patients, Operations, Settings
  - `app/(manager)/` → stack screens: patient detail, doctors, hotels, transports
  - `app/(patient)/` → patient dashboard (role-gated redirect)
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
  - `server/auth/` → auth subsystem (JWT, bcrypt, in-memory token store)
  - `server/repositories/` → DB access layer (patientRepo, doctorRepo, hotelRepo, transportRepo, appointmentRepo, documentRepo, planRepo)
  - `server/api/managerRoutes.ts` → all manager CRUD + assignment endpoints
  - `server/api/patientDashboardRoute.ts` → patient self-service dashboard
  - `server/seed.ts` → seeds demo data on startup (dev only)
- **Auth system:**
  - JWT access tokens (15 min TTL) + refresh tokens (30 days)
  - `authMiddleware`, `requireRole()`, `clinicScopeMiddleware` for RBAC + tenancy
  - **Note:** JWT/refresh tokens and device bindings are stored in RAM (ephemeral). Server restart logs everyone out. Migration to DB storage is a future task.

### Database (Drizzle ORM + PostgreSQL)

- **Schema** (`shared/schema.ts`) defines:
  - `clinics`, `users` — auth/tenancy
  - `patients`, `doctors`, `hotels`, `transports` — core resources
  - `patientPlans` — treatment plan per patient (with doctorId, hotelId, transportId)
  - `appointments` — scheduled meetings (with patient, doctor, clinic)
  - `documentTypes`, `patientDocuments` — document tracking workflow
- **Migration:** `npm run db:push` (drizzle-kit push)

### API Routes

All manager routes: `/v1/manager/*` (require MANAGER or ADMIN + clinic scope)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | /v1/manager/patients | List / create patients |
| GET/PUT/DELETE | /v1/manager/patients/:id | Get / update / delete patient |
| GET | /v1/manager/metrics | Dashboard metrics (totalPatients, upcomingToday, pendingDocuments) |
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
| PUT | /v1/manager/documents/:id | Update document status |
| GET | /v1/manager/patients/:id/appointments | List patient appointments |
| POST | /v1/manager/appointments | Create appointment |
| PUT/DELETE | /v1/manager/appointments/:id | Update / delete appointment |
| GET | /v1/manager/document-types | List available document types |
| GET | /v1/patient/dashboard | Patient self-service dashboard |
| POST | /v1/patient/auth/login | Patient login (patientKey + deviceId) |
| POST | /v1/auth/login | Staff login |
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

### Key NPM Dependencies
| Package | Purpose |
|---|---|
| `expo` + `expo-router` | Mobile/web framework and routing |
| `@tanstack/react-query` | Server state management |
| `drizzle-orm` + `drizzle-kit` | ORM + migration tooling |
| `express` | Backend HTTP server |
| `jsonwebtoken` + `bcryptjs` | Auth tokens + password hashing |
| `zod` | API input validation |
| `expo-linear-gradient` + `expo-blur` | UI effects |
| `expo-glass-effect` | Native liquid glass tab bar (iOS 26+) |
| `react-native-keyboard-controller` | Keyboard handling |
| `@react-native-async-storage/async-storage` | Persistent token storage |
