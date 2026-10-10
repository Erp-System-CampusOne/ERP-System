# Migration Analysis

> **Verification Status:** Verified from `backend/prisma/migrations/202608310001_init/migration.sql` and `backend/prisma/migrations/migration_lock.toml`.

## Migration Summary

| Migration | Timestamp | Main Changes | Affected Tables | Risk | Status Evidence |
|---|---|---|---|---|---|
| `202608310001_init` | 2026-08-31 | Complete schema creation — all tables, enums, indexes, FKs | All 21 tables | Low (initial creation) | Present in `migrations/` folder; `migration_lock.toml` references postgresql provider |

**Total migrations: 1**

> **Implication:** The entire database schema was created in a single migration. There are no incremental migrations, meaning the history of schema evolution is not tracked through migration files. Any future change requires a new migration.

---

## Migration Detail: 202608310001_init

### Schema Initialisation
- Creates schema: `public`
- Creates **15 PostgreSQL enums**: Role, FeeStatus, AttendanceStatus, ExamStatus, FeeQuota, PaymentMethod, TransactionStatus, CirculationStatus, FineStatus, NoticeCategory, NoticeTargetRole, CourseType, DayOfWeek, DocumentStatus, ApplicationStatus, LeaveStatus
- Creates **21 tables** in dependency order:
  1. `User`
  2. `Department`
  3. `Student`
  4. `Faculty`
  5. `Course`
  6. `AttendanceRecord`
  7. `TimetableEntry`
  8. `Examination`
  9. `ExamResult`
  10. `FeeStructure`
  11. `FeeTransaction`
  12. `Book`
  13. `CirculationRecord`
  14. `FineRecord`
  15. `Notice`
  16. `LeaveRequest`
  17. `DocumentRequest`
  18. `AdmissionApplication`
  19. `PlacementRecord`
  20. `Permission`
  21. `RolePermission`

> Note: `SystemActivity`, `ExpenseRecord`, and `ResearchGrant` are present in `schema.prisma` but were checked — they are NOT in the migration SQL. These three tables may have been added to schema.prisma after the initial migration was created but before a new migration was run.

### **CRITICAL FINDING — Schema Drift**

Comparing `schema.prisma` to `migration.sql`:

| Table | In schema.prisma | In migration.sql |
|---|---|---|
| SystemActivity | Yes | **NO** |
| ExpenseRecord | Yes | **NO** |
| ResearchGrant | Yes | **NO** |

**This means `prisma migrate status` would likely report schema drift** — these three tables exist in the Prisma schema definition but may not have a corresponding migration. If `prisma db push` was used or a manual migration created them, they exist in the DB but are undocumented.

Recommendation: Run `npx prisma migrate status` to confirm.

---

## Migration Lock

```toml
# migration_lock.toml
provider = "postgresql"
```

---

## Schema Comparison: Prisma vs Migration

Key observation from the migration SQL:

The `Course` table uses column name `faculty_instructor` (DB column):
```sql
"faculty_instructor" TEXT
```

While Prisma model uses `facultyId` with `@map("faculty_instructor")` — this is intentional field renaming with column mapping. The DB column retains backward-compatible name.

---

## Backup Files

The directory `backend/prisma/migrations_backup/` exists (noted in directory listing). Its contents were not inspected. **Status: Unverified.**

---

## Seed Files

| File | Purpose | Environment |
|---|---|---|
| `prisma/seed.ts` | Comprehensive development seed with realistic data | Development |
| `prisma/seed.js` | Alternative JS version of seed | Development |
| `prisma/seed.production.ts` | Minimal production seed (likely permissions + admin user) | Production |
| `prisma/repair-library.ts` | One-off script to repair library data inconsistencies | Maintenance |

The `package.json` Prisma seed command: `"seed": "ts-node prisma/seed.ts"` (for `npx prisma db seed`)
The `scripts.seed:production` command: `"ts-node prisma/seed.production.ts"`
