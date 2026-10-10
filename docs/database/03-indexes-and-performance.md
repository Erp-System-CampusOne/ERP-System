# Database Indexes & Query Performance

> **Verification Status:** All indexes verified from `backend/prisma/migrations/202608310001_init/migration.sql`.

## Complete Index Inventory

| Table | Index Name | Columns | Type | Purpose |
|---|---|---|---|---|
| User | User_email_key | email | UNIQUE | Login lookup |
| User | User_role_idx | role | BTree | Filter by role |
| Department | Department_code_key | code | UNIQUE | Code lookup |
| Department | Department_name_key | name | UNIQUE | Name lookup |
| Department | Department_headOfDepartmentId_key | headOfDepartmentId | UNIQUE | HOD lookup |
| Student | Student_userId_key | userId | UNIQUE | User-to-Student join |
| Student | Student_rollNumber_key | rollNumber | UNIQUE | Roll number login |
| Student | Student_departmentId_idx | departmentId | BTree | Filter by department |
| Student | Student_feeStatus_idx | feeStatus | BTree | Fee defaulter queries |
| Student | Student_semester_idx | semester | BTree | Filter by semester |
| Student | Student_batch_idx | batch | BTree | Filter by batch |
| Student | Student_departmentId_semester_section_idx | (departmentId, semester, section) | BTree | Timetable/attendance queries |
| Faculty | Faculty_userId_key | userId | UNIQUE | User-to-Faculty join |
| Faculty | Faculty_employeeCode_key | employeeCode | UNIQUE | Employee code login |
| Faculty | Faculty_departmentId_idx | departmentId | BTree | Filter by department |
| Faculty | Faculty_designation_idx | designation | BTree | Filter by designation |
| Course | Course_code_key | code | UNIQUE | Course code lookup |
| Course | Course_departmentId_idx | departmentId | BTree | Filter by department |
| Course | Course_departmentId_semester_idx | (departmentId, semester) | BTree | Timetable queries |
| Course | Course_semester_idx | semester | BTree | Filter by semester |
| AttendanceRecord | AttendanceRecord_studentId_idx | studentId | BTree | Student attendance lookup |
| AttendanceRecord | AttendanceRecord_courseId_idx | courseId | BTree | Course attendance lookup |
| AttendanceRecord | AttendanceRecord_date_idx | date | BTree | Date-range queries |
| AttendanceRecord | AttendanceRecord_studentId_courseId_idx | (studentId, courseId) | BTree | Student-course attendance |
| AttendanceRecord | AttendanceRecord_studentId_courseId_date_period_key | (studentId, courseId, date, period) | UNIQUE | Duplicate prevention |
| TimetableEntry | TimetableEntry_facultyId_idx | facultyId | BTree | Faculty timetable |
| TimetableEntry | TimetableEntry_courseId_idx | courseId | BTree | Course timetable |
| TimetableEntry | TimetableEntry_departmentId_section_semester_idx | (departmentId, section, semester) | BTree | Section timetable |
| TimetableEntry | TimetableEntry_dayOfWeek_period_facultyId_key | (dayOfWeek, period, facultyId) | UNIQUE | Faculty conflict guard |
| TimetableEntry | TimetableEntry_dayOfWeek_period_roomNumber_key | (dayOfWeek, period, roomNumber) | UNIQUE | Room conflict guard |
| TimetableEntry | TimetableEntry_dayOfWeek_period_section_semester_department_key | (dayOfWeek, period, section, semester, departmentId) | UNIQUE | Section conflict guard |
| Examination | Examination_semester_idx | semester | BTree | Filter by semester |
| Examination | Examination_status_idx | status | BTree | Filter by status |
| ExamResult | ExamResult_studentId_idx | studentId | BTree | Student results lookup |
| ExamResult | ExamResult_courseId_idx | courseId | BTree | Course results lookup |
| ExamResult | ExamResult_examinationId_idx | examinationId | BTree | Exam results lookup |
| ExamResult | ExamResult_studentId_courseId_examinationId_key | (studentId, courseId, examinationId) | UNIQUE | Duplicate prevention |
| FeeStructure | FeeStructure_program_idx | program | BTree | Program lookup |
| FeeStructure | FeeStructure_program_quota_key | (program, quota) | UNIQUE | Structure lookup |
| FeeTransaction | FeeTransaction_receiptNumber_key | receiptNumber | UNIQUE | Receipt lookup |
| FeeTransaction | FeeTransaction_studentId_idx | studentId | BTree | Student fee history |
| FeeTransaction | FeeTransaction_status_idx | status | BTree | Filter by status |
| FeeTransaction | FeeTransaction_paidAt_idx | paidAt | BTree | Date-range financial reports |
| Book | Book_isbn_key | isbn | UNIQUE | ISBN lookup |
| Book | Book_category_idx | category | BTree | Browse by category |
| Book | Book_author_idx | author | BTree | Search by author |
| CirculationRecord | CirculationRecord_borrowerId_idx | borrowerId | BTree | User borrow history |
| CirculationRecord | CirculationRecord_bookId_idx | bookId | BTree | Book borrow history |
| CirculationRecord | CirculationRecord_status_idx | status | BTree | Filter overdue |
| CirculationRecord | CirculationRecord_dueDate_idx | dueDate | BTree | Find overdue books |
| CirculationRecord | CirculationRecord_borrowerId_status_idx | (borrowerId, status) | BTree | Active borrows per user |
| FineRecord | FineRecord_userId_idx | userId | BTree | User fine history |
| FineRecord | FineRecord_status_idx | status | BTree | Filter unpaid fines |
| FineRecord | FineRecord_circulationId_idx | circulationId | BTree | Link to circulation |
| Notice | Notice_targetRole_idx | targetRole | BTree | Role-filtered notices |
| Notice | Notice_publishedAt_idx | publishedAt | BTree | Sort by date |
| Notice | Notice_isUrgent_idx | isUrgent | BTree | Filter urgent |
| Notice | Notice_department_idx | department | BTree | Department notices |
| LeaveRequest | LeaveRequest_facultyId_idx | facultyId | BTree | Faculty leave history |
| LeaveRequest | LeaveRequest_status_idx | status | BTree | Pending approvals |
| LeaveRequest | LeaveRequest_fromDate_toDate_idx | (fromDate, toDate) | BTree | Date-range queries |
| DocumentRequest | DocumentRequest_studentId_idx | studentId | BTree | Student document history |
| DocumentRequest | DocumentRequest_status_idx | status | BTree | Pending requests |
| AdmissionApplication | AdmissionApplication_applicationId_key | applicationId | UNIQUE | Application lookup |
| AdmissionApplication | AdmissionApplication_status_idx | status | BTree | Filter by status |
| AdmissionApplication | AdmissionApplication_department_idx | department | BTree | Filter by department |
| AdmissionApplication | AdmissionApplication_program_idx | program | BTree | Filter by program |
| PlacementRecord | PlacementRecord_studentId_idx | studentId | BTree | Student placement |
| PlacementRecord | PlacementRecord_companyName_idx | companyName | BTree | Company search |
| Permission | Permission_name_key | name | UNIQUE | Permission lookup |
| Permission | Permission_category_idx | category | BTree | Group permissions |
| RolePermission | RolePermission_role_idx | role | BTree | Role permission list |
| RolePermission | RolePermission_role_permissionId_key | (role, permissionId) | UNIQUE | Duplicate prevention |
| SystemActivity | SystemActivity_timestamp_idx | timestamp | BTree | Recent activity sort |
| ExpenseRecord | ExpenseRecord_category_idx | category | BTree | Category filter |
| ExpenseRecord | ExpenseRecord_date_idx | date | BTree | Date-range reports |
| ResearchGrant | ResearchGrant_awardedDate_idx | awardedDate | BTree | Date-range queries |

**Total indexes: 72** (including 20 unique constraints that create implicit unique indexes)

---

## High-Frequency Query Patterns

Based on controller code analysis, the most common query patterns are:

| Query | Tables Hit | Indexes Used |
|---|---|---|
| Student login by email | User | User_email_key |
| Student login by roll number | User, Student | Student_rollNumber_key |
| Faculty login by employee code | User, Faculty | Faculty_employeeCode_key |
| Get student by ID | Student, User, Department | Primary key (PK) |
| Get attendance for student + course | AttendanceRecord | AttendanceRecord_studentId_courseId_idx |
| Get student fee transactions | FeeTransaction | FeeTransaction_studentId_idx |
| Get timetable by department/semester/section | TimetableEntry | TimetableEntry_departmentId_section_semester_idx |
| Get pending leave requests | LeaveRequest | LeaveRequest_status_idx |
| Get notices by role | Notice | Notice_targetRole_idx + Notice_publishedAt_idx |
| Get fee defaulters | Student, FeeTransaction, FeeStructure | FeeTransaction_studentId_idx, FeeStructure_program_idx |
| Get exam results for student | ExamResult | ExamResult_studentId_idx |
| Get available books | Book | (full scan with filter — no availableCopies index) |
| Get overdue circulation records | CirculationRecord | CirculationRecord_dueDate_idx + CirculationRecord_status_idx |

---

## Missing Indexes

| Table | Column | Use Case | Impact |
|---|---|---|---|
| Book | availableCopies | Filter available books for issue | Medium — table scan on large catalogues |
| Student | cgpa | Sort/filter by CGPA for analytics | Low |
| ExamResult | totalScore | Analytics performance distribution | Low |
| FeeTransaction | paidAt + studentId | Combined filter on date + student | Low |
