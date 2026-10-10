# Frontend-to-Backend Connection Map

> All connections verified from `frontend/src/api/apiCall.ts`, `frontend/src/api/customApi.ts`, route files, and controllers.

## API Client Architecture

```
Frontend Page Component
        |
   (calls hook or direct import)
        |
  apiCall.ts (auto-generated) --or-- customApi.ts (handwritten)
        |
  request() function (centralised fetch wrapper)
        |
  fetch(baseUrl + path, {method, headers:{Authorization: Bearer...}})
        |
  /api/* (Nginx proxy or Vercel rewrite)
        |
  Express Router
        |
  authenticateJWT + authorizeRoles
        |
  Controller function
        |
  Prisma ORM ? PostgreSQL
```

---

## Feature ? API ? Backend Connection Matrix

### Authentication Features

| Feature | Page | API Function | HTTP | Backend Route | Controller | DB Tables |
|---|---|---|---|---|---|---|
| Login | Login.tsx | `loginUser()` | POST /auth/login | authRoutes | loginUser | User, Student, Faculty |
| Logout | (AuthContext) | `logoutUser()` | POST /auth/logout | authRoutes | logoutUser | - |
| Get current user | (AuthContext) | `getCurrentUser()` | GET /auth/me | authRoutes | getCurrentUser | User, Student, Faculty |

### Student Features

| Feature | Page | API Function | HTTP | Backend Route | Controller | DB Tables |
|---|---|---|---|---|---|---|
| List students | AdminStudents.tsx | `getStudents()` | GET /students | studentRoutes | getStudents | Student, User, Department |
| Create student | AdminStudents.tsx | `createStudent()` | POST /students | studentRoutes | createStudent | User, Student |
| Get student | Student.tsx | `getStudentById()` | GET /students/:id | studentRoutes | getStudentById | Student, User, Department |
| Update student | Student.tsx | `updateStudent()` | PUT /students/:id | studentRoutes | updateStudent | Student, User |
| View attendance | StudentAttendance.tsx | `getStudentAttendance()` | GET /students/:id/attendance | studentRoutes | getStudentAttendance | AttendanceRecord, Course |
| View grades | StudentExams.tsx | `getStudentGrades()` | GET /students/:id/grades | studentRoutes | getStudentGrades | ExamResult, Course |
| View fees | StudentFees.tsx | `getStudentFees()` | GET /students/:id/fees | studentRoutes | getStudentFees | FeeTransaction, FeeStructure, Student |
| View documents | StudentDocuments.tsx | `getStudentDocuments()` | GET /students/:id/documents | studentRoutes | getStudentDocuments | DocumentRequest |
| Delete student | AdminStudents.tsx | (customApi) | DELETE /students/:id | studentRoutes | deleteStudent | User (cascade) |

### Faculty Features

| Feature | Page | API Function | HTTP | Backend Route | Controller | DB Tables |
|---|---|---|---|---|---|---|
| List faculty | AdminFaculty.tsx | `getFacultyList()` | GET /faculty | facultyRoutes | getFacultyList | Faculty, User, Department |
| Create faculty | AdminFaculty.tsx | `createFaculty()` | POST /faculty | facultyRoutes | createFaculty | User, Faculty |
| Get faculty | Faculty.tsx | `getFacultyById()` | GET /faculty/:id | facultyRoutes | getFacultyById | Faculty, User, Department |
| Update faculty | Faculty.tsx | `updateFaculty()` | PUT /faculty/:id | facultyRoutes | updateFaculty | Faculty, User |
| View workload | FacultyClasses.tsx | `getFacultyWorkload()` | GET /faculty/:id/workload | facultyRoutes | getFacultyWorkload | TimetableEntry, Course, Student |
| View leaves | FacultyLeaves.tsx | `getFacultyLeaves()` | GET /faculty/:id/leaves | facultyRoutes | getLeaveRequests | LeaveRequest |

### Academic Features

| Feature | Page | API Function | HTTP | Backend Route | Controller | DB Tables |
|---|---|---|---|---|---|---|
| List departments | AdminAcademics.tsx | `getDepartments()` | GET /departments | deptRoutes | getDepartments | Department |
| Create department | AdminAcademics.tsx | `createDepartment()` | POST /departments | deptRoutes | createDepartment | Department |
| Update department | AdminAcademics.tsx | `updateDepartment()` | PUT /departments/:id | deptRoutes | updateDepartment | Department |
| List courses | AdminAcademics.tsx | `getCourses()` | GET /courses | courseRoutes | getCourses | Course |
| Create course | AdminAcademics.tsx | `createCourse()` | POST /courses | courseRoutes | createCourse | Course |
| Update course | AdminAcademics.tsx | `updateCourse()` | PUT /courses/:id | courseRoutes | updateCourse | Course |
| Get timetable | StudentTimetable.tsx, FacultyTimetable.tsx | `getTimetables()` | GET /academics/timetable | timetableRoutes | getTimetables | TimetableEntry |
| Build timetable | AdminTimetableBuilder.tsx | `generateTimetable()` | POST /academics/timetable/generate | timetableRoutes | generateTimetable | TimetableEntry |
| Save timetable | AdminTimetableBuilder.tsx | (customApi via getAllTimetables) | POST /academics/timetable/save | timetableRoutes | saveTimetable | TimetableEntry |
| Mark attendance | FacultyAttendance.tsx | `markAttendance()` | POST /attendance/mark | attendanceRoutes | markAttendance | AttendanceRecord |
| Attendance report | Admin.tsx | `getAttendanceReport()` | GET /attendance/report | attendanceRoutes | getAttendanceReport | AttendanceRecord |

### Examination Features

| Feature | Page | API Function | HTTP | Backend Route | Controller | DB Tables |
|---|---|---|---|---|---|---|
| List exams | AdminExaminations.tsx, StudentExams.tsx | `getExaminations()` | GET /examinations | examinationRoutes | getExaminations | Examination |
| Create exam | AdminExaminations.tsx | `createExamination()` | POST /examinations | examinationRoutes | createExamination | Examination |
| Submit results | FacultyGrading.tsx | `submitExamResults()` | POST /examinations/:id/results | examinationRoutes | submitExamResults | ExamResult |
| View results | StudentExams.tsx | `getExamResults()` | GET /examinations/:id/results | examinationRoutes | getExamResults | ExamResult, Student |
| Release hall tickets | AdminExaminations.tsx | (customApi) | POST /examinations/:id/hall-tickets | examinationRoutes | releaseHallTickets | Examination |

### Finance Features

| Feature | Page | API Function | HTTP | Backend Route | Controller | DB Tables |
|---|---|---|---|---|---|---|
| List fee structures | FinanceStructures.tsx | `getFeeStructures()` | GET /fees/structures | feeRoutes | getFeeStructures | FeeStructure |
| Create fee structure | FinanceStructures.tsx | `createFeeStructure()` | POST /fees/structures | feeRoutes | createFeeStructure | FeeStructure, Student |
| List transactions | FinanceTransactions.tsx | `getFeeTransactions()` | GET /fees/transactions | feeRoutes | getFeeTransactions | FeeTransaction, Student, User |
| Record payment | Finance.tsx | `recordFeePayment()` | POST /fees/transactions | feeRoutes | recordFeePayment | FeeTransaction, FeeStructure |
| Approve payment | FinanceTransactions.tsx | `updateFeeTransactionStatus()` | PATCH /fees/transactions/:id/status | feeRoutes | updateFeeTransactionStatus | FeeTransaction, Student |
| Fee defaulters | FinanceDues.tsx | `getFeeDefaulters()` | GET /fees/defaulters | feeRoutes | getFeeDefaulters | Student, FeeTransaction, FeeStructure |

### Library Features

| Feature | Page | API Function | HTTP | Backend Route | Controller | DB Tables |
|---|---|---|---|---|---|---|
| Browse catalogue | LibraryCatalog.tsx | `getLibraryBooks()` | GET /library/books | libraryRoutes | getLibraryBooks | Book |
| Add book | LibraryCatalog.tsx | `createLibraryBook()` | POST /library/books | libraryRoutes | createLibraryBook | Book |
| Issue book | LibraryCirculation.tsx | `issueLibraryBook()` | POST /library/circulation/issue | libraryRoutes | issueLibraryBook | CirculationRecord, Book |
| Return book | LibraryCirculation.tsx | `returnLibraryBook()` | POST /library/circulation/return | libraryRoutes | returnLibraryBook | CirculationRecord, Book, FineRecord |
| View fines | LibraryFines.tsx | `getLibraryFines()` | GET /library/fines | libraryRoutes | getLibraryFines | FineRecord |
| Pay fine | LibraryFines.tsx | `payLibraryFine()` | POST /library/fines/:id/pay | libraryRoutes | payLibraryFine | FineRecord |
| View circulation | LibraryCirculation.tsx | `getLibraryCirculation()` | GET /library/circulation | libraryRoutes | getCirculationRecords | CirculationRecord |

### Analytics Features

| Feature | Page | API Function | HTTP | Backend Route | Controller | DB Tables |
|---|---|---|---|---|---|---|
| Overview KPIs | Analytics.tsx | `getInstitutionalOverview()` | GET /analytics/overview | analyticsRoutes | getInstitutionalOverview | Student, Faculty, FeeTransaction, Department, Course, AttendanceRecord, PlacementRecord, ResearchGrant |
| Admissions analytics | AnalyticsAdmissions.tsx | `getAdmissionsAnalytics()` | GET /analytics/admissions | analyticsRoutes | getAdmissionsAnalytics | AdmissionApplication |
| Academic performance | AnalyticsAcademicPerformance.tsx | `getAcademicPerformanceAnalytics()` | GET /analytics/academic-performance | analyticsRoutes | getAcademicPerformanceAnalytics | ExamResult, Course, Student, Department |
| Placement stats | AnalyticsPlacement.tsx | `getPlacementAnalytics()` | GET /analytics/placements | analyticsRoutes | getPlacementAnalytics | PlacementRecord, Student |
| System activity | Analytics.tsx | `getSystemActivity()` | GET /analytics/activity | analyticsRoutes | getSystemActivity | SystemActivity |
| Financial health | AnalyticsFinancialHealth.tsx | `getFinancialHealthAnalytics()` | GET /analytics/financial-health | analyticsRoutes | getFinancialHealthAnalytics | ExpenseRecord, Department, ResearchGrant |

### Admin Features

| Feature | Page | API Function | HTTP | Backend Route | Controller | DB Tables |
|---|---|---|---|---|---|---|
| List admissions | AdminAdmissions.tsx | `getAdmissions()` via customApi | GET /admin/admissions | adminRoutes | getAdmissions | AdmissionApplication |
| Update admission | AdminAdmissions.tsx | (customApi) | PUT /admin/admissions/:id | adminRoutes | updateAdmissionStatus | AdmissionApplication |
| View role permissions | AdminRoles.tsx | `getRoles()` via customApi | GET /admin/roles | adminRoutes | getRolePermissions | Permission, RolePermission |
| Update role permissions | AdminRoles.tsx | (customApi) | PUT /admin/roles/:role/permissions | adminRoutes | updateRolePermissions | RolePermission |
| Create admin user | Admin.tsx | (customApi) | POST /admin/users | adminRoutes | createAdminUser | User |

### Notice Features

| Feature | Page | API Function | HTTP | Backend Route | Controller | DB Tables |
|---|---|---|---|---|---|---|
| List notices | All dashboards | `getNotices()` | GET /notices | noticeRoutes | getNotices | Notice, User |
| Create notice | AdminNotices.tsx | `createNotice()` | POST /notices | noticeRoutes | createNotice | Notice |
| Update notice | AdminNotices.tsx | (customApi) | PUT /notices/:id | noticeRoutes | updateNotice | Notice |
| Toggle pin | AdminNotices.tsx | (customApi) | PATCH /notices/:id/pin | noticeRoutes | togglePinNotice | Notice |
| Delete notice | AdminNotices.tsx | (customApi) | DELETE /notices/:id | noticeRoutes | deleteNotice | Notice |
