# HealthTour - Replit Project Guide

## Overview

HealthTour is a multi-tenant Health Tourism Operations SaaS platform comprising a React Native (Expo) mobile application and an Express.js backend. Its purpose is to streamline health tourism for clinics, managers, and patients. Key features include automated billing, a credential request workflow, robust authentication (JWT for staff, key-based for patients with device binding), a structured patient plan management system (doctors, hotels, transport, documents), integrated PDF handling with role-based access, and pluggable storage. The platform aims to provide a comprehensive solution for managing health tourism operations efficiently.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React Native / Expo)

The mobile application is built with Expo and uses `expo-router` for file-based navigation, supporting role-based access for admin, manager, and patient roles. It employs React Query for server state management and React Context for authentication state, persisting tokens in `AsyncStorage`. The UI features a consistent design with Inter fonts and a white adminTheme, utilizing reusable components. Key UI elements include segmented controls, premium patient detail pages with sticky headers, scrollable sections, and bottom sheet modals for interactive actions. Document viewing is handled via `expo-web-browser`. All service screens (Doctors, Hotels, Transports, Document Types) support full CRUD operations.

### Backend (Express.js)

The backend is an Express 5 application developed in TypeScript, adhering to a structured separation of concerns (routes, database access, authentication, repository pattern). It provides distinct API routes for managers, administrators, patients, and general authentication. Authentication is implemented using JWT access and refresh tokens, with session and device binding information persisted in the database. Rate limiting is applied to critical endpoints. File uploads (PDF only, max 10MB) are managed by a pluggable storage provider that supports local disk or S3/MinIO. An audit logging system tracks significant actions.

### Database (Drizzle ORM + PostgreSQL)

The application utilizes Replit's built-in PostgreSQL, managed with Drizzle ORM (`drizzle-orm/node-postgres`). The schema includes entities for clinics, users, patients, doctors, hotels, transports, patient plans, appointments, document types, patient documents, refresh tokens, devices, invoices, audit logs, and notifications. Multi-tenancy is enforced through `clinicId` on relevant resources. The system includes robust mechanisms for test and production database separation, along with scripts for safe database resets. A Transaction Manager ensures atomicity for critical workflows, such as user/patient deactivation and invoice status updates.

### Modules and Features

-   **Admin Dashboard:** A SOLID-layered module aggregates dashboard data, including counts, billing totals, recent invoices, and audit log activity, exposed via `GET /v1/admin/dashboard`. The UI presents this data through modular components like `BannerCarousel`, `KpiGrid`, `RecentInvoicesList`, and `ActivityFeed`.
-   **AdminHeader:** A versatile header component dynamically adjusts based on context (main or back mode), displaying dynamic data like unread counts, system health, environment labels, and user profile information.
-   **Admin Diagnostics:** A SOLID-layered module providing `GET /v1/admin/diagnostics`, offering real-time system health checks (API and DB status, environment details) without revealing sensitive information. The Admin Settings screen provides a consolidated view of diagnostics, billing policies, support information, and data management.
-   **Admin Patients:** A SOLID-layered module for patient management, including schemas, repositories for data access, use cases for business logic (e.g., `GetPatientSummary`, `DeactivatePatient`, `RegenerateAccessKey`), and corresponding API routes. Frontend components include a `PatientSummarySheet` for viewing and managing patient details and access keys.
-   **Admin Users & Bulk Deactivation:** A SOLID-layered module for user management, including bulk deactivation. It provides DTOs for deactivation targets, a repository for unified user listings, and a use case for handling bulk deactivation logic with guards against self-deactivation and primary manager deactivation.
-   **Error Handling:** A shared error infrastructure centralizes error codes, uses a typed `AppError` class, assigns unique `requestId` to each request, and employs a `globalErrorHandler` for structured JSON error responses.
-   **Circuit Breaker:** Implemented as a state machine (CLOSED → OPEN → HALF_OPEN) to enhance resilience, particularly for external services like email providers.
-   **System Error UI:** A frontend `SystemErrorContext` and `MaintenanceBottomSheet` provide a global mechanism to display system-level errors to users, automatically triggered by 5xx API responses, showing `errorCode` and `requestId` for support.

### API Routes

The API is structured with specific routes for different user roles:
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