# Quality, Gaps & Audit Report

> This document distinguishes what the code **currently implements**, what the **database schema defines**, what **migrations establish**, what **configuration suggests**, and what **documentation claims**.
> All findings are labelled: **Verified**, **Inferred**, **Unverified**, **Missing**, or **Inconsistent**.

---

## 1. Schema vs Migration Drift — CRITICAL

| Finding | Status | Evidence |
|---|---|---|
| Tables `SystemActivity`, `ExpenseRecord`, `ResearchGrant` exist in `schema.prisma` but NOT in `migration.sql` | **Inconsistent** | `schema.prisma` vs `migration.sql` direct comparison |
| `isPinned` column in `Notice` appears in schema but was not found in migration SQL | **Inconsistent** | `schema.prisma` Notice model vs `migration.sql` Notice CREATE TABLE |
| Single migration for entire schema — no history of evolution | **Verified** | Only `202608310001_init` exists in `migrations/` |

> **Action Required:** Run `npx prisma migrate status` to confirm drift. If drift exists, create a migration to formalise the missing tables.

---

## 2. Empty Service Layer

| Finding | Status | Evidence |
|---|---|---|
| `backend/src/services/` directory is empty | **Verified** | Directory listing |
| All business logic resides in controllers | **Verified** | Inspection of all 13 controller files |
| Controllers mix HTTP handling, input validation, business logic, and data transformation | **Verified** | e.g. `feeController.ts` (284 lines), `analyticsController.ts` (350 lines) |

> **Impact:** Difficult to unit test. Difficult to reuse logic across controllers. High risk of code duplication.

---

## 3. Missing Input Validation

| Finding | Status | Evidence |
|---|---|---|
| No dedicated input validation library (Zod, Joi, class-validator) | **Verified** | `backend/package.json` — no validation library listed |
| Validation is ad-hoc per controller | **Verified** | e.g. `feeController.ts:50-58` inline checks |
| No consistent validation error format | **Inferred** | Different controllers return different error shapes |
| No OpenAPI schema validation middleware | **Missing** | No `express-openapi-validator` or similar |

---

## 4. Default Password Security Gap

| Finding | Status | Evidence |
|---|---|---|
| All new students get default password `student123` | **Verified** | `studentController.ts:60` |
| All new faculty get default password `faculty123` | **Verified** | `facultyController.ts:59` |
| No forced password change mechanism exists | **Missing** | No password reset flow in auth routes |
| No `passwordChangedAt` or `mustChangePassword` fields in User table | **Missing** | `schema.prisma` User model |

---

## 5. Authentication Weaknesses

| Finding | Status | Evidence |
|---|---|---|
| JWT stored in localStorage (XSS risk) | **Verified** | `AuthContext.tsx:17` |
| No token refresh mechanism | **Missing** | No `/auth/refresh` endpoint |
| Logout is client-side only — token remains valid server-side | **Verified** | `authController.ts:93-95` |
| No token revocation / blacklist | **Missing** | Stateless architecture, no token store |
| No rate limiting on auth endpoints specifically | **Inferred** | Global rate limiter applies (100/15min), but no auth-specific tighter limit |
| No account lockout after failed logins | **Missing** | No failed attempt counter in User table |

---

## 6. Race Condition: Fee Payment

| Finding | Status | Evidence |
|---|---|---|
| Fee balance check (`remaining = totalAmount - committed`) not atomic | **Verified** | `feeController.ts:158-164` — read then write, no DB transaction |
| Concurrent payment submissions could both pass the balance check | **Inferred** | No `SELECT FOR UPDATE` or Prisma transaction wrapper |

> **Impact:** Two simultaneous payments could overdraw the fee balance.

---

## 7. Data Integrity Gaps

| Finding | Status | Evidence |
|---|---|---|
| `AdmissionApplication` has no FK to `User` or `Student` | **Verified** | `schema.prisma:AdmissionApplication` model |
| Approved applicants not automatically linked to `Student` records | **Missing** | No such logic found in `adminController.ts` |
| `LeaveRequest.type` is raw TEXT (no enum constraint) | **Verified** | `schema.prisma:LeaveRequest.type TEXT` |
| `ResearchGrant.status` is raw TEXT (no enum) | **Verified** | `schema.prisma:ResearchGrant.status` |
| `Course.faculty_instructor` column name (DB) differs from Prisma field name `facultyId` | **Inconsistent** | `schema.prisma @map("faculty_instructor")` |
| `TimetableEntry.departmentId` is denormalised (derivable from `Course.departmentId`) | **Inferred** | Both exist in schema |
| `Student.attendancePercentage` stored as denormalised field | **Verified** | `schema.prisma:Student.attendancePercentage` |
| `Student.cgpa` stored as denormalised field | **Verified** | `schema.prisma:Student.cgpa` |

> **Impact:** Denormalised `attendancePercentage` and `cgpa` risk going stale if not updated after every attendance marking or exam result submission.

---

## 8. Missing Features (Referenced in Code but Not Implemented)

| Feature | Status | Evidence |
|---|---|---|
| Token refresh / silent re-auth | **Missing** | No `/auth/refresh` endpoint |
| Email verification (VerifyEmail page exists) | **Unverified** | Page `VerifyEmail.tsx` exists, backend implementation not found |
| Password reset email (ForgotPassword page exists) | **Unverified** | Page `ForgotPassword.tsx` exists, no email service in `package.json` |
| Email/SMS notification service | **Missing** | No `nodemailer`, `sendgrid`, `twilio` in dependencies |
| File upload (document requests, hall tickets, etc.) | **Missing** | No `multer` or file storage dependency |
| Real-time updates | **Missing** | No WebSocket/SSE implementation |

---

## 9. Code Quality Observations

| Observation | Status | Evidence |
|---|---|---|
| Auto-generated router and API client (hash-protected) | **Verified** | `router.generated.tsx:1-4`, `apiCall.ts:1-2` |
| `any` types used in several controllers | **Inferred** | `feeController.ts:99 let whereClause: any = {}` |
| Error responses mix `success: false` shape and thrown errors | **Inferred** | Multiple controllers use `res.status(500).json({success:false})` but some don't |
| No test files detected | **Missing** | `grep -r "describe\|it\(" backend/src/` would confirm |
| `backend/src/services/` and `backend/src/types/` exist as empty/sparse scaffolding | **Verified** | Directory listing |

---

## 10. Third-Party Analytics

| Finding | Status | Evidence |
|---|---|---|
| `@vercel/analytics` sends page view data to Vercel | **Verified** | `frontend/src/main.tsx:18-19`, `frontend/package.json` |
| No other analytics or monitoring third parties | **Verified** | `frontend/package.json` dependencies |

---

## 11. AI/ML Roadmap vs Implementation

| Roadmap Item | Status |
|---|---|
| Phase 2 AI/ML roadmap documented (`docs/PHASE_2_AI_ML_ROADMAP.md`) | **Verified (file exists)** |
| Any Phase 2 features implemented | **Missing** — none found in codebase |

---

## Summary Risk Matrix

| Issue | Severity | Priority |
|---|---|---|
| Default passwords (`student123`, `faculty123`) | Critical | P0 |
| Schema drift (SystemActivity, ExpenseRecord, ResearchGrant not migrated) | Critical | P0 |
| Stateless JWT logout (no server-side invalidation) | High | P1 |
| JWT in localStorage (XSS risk) | High | P1 |
| No input validation library | High | P1 |
| Fee payment race condition | High | P1 |
| No token refresh mechanism | Medium | P2 |
| No account lockout | Medium | P2 |
| Hardcoded JWT_SECRET in docker-compose | Medium | P2 |
| `FRONTEND_URL` defaults to localhost | Medium | P2 |
| Denormalised CGPA/attendance risk staleness | Medium | P2 |
| Empty service layer | Low | P3 |
| No tests | Low | P3 |
| `any` types in TypeScript | Low | P3 |
