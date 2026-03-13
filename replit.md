# HealthTour - Replit Project Guide

## Overview

HealthTour is a multi-tenant Health Tourism Operations SaaS platform designed for clinics, managers, and patients. It features a React Native (Expo) mobile application and an Express.js backend. The platform streamlines health tourism operations, offering distinct functionalities for different user roles: ADMINs manage clinics and users, MANAGERs oversee clinic-specific operations and patients, and PATIENTs access simplified mobile functionalities.

The project encompasses a comprehensive suite of features including automated billing with a sophisticated scheduler, a credential request workflow for enhanced user management, and robust authentication hardening with detailed password policies, session management, and audit logging. Key capabilities include multi-tenancy support, JWT-based authentication for staff, patient key-based login with single-device binding, and a structured patient plan management system encompassing doctors, hotels, transport, and document tracking. The system also includes integrated PDF upload and download functionalities with role-based access control and pluggable storage solutions (local disk or S3/MinIO).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React Native / Expo)

The frontend is built with Expo using `expo-router` for file-based navigation. It features a role-based navigation structure, directing users to `(auth)` for login/intro, `(manager-tabs)` for managers (5-tab layout: Dashboard, Users, Services, Invoices, Settings), `(admin)` for administrators, `(tabs)` for legacy/shared views, and `(patient)` for patients. Login screen navigates to the correct tab group based on returned role. API interactions are managed through a dedicated client layer, and server state is handled with React Query, while authentication state uses React Context. Tokens are securely stored in `AsyncStorage`. The UI incorporates Inter fonts, a white adminTheme, and a suite of reusable components like `StatusBadge`, `MetricCard`, `LoadingView`, `Card`, `Divider`, `StatusPill`. The Users tab contains a segmented Guests/Doctors control. The patient detail page (`(manager)/patients/[id].tsx`) is a premium single-scrollable page (no tabs) with: a sticky hero header (patient name, status, dates, tracking pill, 4 quick action buttons — Assign Docs, New Appt, Change Doctor, Hotel), and scrollable sections — Overview card (doctor, hotel, transport, assigned documents with View/Download actions, next appointment), Tracking stepper (6 steps: PRE_ARRIVAL → DEPARTURE), and Appointments preview. All write actions open animated slide-up bottom sheet modals. Document viewing uses `expo-web-browser` (openBrowserAsync). Service screens (Doctors, Hotels, Transports, Document Types) all have full CRUD with extended fields.

### Backend (Express.js)

The backend is an Express 5 application developed with TypeScript. Its structure separates concerns into routes, database access (`server/db.ts`), authentication (`server/auth/`), and a repository pattern for database interactions. It includes specific API routes for manager, admin, patient, and general authentication functionalities. The authentication system uses JWT access and refresh tokens, with tokens and device bindings persisted in the database for session continuity. Rate limiting is implemented on critical endpoints. File uploads (PDF only, 10MB max) are handled through a pluggable storage provider, supporting local disk or S3/MinIO, with a provider-agnostic storage key format in the database. Audit logging is implemented to track key actions.

### Database (Drizzle ORM + PostgreSQL)

The application utilizes PostgreSQL with Drizzle ORM. The schema defines core entities such as `clinics`, `users`, `patients`, `doctors`, `hotels`, `transports`, `patientPlans`, `appointments`, `documentTypes`, and `patientDocuments`. It also includes `refreshTokens` for persistent sessions, `devices` for patient single-device binding, `invoices` for billing, `auditLogs` for security, and `notifications` for in-app manager notifications. The database supports multi-tenancy through `clinicId` on relevant resources.

The `clinics` table has the following extended fields: `websiteUrl` (optional URL), `billingEmail` (optional billing-specific email, distinct from contactEmail), `notes` (optional internal notes text), `deletedAt` (soft-delete timestamp, NULL = active, non-NULL = deleted), `primaryManagerUserId` (nullable, soft-FK to users.id — the designated primary manager shown on clinic cards). Services are stored as JSON-encoded arrays of enum codes: `RINOPLASTY`, `EYE`, `DENTAL` — always send and store enum codes, not display labels. Soft-deleted clinics (`deletedAt IS NOT NULL`) are automatically excluded from all list and detail queries; the `softDelete()` method also sets `status = "INACTIVE"` and deactivates all associated MANAGER users.

The `users` table has extended fields: `fullName` (nullable varchar 200 — display name for managers/admins), `phoneE164` (nullable varchar 20 — phone number in E.164 format). These are returned throughout the admin API wherever users are listed.

### Create Manager Flow

The `CreateUserSheet` component (`components/admin/CreateUserSheet.tsx`) provides a premium bottom-sheet modal for creating staff users. It:
- Opens from Clinic Detail ("Create Manager" action row) with clinic pre-filled and locked
- Opens from Users screen ("New User" button) with free clinic selection
- Has a segmented MANAGER/ADMIN role picker
- Collects Full Name (required), Email (required), Phone (optional, E.164)
- Shows a clinic picker (slides up inner picker) for MANAGER role
- Has a "Set as primary manager" toggle (enabled by default)
- On success: shows a one-time OTP modal with the generated password and a Copy button; tapping "Done" dismisses both the OTP modal and the sheet
- Invalidates `/v1/admin/users`, `/v1/admin/clinics`, `/v1/admin/metrics` queries on success

The clinic list cards display `primaryManager.fullName` (or email as fallback) and `primaryManager.phoneE164` (or clinic contactPhone as fallback) in the manager row. The clinic detail managers section also shows fullName + email sub-label.

### Admin Dashboard Module (SOLID)

The `server/modules/adminDashboard/` module implements a SOLID-layered dashboard aggregation:
- **DTO** (`dtos/AdminDashboardDto.ts`): Defines `AdminDashboardDto` — `currentPeriod` (Istanbul TZ), `clinics` counts, `invoices` counts + `totalBilledThisMonth`, `recentInvoices[5]`, `activity[5]` (from audit logs).
- **Repo** (`repos/AdminDashboardReadRepo.drizzle.ts`): Pure Drizzle queries — `getCounts()`, `getTotalBilledThisMonth(period)`, `getRecentInvoices()`, `getActivity()`. Message derivation logic lives here.
- **Use Case** (`usecases/GetAdminDashboardOverview.ts`): Computes Istanbul TZ `currentPeriod`, runs all repo methods in parallel, maps to DTO.
- **Controller** (`adminDashboard.controller.ts`): Calls use case, sends JSON; no business logic.
- **Routes** (`adminDashboard.routes.ts`): `GET /dashboard` — ADMIN only, auth guarded.
- Registered in `server/routes.ts` at `/v1/admin` alongside existing `adminRoutes`.

### Admin Dashboard UI (Modular)

The Admin Dashboard (`app/(admin)/dashboard.tsx`) uses SOLID-friendly modular components:
- **`hooks/useAdminDashboard.ts`**: React Query hook for `/v1/admin/dashboard` (single fetch, 30s stale time, pull-to-refresh).
- **`components/dashboard/BannerCarousel.tsx`**: 3-slide horizontal FlatList (pagingEnabled), dot indicators, `useWindowDimensions` for responsive width. Slides: Billing Overview, Clinics Status, Month Snapshot. Each slide has KPI chips and a white CTA button with smart routing.
- **`components/dashboard/KpiGrid.tsx`**: 2×2 grid of pressable KPI cards (Active Clinics, Suspended, Pending invoices, Unpaid invoices). Each taps to filtered navigation.
- **`components/dashboard/RecentInvoicesList.tsx`**: Last 5 invoices from dashboard DTO — clinic name, period, total, StatusPill. Taps to invoice detail.
- **`components/dashboard/ActivityFeed.tsx`**: Last 5 audit events — icon, message, time-ago. No "Attention needed" language.
- **`services/navigation/filteredNavigation.ts`**: `goToInvoices({ status?, clinicId?, period? })` and `goToClinics({ status? })` — builds params, omits empty/undefined values, uses `router.push`.

### Admin Users Module (SOLID) + Bulk Deactivation

The `server/modules/adminUsers/` module provides SOLID-layered user management:
- **DTO** (`dtos/BulkDeactivateDto.ts`): Defines `BulkDeactivateTarget` (id + entityType) and `BulkDeactivateResultDto` (deactivated count + blocked array with reasons).
- **Repo** (`repos/AdminUsersRepo.drizzle.ts`): Drizzle queries for listing unified entities (managers + patients + admins) with search/filter, and deactivating individual targets. `listUnified` uses `fullName ?? email` for display and searches both name and email columns.
- **Use Case** (`usecases/BulkDeactivateUsers.ts`): Blocks self-deactivation (`SELF_DEACTIVATION_BLOCKED`) and primary manager deactivation (`PRIMARY_MANAGER_BLOCKED`); deactivates valid targets; adds audit log entries.
- **Routes** (`adminUsers.routes.ts`): `POST /v1/admin/users/bulk-deactivate` — ADMIN only, zod-validated (targets array min 1).
- Registered in `server/routes.ts` at `/v1/admin`.

**Frontend bulk deactivation components:**
- `hooks/useSelection.ts`: Selection mode state — `selectionMode`, `selectedIds` (Set), `toggle()`, `enterSelection()`, `exitSelection()`, `selectAll()`, `clearAll()`, `isSelected()`, `count`.
- `hooks/useAdminUsersQuery.ts`: React Query wrapper for `/v1/admin/users` with search/entityType/status/clinicId params. Exports `useInvalidateAdminUsers()` for cache busting after mutations.
- `components/users/UserListRowCard.tsx`: Premium card with circular avatar (2-letter initials), bold name, email subtitle, chip row (clinic, type badge, status pill). Selection mode shows checkbox overlay; long-press enters selection.
- `components/users/SelectionToolbar.tsx`: Sticky bottom bar in selection mode — Cancel | count text | All/None toggle | Deactivate (red, disabled when count=0).
- `components/users/BulkDeleteModal.tsx`: Confirmation modal — warns about primary manager protection, count display, Cancel + Deactivate (with loading spinner) buttons.
- `lib/api/adminUsers.ts`: `bulkDeactivate(targets)` API function using composite IDs (`"MANAGER::uuid"` | `"ADMIN::uuid"` | `"PATIENT::uuid"`).

**`app/(admin)/users/index.tsx` (fully rewritten):**
- Uses `useAdminUsersQuery`, `useSelection`, `UserListRowCard`, `SelectionToolbar`, `BulkDeleteModal`.
- Search bar + 3 filter chips (Clinic, Type, Status) + active filter chips displayed below.
- "Select" button (header right) and long-press on card both enter selection mode.
- In selection mode: filter area hides, SelectionToolbar appears at bottom, tapping rows toggles selection.
- Bulk deactivate: calls `POST /v1/admin/users/bulk-deactivate`, invalidates cache, shows Alert if any blocked.
- Skeleton loading rows while data loads.

### API Routes

The API provides distinct endpoints for different user roles and functionalities. Manager routes (`/v1/manager/*`) handle CRUD operations for patients (with status/missing filters), doctors (with extended fields: email, university, graduationYear, experienceYears, bio, languages, certifications, diplomaUrl), hotels, transports (with vehiclePlate, vehicleModel, vehicleBrand), and patient plans, along with appointment and document management. `doctorId` is required on appointment create/update. `POST /v1/manager/patients/:id/assign-documents` accepts `{items:[{documentTypeId,instructionText?}]}` and performs upsert (creates or resets to ASSIGNED). `PUT /v1/manager/document-types/:id` allows editing document types. `GET /v1/documents/:id/signed-url` returns a short-lived JWT-signed download URL. A clinic-wide appointments range endpoint (`GET /v1/manager/appointments?from=&to=`) powers the calendar dashboard. The premium patient aggregate endpoint (`GET /v1/manager/patients/:id/details`) returns patient + plan + doctor + hotel + transport + documents + requiredDocuments + nextAppointment + appointments + tracking in a single call. A tracking endpoint (`PUT /v1/manager/patients/:id/tracking`) persists the patient journey step. Admin routes (`/v1/admin/*`) provide comprehensive control over clinics, users, and invoices. Patient routes include document uploads with `uploadedAt` tracking. Authentication routes cover staff and patient login, token refresh, and logout.

## External Dependencies

### Runtime Services

-   **PostgreSQL**: Essential for all data persistence. Configured via the `DATABASE_URL` environment variable.
-   **Replit Hosting**: Manages CORS through `REPLIT_DEV_DOMAIN` and `REPLIT_DOMAINS`, and API URL via `EXPO_PUBLIC_DOMAIN`.

### Environment Variables Required

-   `DATABASE_URL`: PostgreSQL connection string.
-   `SESSION_SECRET`: Used for session signing.
-   `EXPO_PUBLIC_DOMAIN`: API base URL for the mobile application.
-   `REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`: Auto-set by Replit for development and CORS.
-   `STORAGE_PROVIDER`: Specifies storage backend (`local` or `s3`).
-   `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`: S3 credentials, required if `STORAGE_PROVIDER` is `s3`.
-   `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`: Optional, for MinIO compatibility.

### Key NPM Dependencies

-   `expo`, `expo-router`: Core mobile development framework and routing.
-   `@tanstack/react-query`: For server state management in the frontend.
-   `drizzle-orm`, `drizzle-kit`: ORM for PostgreSQL and database migration tooling.
-   `express`: Backend web framework.
-   `jsonwebtoken`, `bcryptjs`: For authentication token handling and password hashing.
-   `zod`: Schema validation for API inputs.
-   `multer`: Middleware for handling multipart form data, primarily file uploads.
-   `express-rate-limit`: For API rate limiting.
-   `@aws-sdk/client-s3`: AWS SDK for S3/MinIO integration.
-   `date-fns`: Date utility library used by the manager calendar dashboard.