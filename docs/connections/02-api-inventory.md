# Complete API Inventory

> **Verification Status:** All endpoints verified from route files and controllers.

## Base URL

All endpoints are served under `/api`. The frontend uses `setApiConfig({ baseUrl: '/api' })`.

---

## 1. Authentication

Base path: `/api/auth`

| Method | Endpoint | Auth Required | Roles | Handler | Description |
|---|---|---|---|---|---|
| POST | /auth/login | No | - | `loginUser` | Authenticate user, return JWT + profile |
| POST | /auth/logout | Yes (JWT) | all | `logoutUser` | Server-side logout (stateless — client drops token) |
| GET | /auth/me | Yes (JWT) | all | `getCurrentUser` | Get current authenticated user profile |

### POST /auth/login — Details
- **Input:** `{ identifier, password, role? }`
- `identifier` can be: email, student roll number, or faculty employee code
- **Output:** `{ token, user: { id, name, email, role, avatarUrl, phone, studentProfile?, facultyProfile? } }`
- Token expires in `1d`

---

## 2. Students

Base path: `/api/students` — All routes require `authenticateJWT`

| Method | Endpoint | Roles | Handler | Description |
|---|---|---|---|---|
| GET | /students | admin, faculty, student | `getStudents` | List students with filters |
| POST | /students | admin | `createStudent` | Create new student + user |
| GET | /students/:id | admin, faculty, student | `getStudentById` | Get student by ID |
| PUT | /students/:id | admin, student | `updateStudent` | Update student profile |
| GET | /students/:id/attendance | admin, faculty, student | `getStudentAttendance` | Get attendance summary |
| GET | /students/:id/grades | admin, faculty, student | `getStudentGrades` | Get exam results |
| GET | /students/:id/fees | admin, finance_officer, student | `getStudentFees` | Get fee ledger |
| GET | /students/:id/documents | admin, faculty, student | `getStudentDocuments` | Get document requests |
| DELETE | /students/:id | admin | `deleteStudent` | Delete student + cascade |

**Query params for GET /students:** `department`, `semester`, `batch`, `search`

**Resource ownership:** Students calling `GET /students/:id/fees` are restricted to their own profile (verified: `studentController.ts:266-271`).

---

## 3. Faculty

Base path: `/api/faculty` — All routes require `authenticateJWT`

| Method | Endpoint | Roles | Handler | Description |
|---|---|---|---|---|
| GET | /faculty | admin, student, faculty | `getFacultyList` | List faculty with filters |
| POST | /faculty | admin | `createFaculty` | Create new faculty + user |
| GET | /faculty/:id | admin, faculty, student | `getFacultyById` | Get faculty by ID |
| PUT | /faculty/:id | admin, faculty | `updateFaculty` | Update faculty profile |
| GET | /faculty/:id/workload | admin, faculty | `getFacultyWorkload` | Get teaching workload |
| GET | /faculty/:id/leaves | admin, faculty | `getLeaveRequests` | Get leave requests |
| DELETE | /faculty/:id | admin | `deleteFaculty` | Delete faculty + cascade |

**Query params for GET /faculty:** `department`, `designation`

---

## 4. Departments

Base path: `/api/departments` — All routes require `authenticateJWT`

| Method | Endpoint | Roles | Handler | Description |
|---|---|---|---|---|
| GET | /departments | admin, faculty, student | `getDepartments` | List all departments |
| POST | /departments | admin | `createDepartment` | Create department |
| PUT | /departments/:id | admin | `updateDepartment` | Update department |
| DELETE | /departments/:id | admin | `deleteDepartment` | Delete department |

---

## 5. Courses

Base path: `/api/courses` — All routes require `authenticateJWT`

| Method | Endpoint | Roles | Handler | Description |
|---|---|---|---|---|
| GET | /courses | admin, faculty, student | `getCourses` | List courses |
| POST | /courses | admin | `createCourse` | Create course |
| GET | /courses/:id | admin, faculty, student | `getCourseById` | Get course by ID |
| PUT | /courses/:id | admin | `updateCourse` | Update course |
| DELETE | /courses/:id | admin | `deleteCourse` | Delete course |

**Query params for GET /courses:** `department`, `semester`

---

## 6. Attendance

Base path: `/api/attendance` — All routes require `authenticateJWT`

| Method | Endpoint | Roles | Handler | Description |
|---|---|---|---|---|
| POST | /attendance/mark | faculty, admin | `markAttendance` | Mark attendance records |
| GET | /attendance/report | admin, hod, management | `getAttendanceReport` | Get attendance report |

**Query params for GET /attendance/report:** `department`, `semester`, `date`

---

## 7. Timetable

Base path: `/api/academics/timetable` — All routes require `authenticateJWT`

| Method | Endpoint | Roles | Handler | Description |
|---|---|---|---|---|
| GET | /academics/timetable | admin, faculty, student | `getTimetables` | Get timetable entries |
| GET | /academics/timetable/export | admin, hod, faculty | `exportTimetable` | Export timetable |
| POST | /academics/timetable/generate | admin, hod | `generateTimetable` | Generate timetable |
| POST | /academics/timetable/save | admin, hod | `saveTimetable` | Save timetable entries |

**Query params for GET /academics/timetable:** `department`, `semester`, `section`, `facultyId`

---

## 8. Examinations

Base path: `/api/examinations` — All routes require `authenticateJWT`

| Method | Endpoint | Roles | Handler | Description |
|---|---|---|---|---|
| GET | /examinations | admin, faculty, student | `getExaminations` | List examinations |
| POST | /examinations | admin | `createExamination` | Create examination |
| PUT | /examinations/:id | admin | `updateExamination` | Update examination |
| DELETE | /examinations/:id | admin | `deleteExamination` | Delete examination |
| POST | /examinations/:id/hall-tickets | admin | `releaseHallTickets` | Release hall tickets |
| GET | /examinations/:id/results | admin, faculty, student | `getExamResults` | Get results for exam |
| POST | /examinations/:id/results | faculty, admin | `submitExamResults` | Submit student results |
| GET | /examinations/export | admin, management | `exportExaminations` | Export exam data |
| GET | /examinations/:id/stats | admin, management, faculty | `getExamStats` | Get exam statistics |
| GET | /examinations/:id/download-results | admin, management, faculty | `downloadExamResults` | Download results |
| POST | /examinations/:id/remind | admin, management | `remindFaculty` | Send faculty reminder |

**Query params for GET /examinations:** `semester`, `status`

---

## 9. Finance / Fees

Base path: `/api/fees` — All routes require `authenticateJWT`

| Method | Endpoint | Roles | Handler | Description |
|---|---|---|---|---|
| GET | /fees/structures | admin, finance_officer, management | `getFeeStructures` | List fee structures |
| POST | /fees/structures | admin, finance_officer | `createFeeStructure` | Create/update fee structure (upsert) |
| GET | /fees/transactions | admin, finance_officer, management, student | `getFeeTransactions` | List fee transactions |
| POST | /fees/transactions | admin, finance_officer, student | `recordFeePayment` | Record new payment |
| PATCH | /fees/transactions/:id/status | admin, finance_officer | `updateFeeTransactionStatus` | Approve/reject payment |
| GET | /fees/defaulters | admin, finance_officer, management | `getFeeDefaulters` | Get fee defaulters |

**Query params for GET /fees/transactions:** `studentId`, `status`
**Query params for GET /fees/defaulters:** `department`, `semester`

---

## 10. Library

Base path: `/api/library` — All routes require `authenticateJWT`

| Method | Endpoint | Roles | Handler | Description |
|---|---|---|---|---|
| GET | /library/books | all roles | `getLibraryBooks` | List books |
| POST | /library/books | librarian, admin | `createLibraryBook` | Add book to catalogue |
| GET | /library/circulation | all roles | `getCirculationRecords` | List circulation records |
| POST | /library/circulation/issue | librarian, admin | `issueLibraryBook` | Issue a book |
| POST | /library/circulation/return | librarian, admin | `returnLibraryBook` | Return a book |
| GET | /library/fines | all roles | `getLibraryFines` | List fines |
| POST | /library/fines/:id/pay | all roles | `payLibraryFine` | Pay a fine |

**Query params for GET /library/books:** `search`, `category`, `availableOnly`
**Query params for GET /library/fines:** `userId`

---

## 11. Notices

Base path: `/api/notices` — All routes require `authenticateJWT`

| Method | Endpoint | Roles | Handler | Description |
|---|---|---|---|---|
| GET | /notices | all roles | `getNotices` | Get notices |
| POST | /notices | admin, faculty, hod, management | `createNotice` | Create notice |
| PUT | /notices/:id | admin, faculty, hod, management | `updateNotice` | Update notice |
| PATCH | /notices/:id/pin | admin, management | `togglePinNotice` | Toggle pin status |
| DELETE | /notices/:id | admin, faculty, hod, management | `deleteNotice` | Delete notice |

**Query params for GET /notices:** `targetRole`, `department`

---

## 12. Analytics

Base path: `/api/analytics` — All routes require `authenticateJWT`

| Method | Endpoint | Roles | Handler | Description |
|---|---|---|---|---|
| GET | /analytics/overview | admin, management, hod | `getInstitutionalOverview` | KPI dashboard data |
| GET | /analytics/admissions | admin, management | `getAdmissionsAnalytics` | Admissions analytics |
| GET | /analytics/admissions/report | admin, management | `exportAdmissionsReport` | CSV export |
| GET | /analytics/academic-performance | admin, management, hod | `getAcademicPerformanceAnalytics` | Academic performance |
| GET | /analytics/placements | admin, management | `getPlacementAnalytics` | Placement statistics |
| GET | /analytics/activity | admin, management | `getSystemActivity` | Recent system activity log |
| GET | /analytics/financial-health | admin, management | `getFinancialHealthAnalytics` | Financial health report |

---

## 13. Admin

Base path: `/api/admin` — All routes require `authenticateJWT`

| Method | Endpoint | Roles | Handler | Description |
|---|---|---|---|---|
| GET | /admin/admissions | admin, management | `getAdmissions` | List admission applications |
| PUT | /admin/admissions/:id | admin, management | `updateAdmissionStatus` | Update application status |
| GET | /admin/roles | admin, management | `getRolePermissions` | Get role-permission mapping |
| PUT | /admin/roles/:role/permissions | admin, management | `updateRolePermissions` | Update permissions for role |
| POST | /admin/users | admin | `createAdminUser` | Create admin/management user |

---

## 14. Health Check (No Auth)

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/health | Returns `{status:"ok"}` if DB is reachable |

---

## Total Endpoint Count: 57 endpoints across 13 route groups
