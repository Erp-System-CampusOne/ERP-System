# CampusOne ERP — Database Redesign: Reasoned Implementation Plan

> **Scope:** Bridging the current production codebase to the target schema defined in the three redesign documents.
> **Revision:** v4 (final) — three payment blockers corrected following final technical review. This document is now locked for plan-level revisions. Future changes must be forward migrations, not document edits.
> **Date:** 2026-10-10
> **Evidence basis:** Direct inspection of `schema.prisma`, `migration.sql`, all 13 controllers, `package.json` (Node v22.17.0, Prisma 7.10), the three redesign documents, and the target SQL file.
> **Verification labels:** Verified / Inferred / Unverified / Missing

---

## Part 1: Honest Assessment of Where We Are

### Current State (Verified from codebase)

| Property | Actual Value |
|---|---|
| Node.js | v22.17.0 |
| Prisma | ^7.10.0 (`@prisma/client`, `@prisma/adapter-pg`) |
| PostgreSQL adapter | `@prisma/adapter-pg` (driver adapter model) |
| Migrations | 1 migration (`202608310001_init`) — schema divergence confirmed |
| Tables in migration | 21 |
| Tables in schema.prisma | 24 (SystemActivity, ExpenseRecord, ResearchGrant are drift) |
| Money type (current) | `Float` (`DOUBLE PRECISION`) throughout |
| Auth token storage | localStorage JWT, stateless |
| Service layer | Empty (`backend/src/services/` directory is empty) |
| Input validation | None — ad-hoc inline per controller |
| Test suite | None found |

### Target State (from Target Schema SQL)

| Property | Target Value |
|---|---|
| Tables | 79 tables across 9 domains |
| Enums | 31 new typed enums |
| Primary keys | `uuid` (`gen_random_uuid()`) — major change from current `cuid()` TEXT |
| Money type | `numeric(14,2)` — critical change from `DOUBLE PRECISION` |
| Timestamps | `timestamptz` for instants, `date` for calendar days |
| Auth sessions | Server-side `auth_sessions` table — replaces stateless JWT |
| RBAC | `roles + permissions + user_role_assignments` tables with validity dates |
| Fee model | Invoice → Lines → Payments → Allocations (5 layers vs 2 today) |
| Library | `library_items` + `library_copies` (individual copy tracking) |
| Attendance | `class_sessions` → `attendance_records` (session-first model) |
| Audit | Dedicated `audit_events` table with actor/target/correlation |

---

## Part 2: Confirmed Correct Decisions

The following architectural decisions are retained from the initial plan:

| Decision | Reason |
|---|---|
| Establish actual DB state before changing anything | Prevents migrations based on outdated documentation |
| Preserve existing initial migration | An applied migration must remain immutable |
| Use forward-only migrations | Makes schema evolution traceable and repeatable |
| Separate users, credentials, sessions, and roles | Clearer identity and authorization model |
| Introduce academic terms, course offerings, course enrolments | Represents the academic lifecycle more accurately |
| Replace float money with decimal | Avoids binary floating-point representation errors |
| Introduce invoices and payment allocations | Makes financial obligations and settlements traceable |
| Track individual library copies | Supports reliable inventory and loan management |
| Preserve grade changes and approval history | Provides accountability and historical traceability |
| Use migration gates and reconciliation tests | Prevents a successful deployment from being mistaken for a successful migration |
| Treat the 79-table schema as a design baseline, not a production migration | A redesigned schema must be validated before adoption |
| Expand-and-contract incremental approach | Reduces risk versus big-bang migration |

> **Important qualification on dual-writing:** dual-writing to two tables does not automatically make a migration safe. Each dual-write path requires explicit consistency guarantees — both writes must either succeed or fail together in a single transaction, and the application must not read partially-migrated state.

---

## Part 3: Critical Corrections to v1

### Correction 1: Academic Terms Cannot Be Inferred from Semester Numbers **[CORRECTED]**

> **v1 proposed:** Create `academic_terms` from distinct `Student.semester` values and estimate academic years from two-year ranges.

**This is not reliable.** Semester number 3 could represent different actual academic periods for students who joined in different cohort years. A semester integer does not contain term dates, examination windows, or academic year boundaries.

The same problem applies to reconstructing historical enrolments from attendance and examination records.

**Correct approach:**
1. Obtain the institution's **actual academic calendar** — official term start/end dates, examination periods, and year boundaries
2. Build an **explicit mapping table** from legacy record dates and semester numbers to canonical `academic_term` records, cross-referenced against cohort year
3. Map each historical `AttendanceRecord`, `ExamResult`, and `FeeTransaction` to its academic term using this mapping — not via inference from integer fields
4. For records whose historical term cannot be determined with confidence, retain the original data and record a documented uncertainty marker
5. Do **not** invent dates or silently classify uncertain records as verified. Where data is genuinely incomplete, this must be signed off by the academic owner as a documented data loss

### Correction 2: Course Enrolment Cannot Be Reconstructed from Attendance Alone **[CORRECTED]**

> **v1 proposed:** Infer `course_enrollments` from `AttendanceRecord.studentId × courseId` combinations.

**This is insufficient for authoritative academic records.** A student who registered for a course but never attended a class will have no attendance records — their enrolment is silently omitted. An attendance record also cannot prove whether a student was formally registered, provisionally enrolled, withdrawn, or attending as an approved exception.

**Correct approach:**
1. Use **official registration records** as the primary source — SIS exports, registration printouts, or signed registration documents
2. Use attendance and assessment records only as **supporting corroborating evidence**
3. Create explicitly identified inferred enrolments only where no official record is available AND evidence strongly supports enrolment
4. For each inferred enrolment, record its provenance and confidence level explicitly
5. Present all inferred enrolments to the academic owner for review and sign-off **before treating them as authoritative**

> **Why this matters:** Attendance percentages and academic results depend entirely on the correct enrolment population. A missing enrolment inflates a student's attendance rate; an extra enrolment deflates it. Both are incorrect academic records.

### Correction 3: Financial Migration Requires Stronger Reconciliation Design **[CORRECTED]**

> **v1 proposed:** Create invoices per student per term, migrate successful `FeeTransaction` records as payments, and allocate 1:1 initially.

**Three problems with this approach:**

**Problem A:** Historical payments cannot prove which invoice they settled. Creating a new invoice and allocating an old payment to it invents an allocation not supported by the historical record.

**Problem B:** The v1 reconciliation query was unsafe. Joining a student to all their programme enrolments can multiply legacy payment amounts when a student has multiple enrolments. A query returning zero rows is meaningful only if the joins and aggregations are correct.

**Problem C:** Financial business invariants were not fully specified.

**Correct approach:**
1. Reconstruct historical fee obligations from authoritative billing records — fee notices, official receipts, or billing system exports — not from `FeeStructure.totalAmount` alone
2. Migrate `payments` as independent historical facts, separated from invoice creation
3. Map a payment to an invoice only when documentary evidence supports the allocation. Represent unresolved historical allocations explicitly with a documented status
4. Reconcile four independent totals per student before cutover (see Phase 6)
5. Finance owner sign-off on all four totals is required before Phase 6 cutover

**Required financial business invariants (must be designed and tested explicitly):**

| Invariant | Enforcement mechanism |
|---|---|
| Payment allocations cannot exceed payment amount | Application transaction + pre-insert aggregate check |
| Invoice cannot be overpaid unless credits are explicitly supported | Application transaction + explicit credit policy |
| Refunds cannot exceed the eligible refundable amount | Transactional check against original payment and prior refunds |
| Invoice total must equal sum of lines minus discounts plus tax | Application-layer aggregate check on every line mutation |
| Concurrent payment callbacks create exactly one payment | `idempotency_key UNIQUE` + provider event unique index |

These invariants **cannot all be expressed as single-row CHECK constraints**. They require transaction boundaries, appropriate row locking, and dedicated reconciliation jobs.

### Correction 4: Four Structural Issues Found in the Target SQL **[ADDED]**

Direct review of `CampusOne-ERP-Target-Schema.sql` identified four issues requiring resolution before the SQL can be treated as a production baseline.

**Issue A — Missing foreign key on `student_profiles.admission_application_id`**

The column `admission_application_id uuid UNIQUE` in `student_profiles` has no `REFERENCES admission_applications(id)` constraint as written inline. The FK is added via a separate `ALTER TABLE` at the end of the file. Verify this is preserved in the final migration.

Additionally, `student_program_enrollments.admission_application_id` also references `admission_applications`. The team must decide which is the canonical admission-to-student link and remove or explicitly document the other. Having both creates ambiguity.

**Issue B — Scheduling conflicts are not fully prevented**

The SQL defers scheduling overlap constraints to a comment. As written, the baseline cannot guarantee that two classes cannot occupy the same room at overlapping times, or that the same faculty cannot be assigned to conflicting sessions.

Required before treating timetable integrity as complete:
- Define exact scheduling invariants (room exclusivity, faculty exclusivity, time-range representation)
- Implement either PostgreSQL exclusion constraints using `tstzrange` or a serializable transaction with explicit row-level locking
- Test concurrent timetable modifications for correct conflict detection

**Issue C — Cross-row financial totals are not enforced by column-level constraints**

Column-level `CHECK` constraints in the target SQL do not guarantee aggregate consistency. A valid `payment_allocation` row does not prove the sum of all allocations stays within the payment amount. A valid `invoice_line` does not prove the invoice `subtotal` matches the sum of its lines.

Required: explicitly specify transaction boundaries and aggregate invariants for all financial operations, and test with concurrency scenarios.

**Issue D — Several business rules require explicit design decisions**

Foreign keys alone do not enforce:
- Whether a faculty member appointed as HOD must belong to the relevant department
- Whether a student can have multiple simultaneous programme enrolments
- Whether a published result can be directly overwritten or only corrected through a `grade_change_events` workflow
- Whether a course offering can have multiple teaching assignments with the same role
- Whether a `notice_audience` record's department, campus, and programme scopes must be mutually consistent

Each must be explicitly decided and implemented.

### Correction 5: Prisma 7 Partial Index Statement Was Inaccurate **[CORRECTED]**

> **v1 stated:** "Prisma 7 cannot natively express partial indexes — these require raw SQL."

**This is inaccurate.** The Prisma ORM changelog documents introduction of the `partialIndexes` preview feature in Prisma ORM 7.4.0. Since the implementation targets Prisma 7.10, partial indexes may be expressible via the preview feature flag.

**Correct classification — distinguish all four constraint categories before writing migrations:**

| Constraint type | Prisma 7.10 support | Implementation |
|---|---|---|
| Standard unique indexes | Full native | `@@unique` in schema |
| Standard composite indexes | Full native | `@@index` in schema |
| Partial indexes (WHERE clause) | Preview feature (`partialIndexes`) as of 7.4.0 | DSL with preview flag — verify in 7.10 first; fall back to raw SQL if needed |
| `GENERATED ALWAYS AS ... STORED` columns | Not supported | Raw SQL migration block |
| `UNIQUE NULLS NOT DISTINCT` (PostgreSQL 15+) | Not supported | Raw SQL migration block |
| `num_nonnulls()` CHECK constraints | Not supported | Raw SQL migration block |
| Exclusion constraints | Not supported | Raw SQL migration block |
| `inet` column type | Not natively supported | Custom type or raw SQL |

Before writing any migrations, enumerate all constraints in the target SQL, classify each into one of these categories, and document which will use Prisma DSL versus raw SQL blocks.

### Correction 6: Authentication Migration Requires Full Session Security Specification **[CORRECTED]**

> **v1 proposed:** Replace localStorage JWT with HttpOnly cookie and server-side sessions.

**That is the correct direction, but incomplete.** HttpOnly cookies prevent JavaScript from reading the cookie directly but do not eliminate all authentication risks. A malicious script can still trigger authenticated requests.

**Required security properties for the new session model:**

| Property | Requirement |
|---|---|
| Cookie flags | `HttpOnly`, `Secure` (production), `SameSite=Lax` or `Strict` — select based on deployment architecture and cross-origin requirements |
| CSRF protection | Required when using cookie-based auth. Options: synchronised token pattern, double-submit cookie, or `SameSite=Strict` where deployment permits. Do not assume `SameSite` alone is sufficient for all browser/proxy combinations |
| Session expiration | Define maximum session lifetime; enforce server-side via `auth_sessions.expires_at` |
| Session renewal | Define idle timeout and renewal window; rotate session token on renewal |
| Session revocation | Revoke on logout (`auth_sessions.revoked_at`); revoke all sessions on password change or security-sensitive role change |
| Session fixation prevention | Issue a new session token after successful authentication and privilege elevation |
| Forced password change | New users and reset-password users cannot access protected resources until credentials are changed — enforced server-side, not only client-side |
| Rate limiting | Tighter per-IP limits on login, logout, and renewal endpoints specifically |
| Account recovery | Define who can re-enable a locked/suspended account and the authorisation process |
| Credential migration | Existing bcrypt hashes preserved; re-hash to target algorithm (Argon2id or confirmed-work-factor bcrypt) on next successful login |
| Audit | All auth events (success, failure, logout, revocation, password change) logged to `authentication_events` |

Reference: [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

---

## Part 4: The 12 Open Policy Questions (Still Blocking)

Must be answered by institution stakeholders before Phase 1 begins:

| # | Question | Schema Impact if Left Unanswered |
|---|---|---|
| 1 | Single institution or multi-tenant? | Every FK, unique constraint, and isolation boundary changes |
| 2 | Can a person be both student AND employee/faculty? | `user_id` uniqueness constraints on both profiles |
| 3 | Are roll numbers unique institution-wide or per-cohort? | Unique index scope on `student_number` |
| 4 | Is enrollment manually approved, curriculum-driven, or capacity-limited? | `course_enrollments.capacity`, approval workflow |
| 5 | Official grading policy (GPA rounding, revaluation, backlogs)? | `grade_scales`, `assessment_results` versioning rules |
| 6 | Which fee policies apply (installments, partial payments, waivers, refunds, tax)? | `fee_plan_items.frequency`, `payment_allocations`, `financial_adjustments` |
| 7 | Full double-entry ledger or student receivables only? | Whether to add journal entries, accounts, postings |
| 8 | Can non-students borrow library books? | `library_loans.borrower_user_id` scope |
| 9 | Attendance policy for excused/medical/late absences? | `attendance_status` enum values, rules engine |
| 10 | Approval matrix for leave/documents/grants/grade corrections? | Number of `leave_approvals.step_number` rows |
| 11 | Privacy/retention rules? | Column-level encryption, deletion policies |
| 12 | Expected scale (users, years, concurrent requests)? | Partitioning, connection pooling, caching strategy |

---

## Part 5: Phase-by-Phase Plan (Revised)

> **Pre-condition for all phases:** 12 policy questions answered and signed off by stakeholders.

---

### Phase 0: Evidence Lock and Pre-Work (1–2 weeks, ZERO code changes)

**Goal:** Verified baseline. No DDL changes whatsoever.

**Steps:**
1. Pin the current production commit SHA
2. Run diagnostic commands:
   ```bash
   npx prisma validate
   npx prisma migrate status
   pg_dump "$DATABASE_URL" --schema-only --no-owner > source-schema.sql
   ```
3. Run all data quality checks (Checklist Section 2): duplicate emails/roll numbers/employee codes, orphan FK references, negative/zero fees, duplicate attendance records
4. Confirm schema drift: compare live `pg_catalog` to `migration.sql` for `SystemActivity`, `ExpenseRecord`, `ResearchGrant`, `Notice.isPinned`
5. Record row counts for all 24 Prisma models in every environment
6. Take verified backup; confirm restore to isolated database succeeds
7. **[ADDED] Obtain the institution's official academic calendar** — term start/end dates for all historical periods covered by existing data. This is now a hard dependency, not optional
8. Resolve the 12 policy questions with stakeholder sign-off

**Gate:** Policy questions answered. Academic calendar obtained. Data quality report complete. Backup verified.

---

### Phase 1: Foundation Schema (2–3 weeks)

**Goal:** Add institutional master data and RBAC tables. No modifications to any existing table.

**New tables (all additive):**
- `institutions`, `campuses` — single-row seeded from institution config
- `academic_years`, `academic_terms` — **[CORRECTED]** populated from the official academic calendar obtained in Phase 0, NOT inferred from `Student.semester` integers
- `programs` — one per distinct `(Student.degree, Department)` pair, validated against institution's programme list
- `rooms` — one per distinct `TimetableEntry.roomNumber`
- `roles`, `permissions`, `role_permissions` — migrated from existing `Permission`, `RolePermission`
- `user_role_assignments` — migrated from `User.role` enum
- `user_credentials` — migrated from `User.password` (bcrypt hashes preserved; upgraded on next login)
- `auth_sessions` — empty initially; populated at first login

**[ADDED] Term mapping table (required for Phases 3, 4, 5):**
```sql
-- Explicit mapping from legacy date ranges and semester numbers to canonical academic terms
-- Must be fully populated from official calendar before Phase 3 begins
CREATE TABLE _term_date_map (
  academic_term_id uuid NOT NULL REFERENCES academic_terms(id),
  legacy_semester_number integer,
  entry_cohort_year smallint,
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  confidence text NOT NULL CHECK (confidence IN ('verified','inferred','uncertain')),
  notes text,
  PRIMARY KEY (academic_term_id, date_range_start)
);
```

**[ADDED] ID mapping infrastructure:**
```sql
CREATE TABLE _id_map (
  table_name TEXT NOT NULL,
  old_id TEXT NOT NULL,
  new_id UUID NOT NULL DEFAULT gen_random_uuid(),
  PRIMARY KEY (table_name, old_id)
);
```

**[CORRECTED] Prisma constraint classification for this phase:**

| Constraint | Prisma 7.10 | Implementation |
|---|---|---|
| Standard unique / composite indexes | Native | Prisma DSL |
| Partial indexes (WHERE clause) | Preview (`partialIndexes`) — verify in 7.10 | DSL with preview flag; fall back to raw SQL if needed |
| `GENERATED ALWAYS AS ... STORED` on `users.email_normalized` | Not supported | Raw SQL migration block |
| `UNIQUE NULLS NOT DISTINCT` on `student_scholarships` | Not supported | Raw SQL migration block |
| `num_nonnulls()` CHECK on `user_role_assignments` | Not supported | Raw SQL migration block |
| Exclusion constraints (timetable) | Not supported | Raw SQL migration block |

**Gate:** Fresh build from migrations succeeds. Seed is idempotent. `academic_terms` populated from official calendar. No existing functionality broken.

---

### Phase 2: Student and Faculty Lifecycle (3–4 weeks)

**Goal:** Add profile, admissions, and enrolment tables. Keep all existing tables alive.

**New tables:**
- `student_profiles` — linked to existing `Student` via `_id_map`
- `employee_profiles` — linked to existing `Faculty`
- `faculty_profiles` — linked to `employee_profiles`
- `department_appointments` — from `Department.headOfDepartmentId`; `starts_on` = department `createdAt` (Inferred — document this)
- `admission_applications`, `admission_decisions` — from `AdmissionApplication`
- `student_program_enrollments` — **[v3-CORRECTED]** see below; `entry_term_id` from official calendar, not inferred from semester number
- `student_term_registrations` — one per `(student, academic_term)` from official records, cross-referenced against `_term_date_map`
- `stored_files` — empty; populated on new uploads

**[v3-CORRECTED] Programme enrolment must be modelled as an independent lifecycle record:**

> **v2 stated:** "one row per student" for `student_program_enrollments`. That is inconsistent with policy question #2 (whether a person can be both student and employee) and the target schema's design, which does not prevent multiple concurrent programme enrolments.

Required before writing Phase 2 migration code:
1. Answer whether the institution permits multiple simultaneous programme enrolments (this is policy question #4's sibling — escalate to academic owner)
2. If multiple enrolments are permitted: model each programme enrolment as an independent lifecycle record; do **not** enforce one-per-student as a structural constraint
3. If multiple enrolments are prohibited: add an explicit `UNIQUE(student_id)` partial constraint (where `status = 'active'`) and document the institutional policy that justifies it
4. Phase 6 payment migration is directly affected by this decision — see Issue 1 correction below

**[CORRECTED — Correction 4A] Canonical admission FK decision required before coding:**

Decide: is `student_profiles.admission_application_id` or `student_program_enrollments.admission_application_id` the canonical link? Remove or explicitly document the non-canonical one. Verify the `ALTER TABLE ... ADD CONSTRAINT` FK in the target SQL is present and applied in the migration.

**[CORRECTED — Correction 4D] HOD appointment validation:**

Enforce that the appointed faculty's `primary_department_id` matches the appointment's `department_id`, unless policy explicitly allows cross-department HOD appointments.

**Application changes:** Dual-write profile changes. Both writes must be in a single transaction.

**Gate:** Row counts match. `student_number` uniqueness holds. Every `student_term_registration` references a term from the official calendar. Programme enrolment multiplicity policy decided and enforced.

---

### Phase 3: Course Catalog and Offerings (2–3 weeks)

Requires `_term_date_map` fully populated before starting.

**New tables:**
- `courses` — one-to-one from `Course`
- `curriculum_versions` — one version per programme
- `curriculum_courses` — from `Course.semester + departmentId`
- `course_offerings` — one per `(Course, academic_term, section)`; academic term resolved via `_term_date_map`, not integers
- `teaching_assignments` — from `Course.faculty_instructor`
- `course_enrollments` — **[CORRECTED]** see below

**[CORRECTED — Correction 2] Course enrolment reconstruction:**

Do NOT infer enrolments solely from `AttendanceRecord` data.

Required process:
1. Request official course registration records from the institution
2. Where official records exist, use them as the authoritative enrolment source
3. Where no official records exist, use attendance and exam evidence as corroborating signals only
4. For each inferred enrolment, record: `{source: "attendance_inference", evidence_count: N, confidence: "low|medium|high"}`
5. Academic owner must review and sign off all inferred enrolments before they are treated as authoritative
6. Students who registered but left no attendance or exam evidence cannot simply be omitted

**Gate:** Every `course_enrollment` has either a verified source or an explicit inferred status. Academic owner has signed off on inferred records. No `AttendanceRecord` is orphaned.

---

### Phase 4: Attendance and Timetable (2–3 weeks)

**New tables:**
- `timetable_entries` — from `TimetableEntry`, now referencing `rooms.id`
- `class_sessions` — **[v3-CORRECTED]** see below
- `attendance_records` (new model) — linked to `class_session_id + course_enrollment_id`

> **Documented limitation:** All historical sessions are `held`. Cancellation and make-up class history is unrecoverable.

**[v3-CORRECTED] Historical class-session times cannot be blindly derived from the current timetable:**

> **v2 stated:** `starts_at`/`ends_at` derived from `TimetableEntry.timeSlot` for each session date. This is unreliable because the timetable may have changed since those historical classes took place. The current timetable cannot establish the exact historical time of every past session.

Required approach:
1. Check whether historical timetable snapshots exist (archived timetable records, PDF schedules, SIS exports). If they exist, use them as the time source
2. Where historical records are available: record `class_session.starts_at`/`ends_at` from those records with `time_source = 'historical_timetable'`
3. Where only the current timetable is available as a proxy: derive times but mark each session with `time_source = 'reconstructed_from_current_timetable'`
4. Where no timetable data is available at all: set `starts_at`/`ends_at` to the session date at midnight (local time) with `time_source = 'date_only_no_time_available'`
5. Do **not** present reconstructed times as authoritative historical facts. Downstream analytics (session duration, late-arrival calculations) must exclude or flag sessions with reconstructed times

Add a `time_source` column to `class_sessions` in the migration to preserve this provenance:
```sql
ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS time_source text NOT NULL DEFAULT 'historical_timetable'
  CHECK (time_source IN ('historical_timetable','reconstructed_from_current_timetable','date_only_no_time_available'));
```

**[CORRECTED — Correction 4B] Scheduling conflict enforcement (required before Phase 4 is complete):**

The baseline SQL does not yet prevent overlapping room or faculty assignments. Before marking timetable integrity as done:
1. Define the exact invariants (room exclusivity, faculty exclusivity, time-range representation)
2. Implement either PostgreSQL exclusion constraints using `tstzrange`, or a serializable transaction with explicit row locking
3. Test concurrent timetable modifications for correct conflict detection

**Application change:** Attendance marking dual-writes transactionally.

**Gate:** Record counts match. No enrolment has attendance without a corresponding `class_session`. `time_source` set correctly for every session. Scheduling conflict enforcement implemented and tested.

---

### Phase 5: Assessments and Grading (3–4 weeks)

Requires policy answer #5 (grading policy) before starting.

**New tables:**
- `grade_scales`, `grade_scale_items` — seeded from institution's official grading policy
- `assessments` — one per `(Examination, Course)` pair; `internalScore`/`endSemScore` become two separate assessment types
- `assessment_results` — from `ExamResult`, versioned correctly
- `course_final_results` — from `ExamResult.grade` per enrolment
- `course_final_result_events`, `grade_change_events` — empty initially

**[CORRECTED — Correction 4D] Published result correction workflow:**

Decide and enforce: can a `course_final_result` with `result_status = 'published'` be directly overwritten? Or must all corrections go through a `grade_change_events` entry with reason and actor? Implement as a constraint or application-layer enforcement, and test that unauthorised direct overwrites are rejected.

> **Documented limitation:** Nullable `ExamResult.examinationId` in the old schema means some results cannot be definitively linked to an examination. Migrated as unlinked historical results; academic owner must review.

**Gate:** Every `ExamResult` row produces a corresponding `assessment_result`. No silent drops.

---

### Phase 6: Finance Redesign (4–6 weeks — highest risk)

Requires policy answers #6 and #7. Finance owner must be identified before work begins.

**[CORRECTED — Correction 3] Revised migration approach:**

**Step 1 — Reconstruct fee obligations from authoritative source:**

Obtain billing records, fee notices, or official obligation documents per student per term. Do not derive invoice totals from `FeeStructure.totalAmount` without verifying that structure applied to that student at that time.

**Step 2 — Migrate ALL transactions as independent student-level facts: [v3-CORRECTED]**

> **v2 error:** The previous SQL joined `FeeTransaction` through `student_program_enrollments` using `JOIN spe ON spe.student_id = sp.id`. If a student has **multiple** programme enrolments this join multiplies the payment row, producing one row per enrolment — all with the same `idempotency_key`, so `ON CONFLICT DO NOTHING` silently conceals the ambiguity while associating the payment with an arbitrarily chosen enrolment. If a student has **no** enrolment yet, the inner join drops their payment entirely. Both are silent data integrity failures.

**Correct approach — migrate payments at student level first, without assuming enrolment:**

```sql
-- Stage 1: migrate ALL FeeTransaction rows (all statuses) to a holding table
-- keyed only by student — do NOT join through programme enrolment here
CREATE TABLE IF NOT EXISTS _payment_staging (
  legacy_fee_transaction_id TEXT PRIMARY KEY,
  student_profile_id        UUID NOT NULL,
  legacy_status             TEXT NOT NULL,  -- preserves original: success/failed/pending/refunded
  receipt_number            TEXT,
  amount_numeric            NUMERIC(14,2) NOT NULL,
  payment_method_raw        TEXT,
  idempotency_key           TEXT NOT NULL UNIQUE,
  initiated_at              TIMESTAMPTZ NOT NULL,
  succeeded_at              TIMESTAMPTZ,
  raw_data                  JSONB NOT NULL DEFAULT '{}'
);

INSERT INTO _payment_staging (
  legacy_fee_transaction_id, student_profile_id, legacy_status,
  receipt_number, amount_numeric, payment_method_raw,
  idempotency_key, initiated_at, succeeded_at, raw_data
)
SELECT
  ft.id,
  sp.id,
  ft.status,
  ft."receiptNumber",
  ROUND(ft.amount::numeric, 2),   -- explicit rounding; verify no precision loss beforehand
  ft."paymentMethod",
  'legacy-' || ft.id,
  ft."createdAt",
  ft."paidAt",
  row_to_json(ft)::jsonb          -- preserve full source row for audit/dispute resolution
FROM "FeeTransaction" ft
JOIN _id_map sm ON sm.table_name = 'Student' AND sm.old_id = ft."studentId"
JOIN student_profiles sp ON sp.id = sm.new_id
ON CONFLICT (legacy_fee_transaction_id) DO NOTHING;
-- Verify: staging row count must equal source FeeTransaction row count exactly

-- Stage 2: resolve programme enrolment association SEPARATELY
-- For each staged payment, identify the correct enrolment from documentary evidence:
--   (a) match on academic_term_id from _term_date_map using ft."createdAt"
--   (b) match on the student's active enrolment at the time of the transaction
--   (c) where ambiguous (multiple enrolments), record as unresolved — do not pick arbitrarily
CREATE TABLE IF NOT EXISTS _payment_enrolment_resolution (
  legacy_fee_transaction_id  TEXT PRIMARY KEY REFERENCES _payment_staging,
  student_program_enrollment_id UUID,             -- NULL = unresolved
  resolution_method          TEXT NOT NULL,        -- 'term_match','single_enrolment','manual','unresolved'
  resolved_by_user_id        UUID,
  notes                      TEXT
);

> **v3 stated:** "All transaction statuses (not just `success`) are preserved." That claim was contradicted by the Stage 3 SQL, which had two errors: (a) the `ELSE → 'pending'` branch silently misclassified `refunded` and any other unrecognised status; (b) `WHERE pr.resolution_method <> 'unresolved'` excluded unresolved transactions from the authoritative table while the reconciliation query also missed them. A payment silently absent from both is not reconciled — it is lost.

**[v4-CORRECTED] Three blockers resolved in Stage 3:**

**Blocker 1 — Refund status semantics:** The earlier SQL mapped all `refunded` transactions to `partially_refunded`. A fully refunded payment and a partially refunded payment are different financial states. The correct target status must be determined from actual data, not assumed.

**Blocker 2 — Schema compatibility:** If `student_program_enrollment_id` is `NOT NULL` in the target schema, the migration will fail for any unresolved payment. This constraint must be explicitly verified and, if present, altered before the migration runs.

**Blocker 3 — Staging completeness:** If a student has no entry in `_id_map` or no `student_profiles` row, the staging JOIN silently excludes that student's transactions. The row-count check catches the discrepancy, but the migration must not proceed past staging until the count is clean.

```sql
-- ============================================================
-- PRE-FLIGHT: run these before Stage 1. All must return clean.
-- ============================================================

-- (Pre-1) Discover every distinct legacy status value.
-- Add an explicit CASE branch below for every value found here.
-- No value should reach the ELSE catch-all in a production run.
SELECT status, COUNT(*) AS row_count
FROM "FeeTransaction" GROUP BY status ORDER BY status;

-- (Pre-2) Determine refund granularity for each refunded transaction.
-- The target payment_status must be correct: 'succeeded' (original payment,
-- now fully refunded), 'partially_refunded', or another supported enum value.
-- The appropriate status depends on whether the refund covered the full amount
-- and what the target schema's payment_status enum actually contains.
-- Run this query, then define the mapping explicitly before Stage 3a.
SELECT
  ft.id,
  ft.amount                AS original_amount,
  ft."receiptNumber",
  ft."paidAt"
FROM "FeeTransaction" ft
WHERE ft.status = 'refunded'
ORDER BY ft."createdAt";
-- Review with finance owner: is each row fully or partially refunded?
-- Document the decided target status for each legacy 'refunded' row.

-- (Pre-3) Verify payment schema nullability.
-- This must be run against the target schema before Stage 3a.
-- If student_program_enrollment_id is NOT NULL, run the ALTER below first.
SELECT
  column_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'payments'
  AND column_name IN ('student_program_enrollment_id','migrated_student_profile_id');

-- If student_program_enrollment_id shows is_nullable = 'NO', run this migration
-- and commit it as a named forward migration before any data migration begins:
-- ALTER TABLE payments ALTER COLUMN student_program_enrollment_id DROP NOT NULL;

-- ============================================================
-- Stage 1: migrate ALL FeeTransaction rows to a holding table.
-- Keyed only by student — do NOT join through programme enrolment here.
-- ============================================================
CREATE TABLE IF NOT EXISTS _payment_staging (
  legacy_fee_transaction_id TEXT PRIMARY KEY,
  student_profile_id        UUID NOT NULL,
  legacy_status             TEXT NOT NULL,
  receipt_number            TEXT,
  amount_numeric            NUMERIC(14,2) NOT NULL,
  payment_method_raw        TEXT,
  idempotency_key           TEXT NOT NULL UNIQUE,
  initiated_at              TIMESTAMPTZ NOT NULL,
  succeeded_at              TIMESTAMPTZ,
  raw_data                  JSONB NOT NULL DEFAULT '{}'
);

INSERT INTO _payment_staging (
  legacy_fee_transaction_id, student_profile_id, legacy_status,
  receipt_number, amount_numeric, payment_method_raw,
  idempotency_key, initiated_at, succeeded_at, raw_data
)
SELECT
  ft.id,
  sp.id,
  ft.status,
  ft."receiptNumber",
  ROUND(ft.amount::numeric, 2),
  ft."paymentMethod",
  'legacy-' || ft.id,
  ft."createdAt",
  ft."paidAt",
  row_to_json(ft)::jsonb
FROM "FeeTransaction" ft
JOIN _id_map sm ON sm.table_name = 'Student' AND sm.old_id = ft."studentId"
JOIN student_profiles sp ON sp.id = sm.new_id
ON CONFLICT (legacy_fee_transaction_id) DO NOTHING;

-- ============================================================
-- (Blocker 3) STAGING COMPLETENESS GATE — must return ZERO ROWS.
-- Any row here means a FeeTransaction has no student mapping
-- and has been silently excluded from staging.
-- The migration must NOT proceed past this point until this
-- query returns zero rows. For each result row, either:
--   (a) add the missing _id_map / student_profiles entry, OR
--   (b) obtain explicit finance-owner approval to exclude it,
--       and document the reason in the migration notes.
-- ============================================================
SELECT ft.id, ft.status, ft.amount, ft."studentId"
FROM "FeeTransaction" ft
WHERE NOT EXISTS (
  SELECT 1 FROM _payment_staging ps
  WHERE ps.legacy_fee_transaction_id = ft.id
);
-- MUST RETURN ZERO ROWS before continuing.

-- ============================================================
-- Stage 2: resolve programme enrolment association SEPARATELY.
-- ============================================================
CREATE TABLE IF NOT EXISTS _payment_enrolment_resolution (
  legacy_fee_transaction_id  TEXT PRIMARY KEY REFERENCES _payment_staging,
  student_program_enrollment_id UUID,
  resolution_method          TEXT NOT NULL
    CHECK (resolution_method IN ('term_match','single_enrolment','manual','unresolved')),
  resolved_by_user_id        UUID,
  notes                      TEXT
);

-- ============================================================
-- Stage 3 pre-flight: confirm schema allows NULL enrollment FK.
-- Run Pre-3 query above. If NOT NULL constraint exists, run the
-- ALTER as a named forward migration before this block.
-- ============================================================
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS migrated_student_profile_id UUID
    REFERENCES student_profiles(id),
  ADD COLUMN IF NOT EXISTS migration_status TEXT NOT NULL DEFAULT 'promoted'
    CHECK (migration_status IN (
      'promoted',
      'enrolment_unresolved',
      'refund_needs_review'   -- refund semantics must be confirmed with finance owner
    ));
-- Stage 3a: promote all staged payments.
-- LEFT JOIN ensures payments with no resolution record are included.
-- ============================================================

-- Pre-Stage-3a integrity check: verify every resolved enrolment is valid.
-- Must return ZERO ROWS before the INSERT below runs.
-- Catches three failure modes:
--   (a) A record marked as resolved but with no enrolment_id supplied
--   (b) An enrolment_id that references no existing row in student_program_enrollments
--   (c) An enrolment that belongs to a different student than the staged payment
--       (IS DISTINCT FROM handles NULL-safe comparison)
SELECT
  ps.legacy_fee_transaction_id,
  ps.student_profile_id                AS staged_student,
  pr.student_program_enrollment_id,
  spe.student_id                       AS resolved_enrolment_student,
  pr.resolution_method
FROM _payment_staging ps
JOIN _payment_enrolment_resolution pr
  USING (legacy_fee_transaction_id)
LEFT JOIN student_program_enrollments spe
  ON spe.id = pr.student_program_enrollment_id
WHERE
  (
    -- Resolved record has no enrolment ID
    pr.resolution_method <> 'unresolved'
    AND pr.student_program_enrollment_id IS NULL
  )
  OR (
    pr.student_program_enrollment_id IS NOT NULL
    AND (
      spe.id IS NULL                                         -- enrolment ID does not exist
      OR spe.student_id IS DISTINCT FROM ps.student_profile_id  -- wrong student
    )
  );
-- MUST RETURN ZERO ROWS before running the INSERT below.

INSERT INTO payments (
  id, payment_reference, student_program_enrollment_id,
  migrated_student_profile_id, migration_status,
  amount, currency, method, status, idempotency_key,
  initiated_at, succeeded_at, safe_provider_metadata
)
SELECT
  gen_random_uuid(),
  COALESCE(ps.receipt_number, ps.idempotency_key),
  pr.student_program_enrollment_id,   -- NULL is accepted; FK is nullable (verified above)
  ps.student_profile_id,
  CASE
    -- Fix: treat both NULL (no resolution row at all) and explicit 'unresolved'
    -- as enrolment_unresolved. A LEFT JOIN returning NULL means the payment was
    -- never resolved — that is the same state as being explicitly marked unresolved.
    WHEN pr.resolution_method IS NULL         THEN 'enrolment_unresolved'
    WHEN pr.resolution_method = 'unresolved'  THEN 'enrolment_unresolved'
    WHEN ps.legacy_status = 'refunded'        THEN 'refund_needs_review'
    ELSE 'promoted'
  END,
  ps.amount_numeric,
  'INR',
  COALESCE(LOWER(ps.payment_method_raw), 'other')::payment_method,
  CASE ps.legacy_status
    WHEN 'success'  THEN 'succeeded'
    WHEN 'failed'   THEN 'failed'
    WHEN 'pending'  THEN 'pending'
    WHEN 'refunded' THEN
      -- (Blocker 1) Determine the correct status from Pre-2 review:
      -- If the refund covered the full original amount and the payment
      -- is considered closed: use 'succeeded' (then the refund record explains the reversal).
      -- If partially refunded: use 'partially_refunded' if that enum value exists.
      -- The value below is a placeholder. Replace it with the decided value
      -- before running this migration in any non-local environment.
      'succeeded'::payment_status  -- PLACEHOLDER: replace after Pre-2 finance review
    ELSE
      -- Unknown status encountered. This branch must not be reached in production.
      -- Return to Pre-1, add an explicit branch, and re-run.
      NULL  -- will fail the NOT NULL constraint on status, making the gap visible
  END::payment_status,
  ps.idempotency_key,
  ps.initiated_at,
  ps.succeeded_at,
  ps.raw_data
FROM _payment_staging ps
LEFT JOIN _payment_enrolment_resolution pr USING (legacy_fee_transaction_id)
ON CONFLICT (idempotency_key) DO NOTHING;
-- Verify immediately: SELECT COUNT(*) FROM payments WHERE idempotency_key LIKE 'legacy-%'
-- must equal SELECT COUNT(*) FROM _payment_staging. Any gap is a blocking defect.

-- ============================================================
-- Stage 3b: create payment_refund records for refunded transactions.
-- Run after Pre-2 finance review has confirmed actual refund amounts.
-- ps.amount_numeric is the original payment amount — not necessarily the
-- refunded amount. If the actual refunded amount differs, it must come from
-- authoritative records, not from FeeTransaction.amount.
-- ============================================================
INSERT INTO payment_refunds (
  id, payment_id, refund_reference, amount, currency,
  status, reason, requested_at
)
SELECT
  gen_random_uuid(),
  p.id,
  'legacy-refund-' || ps.legacy_fee_transaction_id,
  ps.amount_numeric,  -- VERIFY: is this the full refund amount or the original payment amount?
  'INR',
  'refunded',
  'Legacy refund migrated from FeeTransaction. Original reason and actual refund amount require manual review and confirmation from authoritative billing records.',
  COALESCE(ps.succeeded_at, ps.initiated_at)
FROM _payment_staging ps
JOIN payments p ON p.idempotency_key = ps.idempotency_key
WHERE ps.legacy_status = 'refunded'
ON CONFLICT DO NOTHING;
-- Verify: SELECT COUNT(*) FROM payment_refunds WHERE refund_reference LIKE 'legacy-refund-%'
-- must equal SELECT COUNT(*) FROM "FeeTransaction" WHERE status = 'refunded'.
```

**Why this design is correct:**
- **Blocker 1 resolved:** Refund status is not assumed. The CASE branch contains a clearly labelled placeholder that will cause a visible error if not replaced before non-local execution. Stage 3b's refund amount carries an explicit verification instruction
- **Blocker 2 resolved:** Schema compatibility is verified with a pre-flight query before any data movement. If the NOT NULL constraint exists, it is removed via a named forward migration with explicit documentation, not silently assumed away
- **Blocker 3 resolved:** The anti-join completeness check must return zero rows before Stage 3. It is not a post-hoc verification; it is a hard gate. Any excluded transaction requires either a corrected mapping or an explicitly approved, documented exception
- Every legacy transaction appears in `payments` regardless of enrolment resolution
- `migration_status` makes all categories visible and distinguishable
- The `ELSE NULL` branch for unknown statuses will fail the NOT NULL constraint on `status`, making any unhandled legacy value immediately visible rather than silently wrong

**Step 3 — Allocate only where evidence supports it:**

Unresolved historical allocations (where documentary evidence is insufficient) must be recorded explicitly with a tracking status, not silently dropped or invented.

**Step 4 — Five independent reconciliation totals (all required before cutover): [v4-CORRECTED]**

```sql
-- (A) Total FeeTransaction rows by status — legacy model
-- Run this FIRST during Phase 0 to discover every distinct status value
SELECT status, COUNT(*) AS row_count, SUM(amount) AS total_amount
FROM "FeeTransaction" GROUP BY status ORDER BY status;

-- (B) Total migrated rows by migration_status — new model
-- Must match (A) in total row count; every legacy row must appear here
SELECT migration_status, COUNT(*) AS row_count, SUM(amount) AS total_amount
FROM payments WHERE idempotency_key LIKE 'legacy-%' GROUP BY migration_status;

-- (C) Total staged rows vs total payments rows — must both equal FeeTransaction count
SELECT
  (SELECT COUNT(*) FROM "FeeTransaction")                             AS source_count,
  (SELECT COUNT(*) FROM _payment_staging)                             AS staging_count,
  (SELECT COUNT(*) FROM payments WHERE idempotency_key LIKE 'legacy-%') AS payments_count;
-- All three numbers must be identical. Any discrepancy is a blocking defect.

-- (D) Successful payment amounts must reconcile per student
-- Uses _payment_staging (student-level), NOT payments-through-enrolment (which would exclude unresolved)
SELECT
  sp.student_number,
  ROUND(SUM(ft.amount)::numeric, 2) AS legacy_success_total,
  SUM(ps.amount_numeric)            AS staged_success_total
FROM "FeeTransaction" ft
JOIN _id_map sm ON sm.table_name = 'Student' AND sm.old_id = ft."studentId"
JOIN student_profiles sp ON sp.id = sm.new_id
JOIN _payment_staging ps ON ps.legacy_fee_transaction_id = ft.id
WHERE ft.status = 'success'
GROUP BY sp.student_number
HAVING ABS(ROUND(SUM(ft.amount)::numeric, 2) - SUM(ps.amount_numeric)) > 0.01;
-- Must return ZERO ROWS.

-- (E) Invoice totals agree with their lines — must return ZERO ROWS
SELECT si.invoice_number,
  si.total_amount AS header_total,
  SUM(il.line_total) - si.discount_total + si.tax_total AS computed_total
FROM student_invoices si
JOIN invoice_lines il ON il.invoice_id = si.id
GROUP BY si.id, si.invoice_number, si.total_amount, si.discount_total, si.tax_total
HAVING ABS(si.total_amount -
  (SUM(il.line_total) - si.discount_total + si.tax_total)) > 0.01;
-- Must return ZERO ROWS.
```

> **Note on reconciliation query (D):** The amount comparison is performed against `_payment_staging` using a direct JOIN on `legacy_fee_transaction_id` — NOT through `payments JOIN student_program_enrollments JOIN student_profiles`. The latter join path would exclude payments with `enrolment_unresolved` migration status, making the reconciliation falsely appear to pass while those records are absent.

Finance owner sign-off on all five totals — including explicit confirmation that `enrolment_unresolved` and `refund_needs_review` records have been individually reviewed — is required before Phase 6 cutover.

**[CORRECTED — Correction 3] Financial business invariants:**

| Invariant | Enforcement |
|---|---|
| Payment allocations cannot exceed payment amount | Application transaction + pre-insert aggregate check |
| Invoice cannot be overpaid unless credits explicitly supported | Application transaction + explicit credit policy |
| Refunds cannot exceed eligible refundable amount | Transactional check against original payment and prior refunds |
| Invoice total = sum(lines) - discount + tax | Application-layer aggregate check on every line mutation |
| Concurrent payment callbacks create exactly one payment | `idempotency_key UNIQUE` + provider event unique index |

---

### Phase 7: Library Redesign (2–3 weeks)

**New tables:**
- `library_items` — from `Book` (title level)
- `library_item_authors` — parsed from `Book.author` (single text → normalised rows)
- `library_copies` — synthetic copies from `Book.totalCopies`; copies where index `<= (totalCopies - availableCopies)` set to `status = 'on_loan'`, linked to active `CirculationRecord`s by `bookId`
- `library_loans` — from `CirculationRecord`
- `library_fines` — from `FineRecord`
- `library_fine_payments` — inferred where `FineRecord.status = 'paid'`

> **Known data gap:** `Book.availableCopies` tells us how many are available but not which specific physical copies are on loan. Copy-to-borrower assignment is best-effort. Active loans must be manually verified by library staff before cutover.

**Validation query (zero-row required):**
```sql
SELECT copy_id, count(*) FROM library_loans
WHERE status='active' GROUP BY copy_id HAVING count(*) > 1;
```

**Gate:** No copy has two active loans. Library owner has reviewed the synthetic copy-to-loan assignments.

---

### Phase 8: Notices, Workflows, Audit (2 weeks)

**New tables:**
- `notices` — from `Notice`
- `notice_audiences` — from `Notice.targetRole + Notice.department`
- `notice_user_states` — empty (no read-receipt history to migrate)
- `leave_types` — seeded from distinct `LeaveRequest.type` values, validated by HR/admin owner
- `leave_requests` — from `LeaveRequest`, mapping TEXT type to `leave_type_id`
- `leave_approvals` — empty (no approval trail in old schema — documented data loss)
- `document_types` — seeded from distinct `DocumentRequest.documentName` values
- `document_requests` — from `DocumentRequest`
- `audit_events` — empty; begins capturing events immediately upon deployment
- `idempotency_records`, `outbox_events` — empty; activated per new feature

**[CORRECTED — Correction 4D] Notice audience scope validation:**

Add enforcement to ensure `notice_audience` scope fields are used consistently — a department-scoped audience should not reference departments and campuses from inconsistent institution scopes.

---

### Phase 9: Placement, Grants, Expenses (2 weeks)

**New tables:**
- `companies` — normalised from distinct `PlacementRecord.companyName` (trimmed, deduplicated)
- `placement_drives` — inferred: one per `(company_id, offerDate)`; academic term from `_term_date_map`
- `drive_applications` — from `PlacementRecord`
- `placement_offers` — one per placed student
- `research_grants` — from `ResearchGrant` (verify drift table exists first)
- `grant_investigators` — empty (no faculty-grant relationship in old schema — documented data loss)
- `expense_records` — from `ExpenseRecord` (verify drift table exists first)
- `expense_approvals` — empty

---

### Phase 10: API Layer Migration and Cutover (6–10 weeks)

**Goal:** Re-implement all 57 endpoints against new tables. Retire old tables.

**Approach:** Feature-flagged parallel routes. Old route default; new route enabled per environment. Integration tests compare responses. Switch on passing tests, not on a working dashboard.

**[CORRECTED — Correction 6] Full session security implementation required:**

The authentication migration must implement all of the following:

1. **Cookie flags:** `HttpOnly`, `Secure` (production), `SameSite=Lax` or `Strict` — determined by deployment architecture
2. **CSRF protection:** Synchronised token pattern or double-submit cookie. Do not assume `SameSite` alone is sufficient for all browser/proxy combinations
3. **Session revocation:** `auth_sessions.revoked_at` set on logout; all sessions revoked on password change or security-sensitive role change
4. **Session fixation prevention:** Issue a new session token after successful authentication and privilege elevation
5. **Forced password change:** Enforced server-side — users with `must_change_password` cannot access protected resources
6. **Credential migration:** Existing bcrypt hashes preserved; re-hash to Argon2id or confirmed-work-factor bcrypt on next successful login
7. **Authentication audit:** All auth events logged to `authentication_events`
8. **Rate limiting:** Tighter per-IP limits on auth endpoints than the global rate limiter

**API endpoint priority:**
1. Auth endpoints → `auth_sessions` with full security properties
2. Student profile CRUD → `student_profiles` + `student_program_enrollments`
3. Attendance marking → `class_sessions` + new `attendance_records`
4. Fee payment → invoice/payment/allocation model with idempotency
5. Library issue/return → `library_copies` + `library_loans`
6. Analytics → rewrite against new normalised tables
7. All remaining endpoints

---

## Part 6: What NOT to Do

| ❌ Prohibition | Reason |
|---|---|
| Infer academic terms from `Student.semester` integers | Semester numbers do not represent unique calendar periods across cohorts |
| Infer course enrolments solely from attendance records | Students who never attended are silently dropped |
| Create invoices and allocate old payments without documentary evidence | Invents allocation links not supported by historical records |
| Use a multiply-prone join to validate financial totals | A zero-row result is only meaningful if the join logic is correct |
| `prisma db push` against any non-local database | Bypasses migration history |
| Edit `202608310001_init` migration | Already applied — immutable |
| Run `CampusOne-ERP-Target-Schema.sql` directly against production | It is a design baseline, not a migration script |
| Persist `cgpa`, `attendancePercentage`, `availableCopies` as writable truth | Derived projections — must be computed from source facts |
| Store money in `Float`/`Double Precision` | IEEE 754 cannot represent exact decimal values |
| Hard-delete students, faculty, payments, published grades, library loans | Use lifecycle state; restrict deletion |
| Assume `SameSite` cookie alone prevents CSRF | Does not apply universally across all browser/proxy combinations |
| Declare migration done because the dashboard loads | Full reconciliation and stakeholder sign-off required |

---

## Part 7: Risk Register (Revised)

| # | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Payment migration SQL silently misclassifies or excludes transactions | High | Critical | Three-stage approach with `_payment_staging`; LEFT JOIN (not INNER); `migration_status` column; five independent reconciliation totals from staging not from enrolment join; finance owner sign-off |
| R2 | Academic calendar not available — historical records cannot be placed in correct terms | High | Critical | Obtain calendar in Phase 0; block Phase 1 until received |
| R3 | Course enrolment misses students who never attended | High | High | Official registration records as primary source; academic owner sign-off on inferred |
| R4 | PK type change (TEXT cuid → UUID) breaks cached IDs and URLs | High | High | ID mapping table; client cache invalidation; URL migration strategy |
| R5 | Policy questions remain unanswered | High | Critical | Block Phase 1 start; escalate to institution leadership |
| R6 | Drift tables absent in some environments | Medium | High | Confirm in Phase 0; formalise with migration before any other work |
| R7 | Prisma 7.10 `partialIndexes` preview has undocumented limitations | Medium | Medium | Test each partial index in isolation; fall back to raw SQL if needed |
| R8 | Scheduling overlap not enforced until Phase 4 | Medium | Medium | Implement exclusion constraint or serializable transaction before Phase 4 cutover |
| R9 | Fee dual-write race condition during transition | Medium | High | Feature-flag; never dual-write financial events concurrently |
| R10 | Canonical admission FK unresolved — both relationships in target SQL | Medium | Medium | Decide and remove non-canonical column before Phase 2 migration code |
| R11 | Target schema changes after partial migration | Medium | High | Freeze target schema at Phase 0 sign-off; all changes = new forward migrations |
| R12 | CSRF vulnerability in new cookie-based auth | Medium | High | Implement synchronised token or double-submit; test with cross-origin scenarios |
| R13 | Library copy-to-loan synthetic assignment incorrect | Medium | Medium | Library staff manual review of all active loans before cutover |
| R14 | Payment migration SQL multiplies or drops rows if programme enrolment count != 1 | High | Critical | Three-stage staging approach; verify staging row count equals source count exactly; finance owner reviews |
| R15 | Programme enrolment multiplicity policy unresolved — migration assumes one-per-student | High | High | Escalate to academic owner before Phase 2 coding; enforce chosen policy with constraint or explicit documentation |

---

## Part 8: Execution Readiness Checklist (Revised)

### Before Writing Any Code
- [ ] 12 policy questions answered and signed off
- [ ] Official academic calendar obtained for all historical periods
- [ ] `npx prisma validate` and `npx prisma migrate status` output documented
- [ ] Schema snapshot from all environments via `pg_dump`
- [ ] Data quality checks (Checklist Section 2) complete with exception report
- [ ] Drift tables confirmed present/absent in each environment
- [ ] Verified backup taken and restore tested on isolated database
- [ ] Single-institution vs multi-tenant decision finalised
- [ ] Finance owner identified and committed to reconciliation sign-off
- [ ] Academic owner identified for enrolment and grade record sign-off
- [ ] Canonical admission-to-student FK relationship decided (Correction 4A)
- [ ] Prisma 7.10 partial index support verified against `partialIndexes` preview feature
- [ ] **[v3]** Programme enrolment multiplicity policy answered by academic owner (one-per-student or multiple permitted)
- [ ] **[v3]** Historical timetable snapshot records requested from institution; availability documented
- [ ] **[v3]** Drift tables (`SystemActivity`, `ExpenseRecord`, `ResearchGrant`, `Notice.isPinned`) confirmed present or absent in every target environment **before** writing the formalising migration — the migration must reconcile existing state, not blindly recreate it

### Before Phase 3 (Course Catalog)
- [ ] `_term_date_map` fully populated from official academic calendar
- [ ] Official course registration records requested from institution

### Before Phase 6 (Finance)
- [ ] Policy questions 6 and 7 answered
- [ ] Floating-point rounding analysis on all `FeeTransaction.amount` values complete
- [ ] Historical fee obligation documentation collected (billing records, fee notices)
- [ ] Idempotency key format and scope confirmed
- [ ] All five independent reconciliation totals passing (A through E — verified from `_payment_staging`, not from enrolment join)
- [ ] **[v3]** `_payment_staging` row count verified equal to source `FeeTransaction` row count (zero drops — every status preserved)
- [ ] **[v3]** `_payment_enrolment_resolution` reviewed by finance owner; all `unresolved` records individually approved or escalated before Stage 3 promotion
- [ ] **[v4]** `SELECT DISTINCT status FROM "FeeTransaction"` run during Phase 0; every distinct value has an explicit branch in the Stage 3a CASE expression — no status falls through to the unknown catch-all
- [ ] **[v4]** All `enrolment_unresolved` and `refund_needs_review` payments individually reviewed and signed off by finance owner
- [ ] **[v4]** `payment_refunds` rows created for every `refunded` legacy transaction; count verified against `SELECT COUNT(*) FROM "FeeTransaction" WHERE status='refunded'`
- [ ] Finance owner sign-off obtained

### Before Phase 10 (Cutover)
- [ ] All 57 endpoints have new implementations with integration tests
- [ ] Cross-student isolation authorisation tests pass
- [ ] Concurrent payment webhook test (10–50 same event) → exactly 1 payment created
- [ ] **[v3]** Session time provenance (`time_source`) verified for all migrated `class_sessions`; reconstructed sessions flagged in analytics layer
- [ ] Concurrent library copy issue test → exactly 1 loan created
- [ ] CSRF protection tested with cross-origin request scenarios
- [ ] Session revocation tested: logout invalidates session immediately
- [ ] Analytics reconcile against financial/academic ledger totals
- [ ] Scheduling conflict enforcement implemented and tested
- [ ] Rollback procedure documented and rehearsed

---

## Part 9: Timeline Estimate (Unchanged)

| Phase | Scope | Duration | Policy Blocker |
|---|---|---|---|
| 0 | Evidence lock, calendar collection, policy questions | 1–2 weeks | All 12 — must answer before Phase 1 |
| 1 | Foundation schema (RBAC, calendar from official source, master data) | 2–3 weeks | #1 (single vs multi-tenant) |
| 2 | Student/faculty lifecycle, admissions | 3–4 weeks | #2, #3 |
| 3 | Course catalog, offerings, enrolments (with verified sources) | 2–3 weeks | #4 |
| 4 | Attendance, timetable, scheduling conflict enforcement | 2–3 weeks | #9 |
| 5 | Assessments, grading | 3–4 weeks | #5 |
| 6 | Finance redesign with full reconciliation | 4–6 weeks | #6, #7 |
| 7 | Library | 2–3 weeks | #8 |
| 8 | Notices, workflows, audit | 2 weeks | #10, #11 |
| 9 | Placement, grants, expenses | 2 weeks | — |
| 10 | API migration, full security hardening, cutover | 6–10 weeks | All 12 answered |
| **Total** | | **30–43 weeks** | — |

> **Realistic timeline:** 8–12 months for a team of 2–3 developers.

---

## Part 10: Immediate Next Actions (This Week)

In priority order — what can be done right now:

1. **Run Phase 0 diagnostic commands** — `prisma validate`, `prisma migrate status`, `pg_dump`, all quality queries from Checklist Section 2. Document every output
2. **Obtain the official academic calendar** — this is now a Phase 0 hard dependency
3. **Draft the 12-question policy document** and distribute to academic/finance/library/legal stakeholders
4. **Decide the canonical admission-to-student FK** (`student_profiles` vs `student_program_enrollments`) before any Phase 2 code is written
5. **Verify Prisma 7.10 partial index support** — enable `partialIndexes` preview in a test schema and confirm specific target SQL indexes work correctly; document which will use DSL vs raw SQL
6. **Resolve schema drift** — create a forward migration that formally adds `SystemActivity`, `ExpenseRecord`, `ResearchGrant`, and `Notice.isPinned`. Safe, additive, independent of redesign
7. **Fix default passwords** — remove `student123`/`faculty123`; implement secure temporary-password + forced-change flow
8. **Fix the fee payment race condition** — wrap balance check + payment creation in a Prisma transaction. Five-line change, independent of redesign
9. **Do not begin Phase 1 schema work** until items 1–5 are complete and signed off
