# Database Relationships and Constraints

> All relationships verified from `backend/prisma/schema.prisma` and `backend/prisma/migrations/202608310001_init/migration.sql`.

## Complete Foreign Key Inventory

| Source Table | Source Column | Target Table | Target Column | Cardinality | On Delete | On Update | Enforcement |
|---|---|---|---|---|---|---|---|
| Department | headOfDepartmentId | Faculty | id | 0..1 : 1 | SET NULL | CASCADE | DB + ORM |
| Student | userId | User | id | 1 : 1 | CASCADE | CASCADE | DB + ORM |
| Student | departmentId | Department | id | N : 1 | RESTRICT | CASCADE | DB + ORM |
| Faculty | userId | User | id | 1 : 1 | CASCADE | CASCADE | DB + ORM |
| Faculty | departmentId | Department | id | N : 1 | RESTRICT | CASCADE | DB + ORM |
| Course | departmentId | Department | id | N : 1 | RESTRICT | CASCADE | DB + ORM |
| Course | faculty_instructor | Faculty | id | N : 0..1 | SET NULL | CASCADE | DB + ORM |
| AttendanceRecord | studentId | Student | id | N : 1 | CASCADE | CASCADE | DB + ORM |
| AttendanceRecord | courseId | Course | id | N : 1 | CASCADE | CASCADE | DB + ORM |
| TimetableEntry | courseId | Course | id | N : 1 | CASCADE | CASCADE | DB + ORM |
| TimetableEntry | facultyId | Faculty | id | N : 1 | CASCADE | CASCADE | DB + ORM |
| TimetableEntry | departmentId | Department | id | N : 1 | CASCADE | CASCADE | DB + ORM |
| ExamResult | studentId | Student | id | N : 1 | CASCADE | CASCADE | DB + ORM |
| ExamResult | courseId | Course | id | N : 1 | CASCADE | CASCADE | DB + ORM |
| ExamResult | examinationId | Examination | id | N : 0..1 | SET NULL | CASCADE | DB + ORM |
| FeeTransaction | studentId | Student | id | N : 1 | CASCADE | CASCADE | DB + ORM |
| CirculationRecord | bookId | Book | id | N : 1 | RESTRICT | CASCADE | DB + ORM |
| CirculationRecord | borrowerId | User | id | N : 1 | RESTRICT | CASCADE | DB + ORM |
| FineRecord | userId | User | id | N : 1 | CASCADE | CASCADE | DB + ORM |
| FineRecord | circulationId | CirculationRecord | id | N : 0..1 | SET NULL | CASCADE | DB + ORM |
| Notice | publishedBy | User | id | N : 0..1 | SET NULL | CASCADE | DB + ORM |
| LeaveRequest | facultyId | Faculty | id | N : 1 | CASCADE | CASCADE | DB + ORM |
| DocumentRequest | studentId | Student | id | N : 1 | CASCADE | CASCADE | DB + ORM |
| PlacementRecord | studentId | Student | id | N : 1 | CASCADE | CASCADE | DB + ORM |
| RolePermission | permissionId | Permission | id | N : 1 | CASCADE | CASCADE | DB + ORM |
| ExpenseRecord | departmentId | Department | id | N : 0..1 | SET NULL | CASCADE | DB + ORM |

**Total verified FK relationships: 26**

---

## Unique Constraints

| Table | Constraint | Columns | Business Rule |
|---|---|---|---|
| User | User_email_key | email | No two users share an email |
| Department | Department_code_key | code | No two departments share a code |
| Department | Department_name_key | name | No two departments share a name |
| Department | Department_headOfDepartmentId_key | headOfDepartmentId | One HOD per department AND one department per HOD |
| Student | Student_userId_key | userId | One student profile per user |
| Student | Student_rollNumber_key | rollNumber | Unique roll number |
| Faculty | Faculty_userId_key | userId | One faculty profile per user |
| Faculty | Faculty_employeeCode_key | employeeCode | Unique employee code |
| Course | Course_code_key | code | Unique course code |
| AttendanceRecord | AttendanceRecord_studentId_courseId_date_period_key | studentId, courseId, date, period | No duplicate attendance entry |
| TimetableEntry | TimetableEntry_dayOfWeek_period_facultyId_key | dayOfWeek, period, facultyId | No faculty double-booking |
| TimetableEntry | TimetableEntry_dayOfWeek_period_roomNumber_key | dayOfWeek, period, roomNumber | No room double-booking |
| TimetableEntry | TimetableEntry_dayOfWeek_period_section_semester_department_key | dayOfWeek, period, section, semester, departmentId | No section double-booking |
| ExamResult | ExamResult_studentId_courseId_examinationId_key | studentId, courseId, examinationId | No duplicate exam result |
| FeeStructure | FeeStructure_program_quota_key | program, quota | One structure per program per quota |
| FeeTransaction | FeeTransaction_receiptNumber_key | receiptNumber | Unique receipt number |
| Book | Book_isbn_key | isbn | Unique ISBN |
| AdmissionApplication | AdmissionApplication_applicationId_key | applicationId | Unique application reference |
| Permission | Permission_name_key | name | Unique permission name |
| RolePermission | RolePermission_role_permissionId_key | role, permissionId | One permission assignment per role |

---

## Notable Referential Actions

### CASCADE Delete Chains
Deleting a `User` cascades to:
- `Student` (then cascades to `AttendanceRecord`, `ExamResult`, `FeeTransaction`, `DocumentRequest`, `PlacementRecord`)
- `Faculty` (then cascades to `LeaveRequest`, `TimetableEntry`)
- `FineRecord` (directly)
- `CirculationRecord` records where borrowerId = user ? BLOCKED (RESTRICT)

> **Warning:** Deleting a `User` who has active `CirculationRecord`s will **FAIL** due to RESTRICT on `CirculationRecord.borrowerId`.

### RESTRICT Blocks
| Action | Blocked By |
|---|---|
| Delete Department with students | Student.departmentId RESTRICT |
| Delete Department with faculty | Faculty.departmentId RESTRICT |
| Delete Department with courses | Course.departmentId RESTRICT |
| Delete Book with any borrow history | CirculationRecord.bookId RESTRICT |
| Delete User with active borrows | CirculationRecord.borrowerId RESTRICT |

### SET NULL Cascades
| Column | Behaviour on referenced record deletion |
|---|---|
| Department.headOfDepartmentId | Clears HOD if faculty deleted |
| Course.faculty_instructor | Clears assigned faculty if faculty deleted |
| ExamResult.examinationId | Clears exam link if exam deleted |
| FineRecord.circulationId | Clears source circulation link |
| Notice.publishedBy | Clears publisher if user deleted |
| ExpenseRecord.departmentId | Clears department link |

---

## Circular Reference: Department ? Faculty

The schema has an intentional circular reference:
- `Faculty.departmentId` ? `Department.id`
- `Department.headOfDepartmentId` ? `Faculty.id`

Prisma resolves this with **named relations**:
- `Faculty.department` (relation name: `"DepartmentFaculty"`)
- `Faculty.headOf` (relation name: `"DepartmentHOD"`)
- `Department.faculty` (relation name: `"DepartmentFaculty"`)
- `Department.headOfDepartment` (relation name: `"DepartmentHOD"`)

Both FKs are nullable or have SET NULL actions to allow the circular dependency to be resolved during record creation.

---

## Application-Level Constraints (Not in DB)

These constraints are enforced in controller code only, not by database constraints:

| Constraint | Location | Risk |
|---|---|---|
| Student can only view own fee ledger | `studentController.ts:266-271` | Bypassable if auth middleware is misconfigured |
| Student can only submit payments for own account | `feeController.ts:146-151` | Same risk |
| Fee payment cannot exceed remaining balance | `feeController.ts:158-165` | Race condition possible (no DB-level lock) |
| Leave type validation | Not found — `type` is raw TEXT | No validation enforced |
| ResearchGrant status is raw TEXT | `schema.prisma:661` | No enum constraint |
