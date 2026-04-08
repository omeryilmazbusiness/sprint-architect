# HealthTour - Replit Project Guide

## Overview

HealthTour is a multi-tenant Health Tourism Operations SaaS platform comprising a React Native (Expo) mobile application and an Express.js backend. Its purpose is to streamline health tourism for clinics, managers, and patients. Key features include automated billing, a credential request workflow, robust authentication (JWT for staff, key-based for patients with device binding), a structured patient plan management system (doctors, hotels, transport, documents), integrated PDF handling with role-based access, and pluggable storage. The platform aims to provide a comprehensive solution for managing health tourism operations efficiently.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React Native / Expo)

The mobile application is built with Expo and uses `expo-router` for file-based navigation, supporting role-based access for admin, manager, and patient roles. It employs React Query for server state management and React Context for authentication state, persisting tokens in `AsyncStorage`. The UI features a consistent design with **Plus Jakarta Sans** fonts (weights: 400/500/600/700 via `@expo-google-fonts/plus-jakarta-sans`) and a white adminTheme, utilizing reusable components. A centralized typography system lives in `constants/typography.ts` — use `Fonts.*` for font family tokens and `TS.*` for preset text styles (display, pageTitle, sectionTitle, cardHeading, body, caption, badge, button, kpiValue, tableHeader, etc.). Key UI elements include segmented controls, premium patient detail pages with sticky headers, scrollable sections, and bottom sheet modals for interactive actions. Document viewing is handled via `expo-web-browser`. All service screens (Doctors, Hotels, Transports, Document Types) support full CRUD operations.

### Backend (Express.js)

The backend is an Express 5 application developed in TypeScript, adhering to a structured separation of concerns (routes, database access, authentication, repository pattern). It provides distinct API routes for managers, administrators, patients, and general authentication. Authentication is implemented using JWT access and refresh tokens, with session and device binding information persisted in the database. Rate limiting is applied to critical endpoints. File uploads (PDF only, max 10MB) are managed by a pluggable storage provider that supports local disk or S3/MinIO. An audit logging system tracks significant actions.

### Database (Drizzle ORM + PostgreSQL)

The application utilizes Replit's built-in PostgreSQL, managed with Drizzle ORM (`drizzle-orm/node-postgres`). The schema includes entities for clinics, users, patients, doctors, hotels, transports, patient plans, appointments, document types, patient documents, refresh tokens, devices, invoices, audit logs, and notifications. Multi-tenancy is enforced through `clinicId` on relevant resources. The system includes robust mechanisms for test and production database separation, along with scripts for safe database resets. A Transaction Manager ensures atomicity for critical workflows, such as user/patient deactivation and invoice status updates.

### Modules and Features

-   **Admin Dashboard:** A SOLID-layered module aggregates dashboard data, including counts, billing totals, recent invoices, and audit log activity, exposed via `GET /v1/admin/dashboard`. The UI presents this data through modular components like `BannerCarousel`, `KpiGrid`, `RecentInvoicesList`, and `ActivityFeed`.
-   **Manager Dashboard:** A SOLID-layered module at `server/modules/managerDashboard/` exposes `GET /v1/manager/dashboard` (always returns 200 with defaults). Returns stable DTO: `kpis` (activeGuests, appointmentsToday, pendingDocuments, missingAssignments), `upcomingNext7Days`, `arrivingThisMonth`, `todayAppointments[]`, `monthAppointments[]`, `pendingGuestDocs[]` (per-guest pending doc breakdown: patientId, patientName, pending, uploaded, pendingDocNames[]). Frontend uses `useManagerDashboard` hook (staleTime 60s) and components: `ManagerBannerCarousel` (3-slide 3D gradient carousel reusing `BannerSlide`), `ManagerKpiGrid` (3 KPIs: Active Guests, Appts Today, Upcoming 7 Days — "Arrivals This Month" removed), `ManagerQuickActions` (horizontal scroll, 6 chips), `PendingDocumentsSection` (per-guest pending doc cards with names), `ManagerTodaysAppointments` (rows + premium empty state). Dashboard screen at `app/(manager-tabs)/dashboard.tsx` is thin composition.
-   **i18n System (Admin + Manager + Guest — 100% complete):** Full internationalization for all three roles. Dictionaries live in `i18n/` (`types.ts`, `en.ts`, `ru.ts`, `index.ts`). `LanguageProvider` in `context/LanguageContext.tsx` (root `app/_layout.tsx`) persists locale to `AsyncStorage` under `@app:locale`. `useT()` hook in `hooks/useT.ts` returns the typed `AppDict` for the active locale. `LanguageSelectorSheet` for admin/manager; `LanguageSwitcherButton` (`components/common/LanguageSwitcherButton.tsx`) in all guest headers. Guest sections fully migrated: `app/(patient)/dashboard.tsx`, `track.tsx`, `schedule.tsx`, `notifications.tsx`, `explore.tsx`, `profile.tsx`, `_layout.tsx` tab labels, plus all `components/guestDashboard/` and `components/guest/GuestHeader.tsx`. All module-level arrays with translated text moved inside component bodies to react to locale changes. Locale-aware date formatting uses `locale === "ru" ? "ru-RU" : "en-US"` via `useLanguage()`. Adding new pages: extend `AppDict` in `i18n/types.ts` + add keys to `en.ts`/`ru.ts`, then call `useT()`.
-   **AdminHeader:** A versatile header component dynamically adjusts based on context (main or back mode), displaying dynamic data like unread counts, system health, environment labels, language switcher (globe/flag button → `LanguageSelectorSheet`), and user profile information.
-   **Admin Diagnostics:** A SOLID-layered module providing `GET /v1/admin/diagnostics`, offering real-time system health checks (API and DB status, environment details) without revealing sensitive information. The Admin Settings screen provides a consolidated view of diagnostics, billing policies, support information, and data management.
-   **Admin Patients:** A SOLID-layered module for patient management, including schemas, repositories for data access, use cases for business logic (e.g., `GetPatientSummary`, `DeactivatePatient`, `RegenerateAccessKey`), and corresponding API routes. Frontend components include a `PatientSummarySheet` for viewing and managing patient details and access keys.
-   **Admin Users & Bulk Deactivation:** A SOLID-layered module for user management, including bulk deactivation. It provides DTOs for deactivation targets, a repository for unified user listings, and a use case for handling bulk deactivation logic with guards against self-deactivation and primary manager deactivation.
-   **Error Handling:** A shared error infrastructure centralizes error codes, uses a typed `AppError` class, assigns unique `requestId` to each request, and employs a `globalErrorHandler` for structured JSON error responses.
-   **Circuit Breaker:** Implemented as a state machine (CLOSED → OPEN → HALF_OPEN) to enhance resilience, particularly for external services like email providers.
-   **System Error UI:** A frontend `SystemErrorContext` and `MaintenanceBottomSheet` provide a global mechanism to display system-level errors to users, automatically triggered by 5xx API responses, showing `errorCode` and `requestId` for support.

### Production Hardening Pass (April 2026)

-   **Cinematic Welcome Screen** (`components/StartupScreen.tsx`): Full rebuild using the provided dark circle image as a full-screen cover background. Layers: breathing scale animation (1→1.05, 5 s loop), horizontal light sweep (very-low-opacity LinearGradient, translateX), top/bottom/side depth gradient overlays. HEALORY title with letter-spacing 12, gold underline rule, fades in +10px rise at 300 ms. Tagline delayed 400 ms. Loading line at bottom: 72% wide, gradient white→gold, fills over TOTAL_MS (3.6 s). All `pointerEvents` moved to `style.pointerEvents` (no deprecated prop).
-   **Backend Trust Proxy** (`server/index.ts`): Added `app.set("trust proxy", 1)` immediately after Express init. Resolves `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` thrown by `express-rate-limit` when running behind Replit's reverse proxy — fixes rate-limiting for patient login, upload, and credential-request routes.
-   **Login Screen i18n** (`app/(auth)/login.tsx`): Full rewrite. All strings served via `useT().loginScreen` (28-key `LoginScreenDict`). Language selector pill (top-right) + `LangPickerModal` with all 4 locales. `friendlyError(e, ls)` maps auth error codes to translated messages. `useT` correctly imported from `@/hooks/useT`.
-   **Hotels Screen** (`app/(manager)/hotels/index.tsx`): Added search bar (client-side filter by name/address/phone, `useMemo`). Replaced `Alert.alert` error pattern with local toast state (`showToast`), consistent with Doctors/Transports screens. Delete confirmation uses i18n keys from `th.deleteTitle/deleteMsg/deleteConfirm`. Save/delete success/error shows translated toast. Fixed `(e: any)` → `(e: Error)` in mutation handlers.
-   **i18n — Hotels dict** (`i18n/types.ts`, `en.ts`, `ru.ts`, `tr.ts`, `es.ts`): Added 8 new keys to `ManagerHotelsDict`: `searchPlaceholder`, `emptySearchText`, `deleteTitle`, `deleteMsg` (with `{name}` placeholder), `deleteConfirm`, `toastAdded`, `toastUpdated`, `toastRemoved`, `toastError` — all translated across all 4 locales.
-   **Locale-aware Date Formatting** (`app/(manager)/patients/[id].tsx`): `fmtDateTime(iso, bcp47)` now accepts a `bcp47` locale parameter (default `"en-US"`). Component reads `useLanguage().locale`, maps it through `LOCALE_BCP47` (`en→en-US, ru→ru-RU, tr→tr-TR, es→es-ES`), and passes `bcp47` to all `fmtDateTime` calls. Dates in patient appointments now display in the active UI language.
-   **Typography Migration — Inter → Plus Jakarta Sans**: Global font swap across all 113 source files. `@expo-google-fonts/plus-jakarta-sans` installed. All 4 font constants renamed (`PlusJakartaSans_400Regular/500Medium/600SemiBold/700Bold`). `lib/fonts/FontLoader.ts` updated to import from `@expo-google-fonts/plus-jakarta-sans`; web branch passes `{}` to `useFonts()` (eliminates 6000ms FontFaceObserver rejection). Centralized typography system created at `constants/typography.ts` — `Fonts.*` tokens + `TS.*` preset text style objects covering the full visual hierarchy (display → caption → badge → tableHeader).
-   **Manager Patient Detail — Full i18n (22 new keys)**: All hardcoded English toast and alert messages in `app/(manager)/patients/[id].tsx` replaced with `t.managerPatient.*` keys. 22 new keys added to `ManagerPatientDict` in `i18n/types.ts` and translated across all 4 locales (en/ru/tr/es): `toastApproved`, `toastApprovalFailed`, `toastResetDevice`, `toastResetDeviceFailed`, `toastStepFailed`, `toastTransportAssigned`, `toastTransportFailed`, `toastHotelAssigned`, `toastHotelFailed`, `toastDocAssigned`, `toastDocAssignFailed`, `toastDocStatusUpdated`, `toastDocStatusFailed`, `toastApptCancelled`, `toastApptCancelFailed`, `toastPreparingDoc`, `toastPdfError`, `toastApptCreated`.

### Guest Patient UX

-   **Dashboard — Doctors Carousel** (`components/guestDashboard/DoctorsCarousel.tsx`): Premium vertical card carousel. Each slide shows: avatar/photo, full name, specialty, university, experience years, bio (2 lines, italic), language chips, diploma badge, and contact action buttons (Call / Email) when fields exist. Flexible height (no fixed CARD_H).
-   **Schedule Screen** (`app/(patient)/schedule.tsx`): Dropdown-filter UX replacing chip tabs. Top summary section: Next Appointment card + 3 KPI mini-cards (Upcoming / Completed / Missed). FilterBar: debounced search + Status dropdown (All/Upcoming/Today/Completed/Missed/Cancelled) + Range dropdown (All Time/This Week/This Month) with clear button. Appointment list uses `SectionList` grouped by date with section headers. Picker uses `Modal` (Expo Go safe). Logic extracted to `hooks/guest/useGuestScheduleFilters.ts`.
-   **Profile Screen** (`app/(patient)/profile.tsx`): Streamlined to 3 essential sections only — Person Info (name/flag/patientKey copy/phone/email/dates), Clinic Info (name/address/phone/email/website), Manager Contact (fullName/phone/email). Removed Care Plan and App Info sections.
-   **Dashboard API Extension** (`server/api/patientDashboardRoute.ts`): Patient response now includes `clinicAddress`, `clinicWebsite`, `manager: {fullName, phone, email}` (looked up from `clinic.primaryManagerUserId → users`). Doctors array now includes `bio` and `email`.

### API Routes

The API is structured with specific routes for different user roles:
-   **CreateGuestSheet (`components/managerGuests/CreateGuestSheet.tsx`):** Full-featured modal form for creating new patients (guests). Sections: Identity (name, DOB via DatePickerModal with maxDate=today, gender chips, nationality picker, passport), Contact (PhonePickerInput, email), Companion (collapsible, with PhonePickerInput + relation chips), Travel & Service (multi-select services picker from 11 enum values with chip display + X-remove, arrival/departure DatePickerModal, airport, flight), Notes. Post-creation shows a success/key-reveal screen with the patient key and Share/Open Guest actions. Backend schema: `createPatientSchema` requires `requestedServices` (array of enum, min 1); `updatePatientSchema` supports optional `requestedServices`. DB column `requested_services` (text, JSON-serialized array). Backward compat: if `requestedServices` null but `requestedService` set, returns `[requestedService]`. `users.tsx` Guests tab was refactored to use CreateGuestSheet (removed the old embedded 2-step create form).
-   **patientKey format:** `PT-` + 8 random chars from full `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789` charset (previously excluded I, O, 0, 1). `MAX_KEY_ATTEMPTS=5`, retry loop in repo. Regex: `/^PT-[A-Z0-9]{8}$/`.
-   **DatePickerModal (`components/manager/DatePickerModal.tsx`):** Now supports `maxDate` prop (in addition to `minDate`) to prevent future date selection — used by DOB picker to restrict to past/today only.
-   **Toast durations:** Standardized in `app/(manager)/doctors/index.tsx` and `app/(manager-tabs)/users.tsx`: success=1200ms, error=2000ms.
-   **Patient Approval Workflow:** New `WAITING_APPROVAL` status added to `patientStatusEnum`. All new patients default to `WAITING_APPROVAL`. `approvedAt` timestamp column added to `patients` table. SOLID `ApprovePatient` use case at `server/modules/managerPatients/usecases/ApprovePatient.ts` handles approval: sets status=APPROVED, stamps `approvedAt`, creates a `billing_events` record (clinicId, patientId, period=arrivalDate month or current month). Endpoint: `POST /v1/manager/patients/:id/approve` (idempotent — returns `alreadyApproved: true` if already approved). `billing_events` table has unique constraint on (clinicId, period, patientId). Frontend: patient detail screen shows amber "Waiting for approval" banner (WAITING_APPROVAL) or yellow "Awaiting approval" banner (PENDING), both with "Approve Guest" button using `window.confirm()` on web and `Alert.alert()` on native. StatusPill now maps raw status codes to human-readable labels (WAITING_APPROVAL→"Waiting Approval", APPROVED→"Approved", etc.). Filter sheet includes "Waiting Approval" option.
-   **Manager Guest Detail (SOLID module):** `server/modules/managerGuestDetail/` — exposes `GET /v1/manager/patients/:id/details` (mounted before legacy `managerRoutes` to take precedence). Always returns stable DTO: `{ patient, tracking: { currentStep }, assignments: { transport|null, hotel|null }, documents: { assigned:[], summary: { pending:0, uploaded:0 } }, nextAppointment|null }`. Crash-safe: all arrays are `[]`, nullables are `null` not `undefined`. Frontend rebuilt at `app/(manager)/patients/[id].tsx` using modular `components/guestDetail/` components: `GuestHeroCard`, `GuestTrackingStepper` (6-step stepper with update sheet), `TransportAssignmentCard`, `HotelAssignmentCard`, `DocumentsAssignmentCard`, `AssignTransportSheet`, `AssignHotelSheet`, `AssignDocTypeSheet`.
-   **Manager Routes (`/v1/manager/*`):** CRUD operations for patients, doctors, hotels, transports, patient plans, appointments, and documents. Includes endpoints for document assignment, signed URL generation, and aggregated patient details.
-   **Admin Routes (`/v1/admin/*`):** Management of clinics, users, and invoices.
-   **Patient Routes:** Support for document uploads.
-   **Authentication Routes:** Handle staff and patient login, token refresh, and logout.

## External Dependencies

### Runtime Services

-   **PostgreSQL**: The primary relational database for all application data, configured via `DATABASE_URL`.
-   **Replit Hosting**: Provides the execution environment and handles network configurations like CORS.

### Environment Variables

-   `DATABASE_URL`: Connection string for PostgreSQL.
-   `SESSION_SECRET`: Secret key for session signing.
-   `EXPO_PUBLIC_DOMAIN`: Base URL for the mobile application's API calls.
-   `REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`: Replit-specific variables for managing CORS policies.
-   `STORAGE_PROVIDER`: Configures the storage backend, accepting `local` or `s3`.
-   `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`: Credentials for S3-compatible storage services when `STORAGE_PROVIDER` is `s3`.
-   `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`: Optional parameters for MinIO compatibility.

### Key NPM Packages

-   `expo`, `expo-router`: Core frameworks for mobile development and navigation.
-   `@tanstack/react-query`: Used for managing and caching server state in the frontend.
-   `drizzle-orm`, `drizzle-kit`: ORM for database interactions and schema migrations.
-   `express`: The foundational web framework for the backend.
-   `jsonwebtoken`, `bcryptjs`: Essential for handling authentication tokens and secure password hashing.
-   `zod`: Utilized for robust schema validation, particularly for API input.
-   `multer`: Middleware for handling file uploads in Express.js.
-   `express-rate-limit`: For implementing rate limiting on API endpoints to prevent abuse.
-   `@aws-sdk/client-s3`: Provides client functionality for integrating with S3-compatible object storage.
-   `date-fns`: A comprehensive utility library for date manipulation.