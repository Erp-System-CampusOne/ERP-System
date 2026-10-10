# Complete Database Schema — Column Reference

> **Source of Truth:** `backend/prisma/schema.prisma` and `backend/prisma/migrations/202608310001_init/migration.sql`
> This document is a data dictionary covering every table and column.

## Notation
- **PK** = Primary Key | **FK** = Foreign Key | **UK** = Unique Key | **Idx** = Indexed

---

## Table: User

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | Surrogate primary key |
| email | TEXT | No | | UK | Login identifier (case-sensitive) |
| name | TEXT | No | | | Display name |
| password | TEXT | No | | | bcrypt hash (salt rounds: 10) |
| role | Role (enum) | No | `student` | Idx | One of 7 system roles |
| phone | TEXT | Yes | | | Contact phone number |
| avatarUrl | TEXT | Yes | | | Profile image URL |
| createdAt | TIMESTAMP(3) | No | `now()` | | Auto-set on creation |
| updatedAt | TIMESTAMP(3) | No | managed | | Auto-updated by Prisma |

---

## Table: Department

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | Surrogate primary key |
| code | TEXT | No | | UK | Short code e.g. "CS", "ECE" |
| name | TEXT | No | | UK | Full name e.g. "Computer Science" |
| headOfDepartmentId | TEXT | Yes | | UK, FK?Faculty | At most one HOD per department |
| createdAt | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

**Note:** `headOfDepartmentId` has a unique constraint — one department has one HOD, and one faculty can only be HOD of one department.

---

## Table: Student

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | Surrogate primary key |
| userId | TEXT | No | | UK, FK?User (CASCADE) | 1:1 link to User |
| rollNumber | TEXT | No | | UK | Unique roll number |
| departmentId | TEXT | No | | FK?Department (RESTRICT), Idx | Department membership |
| degree | TEXT | Yes | | | Programme e.g. "B.Tech", "M.Tech" |
| semester | INTEGER | No | 1 | Idx | Current semester (1–8) |
| batch | TEXT | Yes | | Idx | Admission year e.g. "2022-26" |
| section | TEXT | Yes | | | Class section e.g. "A", "B" |
| cgpa | DOUBLE PRECISION | Yes | 0.0 | | Denormalised cumulative GPA |
| attendancePercentage | DOUBLE PRECISION | Yes | 0.0 | | Denormalised overall attendance % |
| feeStatus | FeeStatus (enum) | No | `due` | Idx | Synced by feeController |
| feeQuota | FeeQuota (enum) | No | `general` | | Determines fee structure |
| createdAt | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

**Composite Index:** `(departmentId, semester, section)` — used by timetable and attendance queries.

---

## Table: Faculty

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| userId | TEXT | No | | UK, FK?User (CASCADE) | 1:1 link to User |
| employeeCode | TEXT | No | | UK | e.g. "FAC2024123" |
| departmentId | TEXT | No | | FK?Department (RESTRICT), Idx | Department membership |
| designation | TEXT | No | | Idx | e.g. "Professor", "Assistant Professor" |
| qualification | TEXT | Yes | | | e.g. "Ph.D", "M.Tech" |
| weeklyWorkloadHours | DOUBLE PRECISION | Yes | 0 | | Teaching hours/week |
| leaveBalance | DOUBLE PRECISION | Yes | 0 | | Available leave days |
| createdAt | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

---

## Table: Course

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| code | TEXT | No | | UK | e.g. "CS101" |
| name | TEXT | No | | | e.g. "Data Structures" |
| departmentId | TEXT | No | | FK?Department (RESTRICT), Idx | Offering department |
| semester | INTEGER | No | | Idx | Target semester |
| credits | INTEGER | No | | | Credit hours |
| type | CourseType (enum) | No | `theory` | | theory/lab/elective/project |
| description | TEXT | Yes | | | Course description |
| faculty_instructor | TEXT | Yes | | FK?Faculty (SET NULL) | DB column name; Prisma field: `facultyId` |
| createdAt | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

**Composite Index:** `(departmentId, semester)`

---

## Table: AttendanceRecord

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| studentId | TEXT | No | | FK?Student (CASCADE), Idx | Student taking class |
| courseId | TEXT | No | | FK?Course (CASCADE), Idx | Course class belongs to |
| date | TIMESTAMP(3) | No | | Idx | Class date |
| period | INTEGER | No | | | Period slot number |
| status | AttendanceStatus (enum) | No | | | `present` or `absent` |
| createdAt | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

**Composite Unique:** `(studentId, courseId, date, period)` — no duplicate entries.
**Composite Index:** `(studentId, courseId)`

---

## Table: TimetableEntry

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| dayOfWeek | DayOfWeek (enum) | No | | | Monday–Saturday |
| period | INTEGER | No | | | Period number |
| timeSlot | TEXT | No | | | e.g. "09:00-10:00" |
| courseId | TEXT | No | | FK?Course (CASCADE), Idx | Subject being taught |
| facultyId | TEXT | No | | FK?Faculty (CASCADE), Idx | Teaching faculty |
| roomNumber | TEXT | No | | | Room/lab identifier |
| section | TEXT | No | | | Class section |
| semester | INTEGER | No | | | Semester |
| departmentId | TEXT | No | | FK?Department (CASCADE), Idx | Department (denormalised) |
| createdAt | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

**Three Composite Unique Constraints** (scheduling conflict guards):
1. `(dayOfWeek, period, facultyId)` — no faculty double-booking
2. `(dayOfWeek, period, roomNumber)` — no room double-booking
3. `(dayOfWeek, period, section, semester, departmentId)` — no section double-booking

---

## Table: Examination

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| title | TEXT | No | | | e.g. "End Semester Exam — Nov 2026" |
| academicYear | TEXT | Yes | | | e.g. "2026-27" |
| semester | INTEGER | No | | Idx | Target semester |
| startDate | TIMESTAMP(3) | No | | | Exam period start |
| endDate | TIMESTAMP(3) | No | | | Exam period end |
| status | ExamStatus (enum) | No | `upcoming` | Idx | upcoming/ongoing/completed/evaluated |
| hallTicketReleased | BOOLEAN | No | false | | Hall ticket published flag |
| createdAt | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

---

## Table: ExamResult

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| studentId | TEXT | No | | FK?Student (CASCADE), Idx | |
| courseId | TEXT | No | | FK?Course (CASCADE), Idx | |
| examinationId | TEXT | Yes | | FK?Examination (SET NULL), Idx | Optional exam link |
| internalScore | DOUBLE PRECISION | Yes | | | Internal/continuous assessment |
| endSemScore | DOUBLE PRECISION | Yes | | | End-semester exam score |
| totalScore | DOUBLE PRECISION | No | | | Sum / computed total |
| grade | TEXT | No | | | Letter grade e.g. "A", "B+" |
| createdAt | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

**Composite Unique:** `(studentId, courseId, examinationId)`

---

## Table: FeeStructure

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| program | TEXT | No | | Idx | e.g. "B.Tech", "M.Tech" |
| quota | FeeQuota (enum) | No | `general` | | general/merit/management/nri |
| tuitionFee | DOUBLE PRECISION | No | 0 | | Tuition component |
| hostelFee | DOUBLE PRECISION | No | 0 | | Hostel component |
| examFee | DOUBLE PRECISION | No | 0 | | Examination fee |
| libraryDeposit | DOUBLE PRECISION | No | 0 | | Library security deposit |
| totalAmount | DOUBLE PRECISION | No | | | Sum of all components |
| dueDate | TIMESTAMP(3) | No | | | Payment deadline |
| createdAt | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

**Composite Unique:** `(program, quota)` — one structure per programme per quota.

---

## Table: FeeTransaction

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| receiptNumber | TEXT | No | | UK | e.g. "RCPT-1728550000000-ABC12345" |
| studentId | TEXT | No | | FK?Student (CASCADE), Idx | Paying student |
| amount | DOUBLE PRECISION | No | | | Payment amount |
| paymentMethod | PaymentMethod (enum) | Yes | | | UPI/NetBanking/CreditCard/etc. |
| status | TransactionStatus (enum) | No | `pending` | Idx | success/pending/failed/refunded |
| paidAt | TIMESTAMP(3) | Yes | | Idx | Set when status=success |
| createdAt | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

**Note:** Student-submitted payments start as `pending`; finance_officer-submitted start as `success`.

---

## Table: Book

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| isbn | TEXT | No | | UK | ISBN-10 or ISBN-13 |
| title | TEXT | No | | | Book title |
| author | TEXT | No | | Idx | Author name |
| publisher | TEXT | Yes | | | Publisher |
| category | TEXT | Yes | | Idx | Subject category |
| rackLocation | TEXT | Yes | | | e.g. "A-12" |
| totalCopies | INTEGER | No | 1 | | Total copies in library |
| availableCopies | INTEGER | No | 1 | | Available for issue |
| coverImageUrl | TEXT | Yes | | | Cover image URL |
| createdAt | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

---

## Table: CirculationRecord

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| bookId | TEXT | No | | FK?Book (RESTRICT), Idx | Book borrowed |
| borrowerId | TEXT | No | | FK?User (RESTRICT), Idx | Who borrowed it |
| issueDate | TIMESTAMP(3) | No | | | Date book was issued |
| dueDate | TIMESTAMP(3) | No | | Idx | Return deadline |
| returnDate | TIMESTAMP(3) | Yes | | | Actual return date |
| fineAmount | DOUBLE PRECISION | Yes | 0 | | Overdue fine accrued |
| status | CirculationStatus (enum) | No | `issued` | Idx | issued/returned/overdue |
| createdAt | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

**Composite Index:** `(borrowerId, status)` — find active borrows per user efficiently.

---

## Table: FineRecord

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| userId | TEXT | No | | FK?User (CASCADE), Idx | User fined |
| circulationId | TEXT | Yes | | FK?CirculationRecord (SET NULL), Idx | Source borrow (nullable) |
| amount | DOUBLE PRECISION | No | | | Fine amount |
| reason | TEXT | Yes | | | Description of fine reason |
| status | FineStatus (enum) | No | `unpaid` | Idx | unpaid/paid/waived |
| issuedAt | TIMESTAMP(3) | No | `now()` | | When fine was generated |
| createdAt | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

---

## Table: Notice

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| title | TEXT | No | | | Notice headline |
| content | TEXT | No | | | Full notice body |
| category | NoticeCategory (enum) | No | `general` | | academic/examination/events/fee/general |
| targetRole | NoticeTargetRole (enum) | No | `all` | Idx | Who sees this notice |
| department | TEXT | Yes | | Idx | Optional department filter |
| publishedBy | TEXT | Yes | | FK?User (SET NULL) | Publisher user ID |
| publishedAt | TIMESTAMP(3) | No | `now()` | Idx | Publication timestamp |
| isUrgent | BOOLEAN | No | false | Idx | Urgent notice flag |
| isPinned | BOOLEAN | No | false | | Pinned to top flag (schema only — not in migration) |
| createdAt | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

---

## Table: LeaveRequest

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| facultyId | TEXT | No | | FK?Faculty (CASCADE), Idx | Requesting faculty |
| type | TEXT | No | | | Leave type (no enum — raw text) |
| fromDate | TIMESTAMP(3) | No | | | Start of leave |
| toDate | TIMESTAMP(3) | No | | | End of leave |
| days | INTEGER | No | | | Number of days requested |
| reason | TEXT | No | | | Leave justification |
| status | LeaveStatus (enum) | No | `pending` | Idx | pending/approved/rejected/cancelled |
| createdAt | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

**Composite Index:** `(fromDate, toDate)`

---

## Table: DocumentRequest

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| studentId | TEXT | No | | FK?Student (CASCADE), Idx | Requesting student |
| documentName | TEXT | No | | | Document type requested |
| status | DocumentStatus (enum) | No | `pending` | Idx | pending/processing/completed/rejected |
| requestedAt | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

---

## Table: AdmissionApplication

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| applicantName | TEXT | No | | | Full name |
| applicationId | TEXT | No | | UK | Unique ref e.g. "APP-2026-00001" |
| program | TEXT | No | | Idx | e.g. "B.Tech" |
| department | TEXT | No | | Idx | e.g. "Computer Science" |
| jeeRank | INTEGER | Yes | | | JEE main/advanced rank |
| gateRank | INTEGER | Yes | | | GATE score rank |
| category | TEXT | No | | | General/OBC/SC/ST |
| quota | TEXT | No | | | Management/merit/etc. |
| status | ApplicationStatus (enum) | No | `pending` | Idx | pending/approved/rejected/waitlisted |
| appliedDate | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

**Note:** No FK to User or Student — standalone table.

---

## Table: PlacementRecord

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| studentId | TEXT | No | | FK?Student (CASCADE), Idx | Placed student |
| companyName | TEXT | No | | Idx | Hiring company |
| companyType | TEXT | No | | | Sector e.g. "IT", "Core", "Startup" |
| ctc | DOUBLE PRECISION | No | | | CTC in lakhs per annum |
| offerDate | TIMESTAMP(3) | No | | | Offer letter date |
| createdAt | TIMESTAMP(3) | No | `now()` | | |
| updatedAt | TIMESTAMP(3) | No | managed | | |

---

## Table: Permission

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| name | TEXT | No | | UK | e.g. "manage_students" |
| category | TEXT | No | | Idx | e.g. "academic", "finance" |
| description | TEXT | No | | | Human-readable description |

---

## Table: RolePermission

| Column | PG Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK | |
| role | Role (enum) | No | | Idx | System role |
| permissionId | TEXT | No | | FK?Permission (CASCADE) | Permission granted |

**Composite Unique:** `(role, permissionId)`

---

## Table: SystemActivity ?? SCHEMA DRIFT

> **Warning:** This table is in `schema.prisma` but **NOT in `migration.sql`**. May have been created via `prisma db push` or a manual migration.

| Column | PG Type | Nullable | Default | Description |
|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK |
| action | TEXT | No | | Action identifier e.g. "student.created" |
| description | TEXT | No | | Human description |
| type | TEXT | No | `info` | Severity: success/warning/info/destructive |
| timestamp | TIMESTAMP(3) | No | `now()` | Event time (Indexed) |

---

## Table: ExpenseRecord ?? SCHEMA DRIFT

> **Warning:** This table is in `schema.prisma` but **NOT in `migration.sql`**.

| Column | PG Type | Nullable | Default | Description |
|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK |
| departmentId | TEXT | Yes | | FK?Department (SET NULL) |
| category | TEXT | No | | Expense category (Indexed) |
| amount | DOUBLE PRECISION | No | | Expense amount |
| date | TIMESTAMP(3) | No | `now()` | Expense date (Indexed) |
| createdAt | TIMESTAMP(3) | No | `now()` | |

---

## Table: ResearchGrant ?? SCHEMA DRIFT

> **Warning:** This table is in `schema.prisma` but **NOT in `migration.sql`**.

| Column | PG Type | Nullable | Default | Description |
|---|---|---|---|---|
| id | TEXT | No | `cuid()` | PK |
| title | TEXT | No | | Grant title |
| agency | TEXT | No | | Funding agency name |
| amount | DOUBLE PRECISION | No | | Grant amount |
| status | TEXT | No | `active` | Status (raw TEXT — no enum) |
| awardedDate | TIMESTAMP(3) | No | | Award date (Indexed) |
| createdAt | TIMESTAMP(3) | No | `now()` | |
