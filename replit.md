# HealthTour - Replit Project Guide

## Overview

HealthTour is a multi-tenant Health Tourism Operations SaaS platform designed for clinics, managers, and patients. It features a React Native (Expo) mobile application and an Express.js backend. The platform streamlines health tourism operations, offering distinct functionalities for different user roles: ADMINs manage clinics and users, MANAGERs oversee clinic-specific operations and patients, and PATIENTs access simplified mobile functionalities.

The project encompasses a comprehensive suite of features including automated billing with a sophisticated scheduler, a credential request workflow for enhanced user management, and robust authentication hardening with detailed password policies, session management, and audit logging. Key capabilities include multi-tenancy support, JWT-based authentication for staff, patient key-based login with single-device binding, and a structured patient plan management system encompassing doctors, hotels, transport, and document tracking. The system also includes integrated PDF upload and download functionalities with role-based access control and pluggable storage solutions (local disk or S3/MinIO).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React Native / Expo)

The frontend is built with Expo using `expo-router` for file-based navigation. It features a role-based navigation structure, directing users to `(auth)` for login/intro, `(manager-tabs)` for managers (5-tab layout: Dashboard, Users, Services, Invoices, Settings), `(admin)` for administrators, `(tabs)` for legacy/shared views, and `(patient)` for patients. Login screen navigates to the correct tab group based on returned role. API interactions are managed through a dedicated client layer, and server state is handled with React Query, while authentication state uses React Context. Tokens are securely stored in `AsyncStorage`. The UI incorporates Inter fonts, a white adminTheme, and a suite of reusable components like `StatusBadge`, `MetricCard`, `LoadingView`, `Card`, `Divider`, `StatusPill`. The Users tab contains a segmented Guests/Doctors control. The patient detail page (`(manager)/patients/[id].tsx`) is a premium single-scrollable page (no tabs) with: a sticky hero header (patient name, status, dates, tracking pill, 3 quick action buttons), and scrollable sections — Overview card (doctor, hotel, transport, required docs: Passport Photocopy + Visa with status, next appointment), Tracking stepper (6 steps: PRE_ARRIVAL → DEPARTURE), and Appointments preview. All write actions (Assign Documents, Create Appointment, Change Doctor) open animated slide-up bottom sheet modals (React Native Modal + Animated, no external libraries).

### Backend (Express.js)

The backend is an Express 5 application developed with TypeScript. Its structure separates concerns into routes, database access (`server/db.ts`), authentication (`server/auth/`), and a repository pattern for database interactions. It includes specific API routes for manager, admin, patient, and general authentication functionalities. The authentication system uses JWT access and refresh tokens, with tokens and device bindings persisted in the database for session continuity. Rate limiting is implemented on critical endpoints. File uploads (PDF only, 10MB max) are handled through a pluggable storage provider, supporting local disk or S3/MinIO, with a provider-agnostic storage key format in the database. Audit logging is implemented to track key actions.

### Database (Drizzle ORM + PostgreSQL)

The application utilizes PostgreSQL with Drizzle ORM. The schema defines core entities such as `clinics`, `users`, `patients`, `doctors`, `hotels`, `transports`, `patientPlans`, `appointments`, `documentTypes`, and `patientDocuments`. It also includes `refreshTokens` for persistent sessions, `devices` for patient single-device binding, `invoices` for billing, `auditLogs` for security, and `notifications` for in-app manager notifications. The database supports multi-tenancy through `clinicId` on relevant resources.

### API Routes

The API provides distinct endpoints for different user roles and functionalities. Manager routes (`/v1/manager/*`) handle CRUD operations for patients (with status/missing filters), doctors, hotels, transports, and patient plans, along with appointment and document management, clinic-specific invoices, and in-app notifications (`/v1/manager/notifications/*`). A clinic-wide appointments range endpoint (`GET /v1/manager/appointments?from=&to=`) powers the calendar dashboard. A premium patient aggregate endpoint (`GET /v1/manager/patients/:id/details`) returns patient + plan + doctor + hotel + transport + documents + `requiredDocuments` (PASSPORT_COPY, VISA with status) + `nextAppointment` + appointments + tracking in a single call. `POST /v1/manager/patients/:id/assign-documents` accepts `{ documentTypeCodes: string[] }` (e.g. ["PASSPORT_COPY","VISA"]) and looks up doc types by code within the clinic. A tracking endpoint (`PUT /v1/manager/patients/:id/tracking`) persists the patient journey step (PRE_ARRIVAL, ARRIVAL_TRANSFER, HOTEL_CHECKIN, TREATMENT, FOLLOWUP, DEPARTURE) in `patient_plans.currentStep`. Admin routes (`/v1/admin/*`) provide comprehensive control over clinics, users, and invoices across the entire platform, including user creation, password resets, and invoice status management. Patient-specific routes include document uploads and access to a self-service dashboard. Authentication routes cover staff and patient login, token refresh, and logout.

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