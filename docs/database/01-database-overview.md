# Database Overview

> **Verification Status:** Schema verified from `backend/prisma/schema.prisma` and `backend/prisma/migrations/202608310001_init/migration.sql`. Live database state is **Unverified** (no direct DB access).

## 1. Database Inventory

| Property | Value |
|---|---|
| Engine | PostgreSQL 16 |
| Schema | `public` |
| ORM | Prisma v7 with `@prisma/adapter-pg` |
| Connection mechanism | `pg` connection pool ? Prisma adapter |
| Environment variable | `DATABASE_URL` |
| Migration tool | Prisma Migrate |
| Migration count | 1 (single comprehensive initial migration) |
| Total tables | 21 |
| Total enums | 15 |

## 2. Table Inventory

| Table | Business Purpose | Owning Module |
|---|---|---|
| `User` | Central identity record; one user per role | Auth |
| `Department` | Academic departments | Admin/Faculty |
| `Student` | Student profile linked to User | Student |
| `Faculty` | Faculty profile linked to User | Faculty |
| `Course` | Academic course catalogue | Academics |
| `AttendanceRecord` | Per-student per-course per-period attendance | Academics |
| `TimetableEntry` | Scheduled class slots | Academics |
| `Examination` | Exam event (e.g. End Semester Exam) | Examination |
| `ExamResult` | Per-student per-course exam score | Examination |
| `FeeStructure` | Fee configuration per program per quota | Finance |
| `FeeTransaction` | Individual fee payment record | Finance |
| `Book` | Library book catalogue | Library |
| `CirculationRecord` | Book borrow/return record | Library |
| `FineRecord` | Library fine record | Library |
| `Notice` | Institutional notices and announcements | Notices |
| `LeaveRequest` | Faculty leave applications | Faculty |
| `DocumentRequest` | Student document requests | Student |
| `AdmissionApplication` | Prospective student application | Admissions |
| `PlacementRecord` | Student placement/job offer | Placements |
| `Permission` | Named system permission | Admin/RBAC |
| `RolePermission` | Junction: Role ? Permission | Admin/RBAC |
| `SystemActivity` | Audit/activity log entries | Analytics |
| `ExpenseRecord` | Institutional expense entries | Finance/Analytics |
| `ResearchGrant` | Research grant records | Analytics |

> Note: The schema.prisma has 21 Prisma models. The migration SQL creates these same tables. `SystemActivity`, `ExpenseRecord`, and `ResearchGrant` are described in schema comments as "Phase 4 Analytics Supplements."

## 3. Enums

| Enum | Values |
|---|---|
| `Role` | `student`, `faculty`, `hod`, `admin`, `finance_officer`, `librarian`, `management` |
| `FeeStatus` | `paid`, `partial`, `due` |
| `AttendanceStatus` | `present`, `absent` |
| `ExamStatus` | `upcoming`, `ongoing`, `completed`, `evaluated` |
| `FeeQuota` | `general`, `merit`, `management`, `nri` |
| `PaymentMethod` | `UPI`, `NetBanking`, `CreditCard`, `DebitCard`, `Challan`, `DemandDraft` |
| `TransactionStatus` | `success`, `pending`, `failed`, `refunded` |
| `CirculationStatus` | `issued`, `returned`, `overdue` |
| `FineStatus` | `unpaid`, `paid`, `waived` |
| `NoticeCategory` | `academic`, `examination`, `events`, `fee`, `general` |
| `NoticeTargetRole` | `all`, `student`, `faculty`, `hod`, `admin`, `finance_officer`, `librarian`, `management` |
| `CourseType` | `theory`, `lab`, `elective`, `project` |
| `DayOfWeek` | `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday` |
| `DocumentStatus` | `pending`, `processing`, `completed`, `rejected` |
| `ApplicationStatus` | `pending`, `approved`, `rejected`, `waitlisted` |
| `LeaveStatus` | `pending`, `approved`, `rejected`, `cancelled` |

## 4. Connection Configuration

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | Full PostgreSQL connection string | Yes — validated at startup |

The connection string format: `postgresql://user:password@host:port/dbname?schema=public`

In Docker Compose the value is:
`postgresql://erp_user:erp_password@db:5432/erp_db?schema=public`

> **Security Note:** The docker-compose.yml contains a hardcoded `JWT_SECRET` placeholder. This must be changed in any production deployment.

## 5. Migration Strategy

- Single Prisma migration `202608310001_init` creates the entire schema from scratch.
- No incremental migrations exist — the schema was bootstrapped in one pass.
- `migration_lock.toml` confirms the PostgreSQL provider.
- **Implication:** Any future schema changes require a new Prisma migration.
