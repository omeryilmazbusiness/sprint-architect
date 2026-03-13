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

### Admin Users Module + Bulk Deactivation

The `server/modules/adminUsers/` module provides SOLID-layered user management, including bulk deactivation. It defines DTOs for deactivation targets and results. A repository handles listing unified entities (managers, patients, admins) with search/filter, and individual deactivation. A use case manages bulk deactivation logic, preventing self-deactivation and primary manager deactivation, and adding audit logs. The API exposes `POST /v1/admin/users/bulk-deactivate`. Frontend components include `useSelection` hook, `UserListRowCard` for user display with selection, `SelectionToolbar` for bulk actions, and `BulkDeleteModal` for confirmation. The `app/(admin)/users/index.tsx` screen is fully rewritten to incorporate these features.

### API Routes

The API includes manager routes (`/v1/manager/*`) for CRUD operations on patients, doctors, hotels, transports, patient plans, appointments, and documents, including specific endpoints for document assignment, signed URL generation, and patient details aggregation. Admin routes (`/v1/admin/*`) control clinics, users, and invoices. Patient routes support document uploads. Authentication routes handle staff and patient login, token refresh, and logout.

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