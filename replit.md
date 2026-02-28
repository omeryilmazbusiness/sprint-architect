# HealthTour - Replit Project Guide

## Overview

HealthTour is a multi-tenant Health Tourism Operations SaaS platform built as a React Native (Expo) mobile app with an Express.js backend. The app serves three user roles: **ADMIN** (manages all clinics and users), **MANAGER** (manages patients/operations within a specific clinic), and **PATIENT** (mobile user with a simplified login flow).

**Current state:** The app has a working authentication foundation, a tab-based navigation for staff (Dashboard, Patients, Operations, Settings), and a backend API with in-memory storage. The database schema is defined with Drizzle ORM targeting PostgreSQL but the backend currently uses in-memory storage (`MemStorage`) rather than the actual database.

**Core domain concepts:**
- **Clinic** = tenant. All clinic-bound resources carry a `clinicId`.
- **Staff login** uses email + password → JWT access + refresh tokens.
- **Patient login** uses a `patientKey` + `deviceId` with single-device binding enforcement.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend (React Native / Expo)

- **Framework:** Expo with `expo-router` for file-based routing (similar to Next.js but for mobile/web).
- **Navigation structure:**
  - `app/index.tsx` → redirects to `/(auth)/login` or `/(tabs)` based on auth state.
  - `app/(auth)/login.tsx` → login screen supporting both staff and patient modes.
  - `app/(tabs)/` → main app with Dashboard, Patients, Operations, Settings tabs.
- **State management:** React Query (`@tanstack/react-query`) for server state; React Context (`AuthContext`) for authentication state.
- **Auth tokens** are stored in `AsyncStorage` and injected into API requests via the query client.
- **Fonts:** Inter (400, 500, 600, 700) loaded via `@expo-google-fonts/inter`.
- **Theme:** Dual light/dark theme defined in `constants/colors.ts` using `useColorScheme()`.
- **Platform support:** iOS, Android, and Web (with platform-specific adaptations like `KeyboardAwareScrollViewCompat`).

### Backend (Express.js)

- **Framework:** Express 5 with TypeScript, run via `tsx` in development.
- **File structure:**
  - `server/index.ts` → app bootstrap, CORS setup, static file serving.
  - `server/routes.ts` → route registration, mock data endpoints.
  - `server/auth/` → auth subsystem (routes, middleware, JWT, password hashing, in-memory store).
  - `server/storage.ts` → `IStorage` interface + `MemStorage` implementation.
- **Auth system:**
  - JWT access tokens (15 min TTL) and refresh tokens (30 days).
  - `authMiddleware` verifies Bearer tokens and attaches `actor` to `req`.
  - `requireRole()` middleware enforces RBAC.
  - `clinicScopeMiddleware` enforces tenant isolation for MANAGER role.
  - Passwords hashed with bcryptjs (12 rounds).
- **Current data layer:** In-memory store (`server/auth/store.ts`) with seeded demo data. The actual PostgreSQL integration via Drizzle is defined but not yet wired into the Express routes.
- **CORS:** Dynamic CORS based on `REPLIT_DEV_DOMAIN` and `REPLIT_DOMAINS` environment variables.

### Database (Drizzle ORM + PostgreSQL)

- **ORM:** Drizzle with `drizzle-kit` for migrations.
- **Schema** (`shared/schema.ts`) defines:
  - `clinics` table: `id`, `name`, `status` (ACTIVE/INACTIVE/SUSPENDED), `createdAt`.
  - `users` table: `id`, `email`, `passwordHash`, `role` (ADMIN/MANAGER/PATIENT), `clinicId` (FK to clinics, nullable), `status`, `createdAt`.
  - Postgres enums: `clinic_status`, `user_role`, `user_status`.
- **Migration command:** `npm run db:push` (uses `drizzle-kit push`).
- **Config:** `drizzle.config.ts` reads `DATABASE_URL` from environment.
- **Note:** The backend currently uses in-memory storage. Connecting the Drizzle/Postgres layer to Express routes is a pending task.

### Shared Code

- `shared/schema.ts` contains Drizzle table definitions, Zod insert schemas, and TypeScript types used by both server and (potentially) client.
- Path alias `@shared/*` maps to `./shared/*` in TypeScript config.

### API Communication

- The mobile app calls the backend at the URL constructed from `EXPO_PUBLIC_DOMAIN` environment variable.
- `lib/query-client.ts` handles:
  - Base URL resolution.
  - Automatic token refresh on 401 responses.
  - Injecting `Authorization: Bearer <token>` headers.
- API routes are prefixed: `/api/*` for data endpoints, `/v1/auth/*` for auth, `/v1/patient/*` for patient auth, `/v1/me/*` for profile.

### Multi-Tenancy Pattern

- Every clinic-owned resource includes `clinicId`.
- MANAGER requests are scoped to their clinic via `clinicScopeMiddleware`.
- The `ActorContext` (from JWT payload) carries `role`, `sub` (userId), and `clinicId`.
- Repository/storage methods for clinic-owned entities require `clinicId` to prevent cross-tenant data leaks.

---

## External Dependencies

### Runtime Services
- **PostgreSQL database** — Required. Connection string via `DATABASE_URL` environment variable. Currently used only for schema definition; in-memory store is active for runtime.
- **Replit hosting** — The app is designed to run on Replit. CORS and URL configuration depend on `REPLIT_DEV_DOMAIN` and `REPLIT_DOMAINS` env vars. `EXPO_PUBLIC_DOMAIN` must be set for the mobile app to reach the API.

### Key NPM Dependencies
| Package | Purpose |
|---|---|
| `expo` + `expo-router` | Mobile/web app framework and file-based routing |
| `@tanstack/react-query` | Server state management and data fetching |
| `drizzle-orm` + `drizzle-kit` | ORM and migration tooling for PostgreSQL |
| `drizzle-zod` | Auto-generate Zod schemas from Drizzle tables |
| `express` | Backend HTTP server |
| `jsonwebtoken` | JWT signing and verification |
| `bcryptjs` | Password hashing |
| `zod` | Runtime validation for API inputs |
| `@react-native-async-storage/async-storage` | Persistent token storage on device |
| `expo-linear-gradient` | UI gradient effects |
| `expo-blur` | iOS blur effects in tab bar |
| `expo-glass-effect` | Native liquid glass UI (iOS 26+) |
| `react-native-gesture-handler` | Touch gestures |
| `react-native-reanimated` | Animations |
| `expo-haptics` | Haptic feedback on iOS |
| `expo-image-picker` | Document/photo upload (planned) |
| `expo-location` | Location services for transport tracking (planned) |
| `pg` | PostgreSQL Node.js driver (used by Drizzle) |

### Environment Variables Required
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `EXPO_PUBLIC_DOMAIN` | API base URL for the mobile app |
| `REPLIT_DEV_DOMAIN` | Auto-set by Replit for dev environment |
| `REPLIT_DOMAINS` | Auto-set by Replit for allowed CORS origins |