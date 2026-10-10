# CampusOne ERP — Database Redesign Implementation Checklist

Use this alongside `CampusOne-ERP-World-Class-Database-Redesign.md` and `CampusOne-ERP-Target-Schema.sql`. The target SQL is a reference baseline, not an in-place migration. All checks should run against a disposable database first and against a production snapshot before cutover.

## 1. Evidence collection commands

Run from the exact ERP repository commit and record the outputs (redact secrets and connection strings):

```bash
# Confirm toolchain and Prisma version
node --version
npx prisma --version

# Validate Prisma schema and migration state
npx prisma validate
npx prisma migrate status

# PostgreSQL schema-only snapshot (use a read-only / appropriately scoped account)
pg_dump "$DATABASE_URL" --schema-only --no-owner --no-privileges > source-schema.sql

# Table and approximate row-count inventory
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "
SELECT schemaname, relname AS table_name, n_live_tup AS estimated_rows
FROM pg_stat_user_tables
ORDER BY schemaname, relname;"

# FK inventory
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "
SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE contype='f' ORDER BY 1,2;"

# Unique/check/exclusion constraint inventory
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "
SELECT conrelid::regclass AS table_name, conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint WHERE contype IN ('p','u','c','x') ORDER BY 1,2;"

# Index inventory
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "
SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2,3;"
```

Do not copy credentials into tickets, logs or generated docs. Do not use `prisma db push` to patch a production database. For the project's Prisma 7 toolchain, use the commands documented for that exact version; do not blindly apply instructions for Prisma 8's new contract workflow.

## 2. Source data quality checks

Adapt names to the actual deployed schema; the queries below are examples for the documented legacy model. Run them read-only and retain counts plus a controlled exception export.

```sql
-- Duplicate email ignoring case (legacy User.email may be case-sensitive)
SELECT lower(trim(email)) AS normalized_email, count(*)
FROM "User" GROUP BY lower(trim(email)) HAVING count(*) > 1;

-- Duplicate identifiers
SELECT "rollNumber", count(*) FROM "Student" GROUP BY "rollNumber" HAVING count(*) > 1;
SELECT "employeeCode", count(*) FROM "Faculty" GROUP BY "employeeCode" HAVING count(*) > 1;

-- Orphan records (should return zero rows if FK exists and is trusted)
SELECT s.id, s."userId" FROM "Student" s LEFT JOIN "User" u ON u.id=s."userId" WHERE u.id IS NULL;
SELECT a.id, a."studentId" FROM "AttendanceRecord" a LEFT JOIN "Student" s ON s.id=a."studentId" WHERE s.id IS NULL;
SELECT r.id, r."studentId" FROM "ExamResult" r LEFT JOIN "Student" s ON s.id=r."studentId" WHERE s.id IS NULL;

-- Duplicate attendance candidates (the database's exact uniqueness may prevent these)
SELECT "studentId", "courseId", date, period, count(*)
FROM "AttendanceRecord" GROUP BY "studentId", "courseId", date, period HAVING count(*) > 1;

-- Suspicious numeric values; do not silently clamp them
SELECT id, "tuitionFee", "hostelFee", "examFee", "libraryDeposit", "totalAmount"
FROM "FeeStructure" WHERE "tuitionFee" < 0 OR "hostelFee" < 0 OR "examFee" < 0 OR "libraryDeposit" < 0 OR "totalAmount" < 0;
SELECT id, amount FROM "FeeTransaction" WHERE amount <= 0;
SELECT id, ctc FROM "PlacementRecord" WHERE ctc < 0;

-- Potential application-to-student conversion gaps must be investigated from real workflow data.
SELECT status, count(*) FROM "AdmissionApplication" GROUP BY status ORDER BY status;

-- Potential migration drift: compare model declarations to the live pg_catalog and migration replay.
-- Do not use table existence alone as proof that all columns, constraints, indexes and enum values match.
```

## 3. Required mapping register

Create one row per source column with these columns:

| Field | Required meaning |
|---|---|
| source_table / source_column | Exact legacy identifier |
| target_table / target_column | Exact target identifier |
| transform | SQL/script rule, normalization, ID mapping |
| default_policy | Only a justified business default; otherwise null/exception |
| loss_or_ambiguity | Historical data the source never captured |
| validation_query | Query proving transformed data meets invariant |
| exception_owner | Person who approves exceptions |
| signoff | Timestamp and reviewer |

Never fabricate historical course enrollment, term, appointment, invoice allocation, or grade-change history if the legacy model did not store it. Use a clearly marked legacy/unknown status and preserve source IDs for traceability.

## 4. Required migration rehearsal

- [ ] Restore the source backup to an isolated database and verify application can connect.
- [ ] Build target from migrations only, with no manual DDL.
- [ ] Run import twice; the second run must not duplicate rows or financial events.
- [ ] Compare counts by domain and by academic year/term.
- [ ] Compare students by roll/student number and profile identity mapping.
- [ ] Compare attendance counts by student/course/term and classify unassignable historical attendance.
- [ ] Compare assessment/result counts, max scores, grades, and published states.
- [ ] Reconcile total successful legacy payments against imported payments and invoice allocations; exceptions must be individually explained.
- [ ] Reconcile fee balances by student and by invoice; totals must match a signed-off reconciliation report.
- [ ] Compare active library loans, overdue loans, fines and copy inventory; no copy can have more than one active loan.
- [ ] Compare placement outcomes, grant totals and expenses if these modules are in production use.
- [ ] Confirm notice targeting semantics and preserve publisher identity.
- [ ] Run API smoke tests and authorization tests against target.
- [ ] Record migration runtime, locks, database growth and rollback/recovery steps.

## 5. Concurrency tests (automate)

### Payment webhook idempotency
1. Send the same provider event concurrently 10–50 times.
2. Assert exactly one provider event/payment is accepted.
3. Replay same idempotency key with a different request hash; reject with conflict.
4. Attempt concurrent allocations that together exceed invoice due; assert no over-allocation.
5. Simulate timeout after provider success but before API response; retry must return the original payment result.

### Library copy issue
1. Two librarians concurrently issue the same copy to different borrowers.
2. Assert one succeeds and one receives a conflict.
3. Verify copy status and active loan remain consistent after return, loss, renewal and failed transaction.

### Attendance and grading
1. Concurrent attendance submissions for the same session/enrollment must create one row.
2. A class session marked cancelled must not accept ordinary attendance unless a documented override exists.
3. Grade publication must be authorized, and a correction must create a reasoned history event.
4. A student cannot receive a result for a course offering they were not enrolled in unless an explicit exception process is approved.

### Role and appointment lifecycle
1. Expired/revoked role assignments stop authorizing requests.
2. A department HOD assignment has effective dates and an authorized actor.
3. A user cannot grant a role or scope beyond their own delegated authority.
4. Scope checks must prevent a department-level role from accessing another department's records.

## 6. Target schema tests

Run against the new schema after validating the SQL in a disposable PostgreSQL 16 instance:

```sql
-- No negative invoice lines or payment allocations
SELECT id FROM invoice_lines WHERE line_total < 0 OR discount_amount < 0 OR tax_amount < 0;
SELECT id FROM payments WHERE amount <= 0;
SELECT id FROM payment_allocations WHERE amount <= 0;

-- No duplicate active loan per physical copy (also enforced by partial unique index)
SELECT copy_id, count(*) FROM library_loans WHERE status='active' GROUP BY copy_id HAVING count(*) > 1;

-- Current result uniqueness (also enforced by partial unique index)
SELECT assessment_id, course_enrollment_id, count(*)
FROM assessment_results WHERE result_status <> 'superseded'
GROUP BY assessment_id, course_enrollment_id HAVING count(*) > 1;

-- Pending outbox backlog
SELECT count(*) AS unpublished_events FROM outbox_events WHERE published_at IS NULL;

-- Unresolved file scans must not be served as downloads by the application
SELECT id, original_filename FROM stored_files WHERE malware_scan_status IN ('pending','infected','failed');
```

Important: cross-row totals (e.g. invoice `subtotal` equals the sum of all invoice lines, total allocations do not exceed payment/invoice amounts, total assessment weights add up to policy, timetable overlaps) cannot all be safely expressed as ordinary row-level `CHECK` constraints. Enforce them in a transaction-safe domain service and/or deferred trigger/exclusion constraint, then cover them with concurrency tests and reconciliation jobs.

## 7. Required production release gates

- [ ] Business owners sign off the unresolved policy questions in the redesign blueprint.
- [ ] Schema owner signs off the target ERD and data dictionary.
- [ ] Security reviewer approves RBAC, credential/session model, PII handling, audit event policy and database privileges.
- [ ] Finance owner approves invoice/payment/refund reconciliation rules and rounding.
- [ ] Academic owner approves term, enrollment, attendance, assessment and grading rules.
- [ ] Library owner approves copy/loan/fine lifecycle.
- [ ] Migration reviewer approves the mapping register and exception list.
- [ ] Backup restore and rollback rehearsals pass.
- [ ] CI can rebuild from an empty database and run tests.
- [ ] Monitoring/alerts, retention, RPO/RTO and ownership are documented.
- [ ] Cutover window, rollback trigger, communication plan and final reconciliation owner are named.

## 8. Do not do these things

- Do not drop/recreate production tables to make Prisma validation pass.
- Do not edit an already-applied migration SQL file.
- Do not use a live database as a scratchpad for unreviewed schema experiments.
- Do not store money in `float`/`double precision`.
- Do not hard-delete students, employees, payments, published grades, admission decisions, library loans or audit events to “clean up” data.
- Do not let the frontend decide role authority, final balances, published grades or payment success.
- Do not make `Student.semester`, `attendancePercentage`, `cgpa`, `Book.availableCopies` or `Student.feeStatus` independently writable sources of truth.
- Do not mark a migration successful solely because a dashboard loads. Reconcile data and test concurrent operations.
