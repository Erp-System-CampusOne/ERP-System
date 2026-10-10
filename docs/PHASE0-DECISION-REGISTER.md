# CampusOne ERP — Phase 0 Stakeholder Decision Register

**Document ID:** `CAMPUSONE-DEC-REG-P0`  
**Date:** 2026-10-10  
**Status:** ✅ **APPROVED & SIGNED OFF**  
**Approval Gate:** Phase 0 Formally Closed. Phase 1 (Foundation Schema) Authorized.  
**Scope:** Authoritative baseline for P0.6 (Academic Calendar), P0.7 (Institutional Policy Decisions), and P0.8 (Phase 0 Exit Gate).

---

## Part A: Academic Calendar Specification (P0.6)

### 1. Canonical Term Naming & Formatting Standard
* **Academic Year Format:** `YYYY-YYYY` (e.g., `2026-2027`).
* **Term Code Format:** `<YYYY>-<TERM>` where `<TERM>` is:
  * `ODD` (Fall semester / Odd semester, typically July–December).
  * `EVEN` (Spring semester / Even semester, typically January–May).
  * `SUMMER` (Optional supplementary/summer term, typically June–July).

### 2. Active Academic Period (Corroborated by Live Examination & Fee Data)
* **Academic Year:** `2026-2027` (Starts: `2026-07-01`, Ends: `2027-06-30`).
* **Active Term:** `2026-ODD` (Semester 1 / 3 / 5 / 7)
  * Term Start Date: `2026-07-15`
  * Term End Date: `2026-12-15`
  * Mid-Semester Examination Window: `2026-09-04` to `2026-09-09` *(matches live `Examination` table)*
  * End-Semester Examination Window: `2026-11-25` to `2026-12-10`
* **Upcoming Term:** `2027-EVEN` (Semester 2 / 4 / 6 / 8)
  * Term Start Date: `2027-01-05`
  * Term End Date: `2027-05-30`
  * Examination Window: `2027-05-02` to `2027-05-20`

### 3. Historical Cohort Term Mapping (`_term_date_map`)
For the existing student population (Batch `2023-2027`, current Semester 7):

| Legacy Semester | Inferred Academic Term | Term Code | Date Range | Confidence |
|---|---|---|---|---|
| Semester 1 | AY 2023-2024 Odd | `2023-ODD` | `2023-07-15` to `2023-12-15` | `inferred_cohort` |
| Semester 2 | AY 2023-2024 Even | `2024-EVEN` | `2024-01-05` to `2024-05-30` | `inferred_cohort` |
| Semester 3 | AY 2024-2025 Odd | `2024-ODD` | `2024-07-15` to `2024-12-15` | `inferred_cohort` |
| Semester 4 | AY 2024-2025 Even | `2025-EVEN` | `2025-01-05` to `2025-05-30` | `inferred_cohort` |
| Semester 5 | AY 2025-2026 Odd | `2025-ODD` | `2025-07-15` to `2025-12-15` | `inferred_cohort` |
| Semester 6 | AY 2025-2026 Even | `2026-EVEN` | `2026-01-05` to `2026-05-30` | `inferred_cohort` |
| Semester 7 | AY 2026-2027 Odd | `2026-ODD` | `2026-07-15` to `2026-12-15` | `verified_live` |

---

## Part B: The 12 Institutional Policy Decisions (P0.7)

### Policy 1: Tenancy & Campus Topology
* **Decision:** **Single Institution with Multi-Campus Hierarchy.**
* **Specification:** The system models a single root `institutions` record. Sub-entities (departments, rooms, notices) reference `campuses`.
* **Schema Impact:** Avoids multi-tenant tenant-isolation overhead in queries, while ensuring room scheduling and notices are partitioned by campus.

### Policy 2: Student & Employee Identity Relationships
* **Decision:** **Dual Roles Supported via Decoupled Profiles.**
* **Specification:** A single physical identity in `users` can be linked to both a `student_profiles` record and an `employee_profiles` record.
* **Schema Impact:** Eliminates 1:1 user-to-role rigidity. Authentication is unified at the `users` table; authorization evaluates the active context/profile.

### Policy 3: Roll Number & Student Number Uniqueness
* **Decision:** **Unique Institution-Wide.**
* **Specification:** `student_profiles.roll_number` is strictly unique across the entire institution.
* **Schema Impact:** Enforced via `CREATE UNIQUE INDEX student_profiles_roll_number_key ON student_profiles(roll_number)`.

### Policy 4: Course Enrolment & Capacity Rules
* **Decision:** **Curriculum-Driven with Offering Capacity Enforcement.**
* **Specification:** Students enroll in courses based on their degree program curriculum and semester. Course offerings have defined capacity limits; enrollment beyond capacity requires administrative override.
* **Schema Impact:** `course_offerings.capacity` enforced via transactional checks before inserting into `course_enrollments`.

### Policy 5: Grading & Assessment Policy
* **Decision:** **10-Point CGPA Scale with Versioned Grade History.**
* **Specification:** Letter grades map to fixed numeric grade points (10.0 scale). Published assessment results cannot be mutated in place; any alteration requires a recorded reason and entry in `grade_change_events`.
* **Schema Impact:** `assessment_results` row update creates an immutable audit row in `grade_change_events`.

### Policy 6: Fee Structure, Invoices, and Payment Allocations
* **Decision:** **Installments Permitted; Explicit Line-Item Allocations.**
* **Specification:** Fees generate an `invoice` containing detailed `invoice_lines`. Students may pay in partial installments. Each payment creates `payment_allocations` referencing specific lines until `balance_due = 0`.
* **Schema Impact:** Invoices cannot be marked paid until the aggregate sum of approved allocations equals the invoice total. Floating point money is eliminated; `NUMERIC(14,2)` is mandatory.

### Policy 7: Accounting & Ledger Depth
* **Decision:** **Student Receivables Sub-Ledger.**
* **Specification:** The system manages detailed student balances, receivables, fee waivers, and refunds. General ledger entries are exported via audit records and financial event logs rather than maintaining a full double-entry chart of accounts in the core operational DB.
* **Schema Impact:** Restricts financial schema complexity to billing, allocations, adjustments, and receipts without requiring complex journal balance balancing in Phase 1.

### Policy 8: Library Borrowing Privileges
* **Decision:** **Unified Borrowing for Active Students and Employees.**
* **Specification:** Any user with an active student or employee profile can borrow items, subject to quota and loan duration limits by role.
* **Schema Impact:** `library_loans.borrower_user_id REFERENCES users(id)`.

### Policy 9: Attendance Policy & Examination Eligibility
* **Decision:** **75% Attendance Threshold with Session-First Tracking.**
* **Specification:** Classes are tracked per session (`class_sessions`). Minimum required attendance for semester examination eligibility is 75%. Absences are categorized as `present`, `absent`, `excused_medical`, and `late`.
* **Schema Impact:** `attendance_records` link to `class_sessions` and `course_enrollments`.

### Policy 10: Multi-Step Approval Workflows
* **Decision:** **Hierarchical Role Approvals.**
* **Specification:** Requests (Leave, Document, Grade Revaluation, Fee Waiver) follow a configurable step pipeline: `Submitted` → `HOD Approval` → `Dean / Principal Approval` → `Finalized`.
* **Schema Impact:** `approval_workflows` and `approval_steps` maintain actor, action (`approved`, `rejected`), comments, and timestamp.

### Policy 11: Privacy, Auditability & Data Retention
* **Decision:** **7-Year Minimum Retention; Soft Deletes for Active Entities.**
* **Specification:** Core master data (students, faculty, courses, transactions) uses `deleted_at IS NULL` soft deletes. Academic transcripts, grades, and completed financial receipts are retained permanently.
* **Schema Impact:** `audit_events` logs all security and transactional mutations.

### Policy 12: Expected Scale & Performance Profile
* **Decision:** **Tier 1 Scale Target (5,000 Active Students, 500 Faculty/Staff, 50 req/sec Peak).**
* **Specification:** Connection pool size: 20–30 connections. Standard B-Tree indexing on foreign keys and active lookup paths. Partitioning is deferred to post-cutover growth.
* **Schema Impact:** Keeps schema clean and portable across cloud PostgreSQL instances (Neon / RDS).

---

## Part C: Phase 0 Exit Sign-Off Status (P0.8)

| Gate Category | Verified Technical Criteria | Approval Status |
|---|---|---|
| Repository Baseline | Clean tree, Node v22, Prisma 7.10 | ✅ Verified |
| Migration Integrity | Non-blocking migration log | ✅ Verified |
| Schema Inventory | 24 tables + 4 drift structures mapped | ✅ Verified |
| Data Quality | Zero orphans, zero duplicate keys | ✅ Verified |
| Disaster Recovery | Complete schema & data snapshot verified in isolated schema | ✅ Verified |
| Academic Calendar (P0.6) | Canonical terms and historical map specified | ✅ Signed Off |
| Policy Decisions (P0.7) | 12 policy specifications detailed above | ✅ Signed Off |

**Sign-off Decision:**
- [x] **APPROVED AS SPECIFIED** — Authorize recording decisions, committing Phase 0 artifacts to Git, and unlocking Phase 1 Foundation Schema.
- [ ] **APPROVED WITH AMENDMENTS** — Specify modifications before commit.
