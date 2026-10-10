# Repository & System Inventory

> **Verification Status:** All claims in this document are **Verified** from direct source-code inspection unless explicitly marked otherwise.

## 1. Repository Overview

| Property | Value |
|---|---|
| Repository Root | `c:\Projects\ERP-System` |
| Architecture | Monorepo — two co-located deployable applications |
| Frontend root | `frontend/` |
| Backend root | `backend/` |
| Shared infrastructure | `docker-compose.yml`, `vercel.json`, root `package.json` |
| Existing documentation | `docs/PHASE_2_AI_ML_ROADMAP.md` (roadmap only) |

---

## 2. Directory Inventory

```
ERP-System/
+-- .dockerignore
+-- .gitignore
+-- README.md
+-- docker-compose.yml          ? Docker Compose for local full-stack dev/production
+-- package.json                ? Root-level scripts
+-- vercel.json                 ? Vercel multi-service deployment config
+-- docs/
¦   +-- PHASE_2_AI_ML_ROADMAP.md   ? AI/ML future roadmap (pre-existing)
+-- backend/
¦   +-- Dockerfile
¦   +-- .env.example
¦   +-- package.json
¦   +-- tsconfig.json
¦   +-- vercel.json             ? Backend-specific Vercel config
¦   +-- prisma7.config.ts
¦   +-- prisma/
¦   ¦   +-- schema.prisma       ? AUTHORITATIVE schema (667 lines, 21 models)
¦   ¦   +-- seed.ts             ? Development seed (comprehensive)
¦   ¦   +-- seed.js             ? Alternative JS seed
¦   ¦   +-- seed.production.ts  ? Production seed (minimal)
¦   ¦   +-- repair-library.ts   ? One-off repair script
¦   ¦   +-- migrations/
¦   ¦       +-- migration_lock.toml
¦   ¦       +-- 202608310001_init/
¦   ¦           +-- migration.sql  ? Single comprehensive initial migration
¦   +-- src/
¦       +-- index.ts            ? Express server entry point
¦       +-- config/
¦       ¦   +-- db.ts           ? Prisma client singleton
¦       ¦   +-- env.ts          ? Environment validation
¦       +-- middlewares/
¦       ¦   +-- authMiddleware.ts   ? JWT authentication
¦       ¦   +-- roleMiddleware.ts   ? Role-based authorization
¦       ¦   +-- errorHandler.ts    ? Global error handler
¦       +-- routes/             ? 13 route modules
¦       +-- controllers/        ? 13 controller modules
¦       +-- services/           ? Empty directory (no service layer implemented)
¦       +-- types/              ? Type definitions
+-- frontend/
    +-- Dockerfile
    +-- nginx.conf              ? Nginx config (proxies /api to backend)
    +-- package.json
    +-- vite.config.ts
    +-- tailwind.config.js
    +-- src/
        +-- main.tsx            ? React entry point
        +-- index.css           ? Global styles
        +-- api/
        ¦   +-- apiCall.ts      ? Auto-generated typed API client (860 lines)
        ¦   +-- apiInterface.ts ? TypeScript types for all API I/O
        ¦   +-- customApi.ts    ? Handwritten supplemental API calls
        ¦   +-- openapi-operations.json
        +-- app/
        ¦   +-- router.generated.tsx ? Auto-generated React Router (521 lines)
        ¦   +-- providers.tsx
        +-- contexts/
        ¦   +-- AuthContext.tsx ? JWT auth state management
        +-- pages/              ? 44 page components
        +-- features/           ? 6 feature sub-directories
        +-- components/
        ¦   +-- shared/         ? ErrorBoundary, ProtectedRoute, SeoManager, etc.
        ¦   +-- ui/             ? UI primitive components
        +-- lib/                ? Utilities
```

---

## 3. Technology Stack Matrix

### Backend

| Technology | Version | Purpose | Evidence |
|---|---|---|---|
| Node.js | (runtime) | JavaScript runtime | `backend/Dockerfile` |
| TypeScript | ~5.x | Language | `backend/tsconfig.json` |
| Express.js | ^4.19.2 | HTTP framework | `backend/package.json` |
| Prisma ORM | ^7.10.0 | ORM + migrations | `backend/package.json` |
| `@prisma/adapter-pg` | ^7.10.0 | PostgreSQL adapter | `backend/src/config/db.ts` |
| PostgreSQL | 16-alpine | Primary database | `docker-compose.yml` |
| `pg` (node-postgres) | ^8.23.0 | Connection pool | `backend/src/config/db.ts` |
| `jsonwebtoken` | ^9.0.3 | JWT signing/verification | `backend/package.json` |
| `bcryptjs` | ^3.0.3 | Password hashing | `backend/package.json` |
| `helmet` | ^8.3.0 | Secure HTTP headers | `backend/src/index.ts` |
| `express-rate-limit` | ^8.7.0 | Rate limiting | `backend/src/index.ts` |
| `morgan` | ^1.12.0 | HTTP request logging | `backend/src/index.ts` |
| `cors` | ^2.8.5 | CORS handling | `backend/src/index.ts` |
| `dotenv` | ^16.4.5 | Env variable loading | `backend/src/config/env.ts` |

### Frontend

| Technology | Version | Purpose | Evidence |
|---|---|---|---|
| React | ^18.2.0 | UI framework | `frontend/package.json` |
| TypeScript | ^5.2.2 | Language | `frontend/package.json` |
| Vite | ^5.2.0 | Build tool / dev server | `frontend/vite.config.ts` |
| React Router DOM | ^6.22.3 | Client-side routing | `frontend/src/app/router.generated.tsx` |
| TanStack Query | ^5.28.4 | Server state management | `frontend/src/main.tsx` |
| TailwindCSS | ^3.4.1 | Utility-first CSS | `frontend/tailwind.config.js` |
| Radix UI | ^1-2.x | Headless UI primitives | `frontend/package.json` |
| Recharts | ^3.10.1 | Data visualisation | `frontend/package.json` |
| Lucide React | ^0.364.0 | Icon library | `frontend/package.json` |
| Sonner | ^1.4.41 | Toast notifications | `frontend/src/main.tsx` |
| Motion | ^13.1.1 | Animation library | `frontend/package.json` |
| `date-fns` | ^4.4.0 | Date utilities | `frontend/package.json` |
| `@vercel/analytics` | ^2.0.1 | Vercel web analytics | `frontend/src/main.tsx` |
| Fontsource | ^5.x | Self-hosted web fonts | `frontend/package.json` |
| Nginx | (docker) | Static file serving + proxy | `frontend/nginx.conf` |

### Infrastructure & Deployment

| Technology | Purpose | Evidence |
|---|---|---|
| Docker / Docker Compose | Containerised full-stack | `docker-compose.yml` |
| Vercel | Cloud deployment | `vercel.json` |
| Nginx | Reverse proxy (Docker) | `frontend/nginx.conf` |

---

## 4. Application Entry Points

### Backend

| Artifact | Path | Description |
|---|---|---|
| Server init | `backend/src/index.ts` | Validates env, applies middleware, mounts routes, starts HTTP |
| Env validation | `backend/src/config/env.ts` | Requires `DATABASE_URL` and `JWT_SECRET` |
| DB client | `backend/src/config/db.ts` | Prisma + pg pool singleton |
| Route mounting | `backend/src/index.ts:52-64` | All routes under `/api` prefix |
| Health check | `GET /api/health` | `SELECT 1` DB probe |
| Error handler | `backend/src/middlewares/errorHandler.ts` | Last Express middleware |
| Serverless guard | `backend/src/index.ts:83-87` | Skips `listen()` on Vercel |

### Frontend

| Artifact | Path | Description |
|---|---|---|
| HTML shell | `frontend/index.html` | SPA root |
| React bootstrap | `frontend/src/main.tsx` | Mounts all providers + router |
| Provider hierarchy | `main.tsx` | `QueryClientProvider` > `AuthProvider` > `ErrorBoundary` > `RouterProvider` |
| API base URL | `main.tsx:20` | `setApiConfig({ baseUrl: '/api' })` |
| Router definition | `frontend/src/app/router.generated.tsx` | 42+ routes with lazy-loading |

---

## 5. Architectural Overview

The system is a **monolithic-style ERP application** for a higher-education institution. It follows a classic **3-tier architecture**:

```
Browser (React SPA — Vite + React 18 + TanStack Query)
              |
         HTTPS  /api/*
              |
Express.js REST API (Node.js + TypeScript + Prisma ORM)
              |
         pg Pool
              |
    PostgreSQL 16 (single database, public schema)
```

**Key architectural characteristics:**
- No service layer — business logic lives directly in controllers
- No message queue, background workers, or WebSocket connections
- No GraphQL — purely REST API
- No separate microservices — single Express process handles all domains
- Frontend is a pure SPA served by Nginx (Docker) or Vercel (cloud)
- API client on the frontend is auto-generated from OpenAPI operations
- Router configuration is auto-generated (marked "PROTECTED ... DETERMINISTICALLY GENERATED")

---

## 6. Domain Modules Summary

| Domain | Frontend Pages | Backend Controller | Key DB Tables |
|---|---|---|---|
| Authentication | Login, Signup, ForgotPassword, ResetPassword, VerifyEmail | authController | User |
| Student | Student, StudentCourses, StudentAttendance, StudentTimetable, StudentExams, StudentFees, StudentLibrary, StudentDocuments | studentController | Student, AttendanceRecord, ExamResult, FeeTransaction, DocumentRequest |
| Faculty | Faculty, FacultyAttendance, FacultyClasses, FacultyGrading, FacultyLeaves, FacultyTimetable, FacultyDepartment | facultyController | Faculty, LeaveRequest, TimetableEntry |
| Administration | Admin, AdminStudents, AdminAdmissions, AdminFaculty, AdminAcademics, AdminTimetableBuilder, AdminExaminations, AdminNotices, AdminRoles | adminController + multiple | All tables |
| Finance | Finance, FinanceStructures, FinanceDues, FinanceTransactions, FinanceReports | feeController | FeeStructure, FeeTransaction, ExpenseRecord |
| Library | Library, LibraryCatalog, LibraryCirculation, LibraryFines | libraryController | Book, CirculationRecord, FineRecord |
| Analytics | Analytics, AnalyticsAdmissions, AnalyticsAcademicPerformance, AnalyticsPlacement, AnalyticsFinancialHealth | analyticsController | All tables (read-only aggregates) |
