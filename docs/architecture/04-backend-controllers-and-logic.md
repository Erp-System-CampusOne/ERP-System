# Backend Architecture — Controllers & Business Logic

> **Verification Status:** Verified from direct inspection of all 13 controller files and route files.

## 1. Controller Inventory

| Controller | File | Routes | Key Responsibilities | Lines (approx) |
|---|---|---|---|---|
| authController | `authController.ts` | `/auth/*` | Login (multi-identifier), logout, getCurrentUser, JWT signing | ~120 |
| studentController | `studentController.ts` | `/students/*` | CRUD students, attendance summary, grade view, fee ledger, documents | ~320 |
| facultyController | `facultyController.ts` | `/faculty/*` | CRUD faculty, workload calculation, leave requests | ~207 |
| departmentController | `departmentController.ts` | `/departments/*` | CRUD departments | ~80 |
| courseController | `courseController.ts` | `/courses/*` | CRUD courses | ~100 |
| attendanceController | `attendanceController.ts` | `/attendance/*` | Mark attendance (bulk), attendance report | ~150 |
| timetableController | `timetableController.ts` | `/academics/timetable/*` | Get/export/generate/save timetable | ~200 |
| examinationController | `examinationController.ts` | `/examinations/*` | Exam CRUD, results, hall tickets, stats, export | ~350 |
| feeController | `feeController.ts` | `/fees/*` | Fee structures (upsert), transactions, payment approval, defaulters | ~284 |
| libraryController | `libraryController.ts` | `/library/*` | Books, circulation (issue/return), fines, fine payment | ~250 |
| noticeController | `noticeController.ts` | `/notices/*` | Notice CRUD, pin toggle | ~120 |
| analyticsController | `analyticsController.ts` | `/analytics/*` | Institutional overview KPIs, admissions analytics, academic performance, placements, system activity, financial health | ~350 |
| adminController | `adminController.ts` | `/admin/*` | Admissions CRUD, role-permission management, admin user creation | ~120 |

---

## 2. Request Pattern (Per Controller)

Every controller function follows this pattern:

```typescript
export const functionName = async (req: AuthRequest | Request, res: Response) => {
  try {
    // 1. Extract params from req.query / req.params / req.body
    // 2. Validate inputs (ad-hoc, inline)
    // 3. Execute Prisma query
    // 4. Transform result (map/format)
    // 5. res.json(result) or res.status(xxx).json({...})
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
```

---

## 3. Significant Business Logic

### 3.1 Multi-Identifier Login (`authController.loginUser`)
The login endpoint accepts any of:
- Email address
- Student roll number
- Faculty employee code

Query logic:
```
User.email = identifier
OR Student.rollNumber = identifier (via join)
OR Faculty.employeeCode = identifier (via join)
```
Optional `role` parameter in request body can narrow the search.

### 3.2 Fee Status Synchronisation (`feeController`)
Two helper functions run after every payment event:

**`getFeeStructureForStudent(studentId)`:**
1. Load student with successful transactions
2. Load matching FeeStructure by `(program, quota)` composite key

**`syncStudentFeeStatus(studentId)`:**
1. Call `getFeeStructureForStudent`
2. Sum all successful transaction amounts
3. Compute status: `paid` / `partial` / `due`
4. Update `Student.feeStatus`

Called after:
- `recordFeePayment()` (if not student role)
- `updateFeeTransactionStatus()` (always)
- `createFeeStructure()` (for all affected students)

### 3.3 Timetable Conflict Detection (DB-enforced)
Three UNIQUE constraints on `TimetableEntry` prevent scheduling conflicts at the DB level:
1. `(dayOfWeek, period, facultyId)` — faculty double-booking
2. `(dayOfWeek, period, roomNumber)` — room double-booking
3. `(dayOfWeek, period, section, semester, departmentId)` — section double-booking

### 3.4 Faculty Workload Calculation (`facultyController.getFacultyWorkload`)
1. Fetch all timetable entries for the faculty
2. Group by `(courseId, section)` combination
3. Count periods per group ? `hoursPerWeek`
4. Per group: count students in matching `(department, semester, section)`
5. Returns array of course workload objects

### 3.5 Fee Defaulter Detection (`feeController.getFeeDefaulters`)
1. Load all students with their successful transactions and department
2. Load all fee structures
3. Build a map: `program:quota ? FeeStructure`
4. For each student: compute `dueAmount = totalAmount - paidAmount`
5. Filter students where `dueAmount > 0`
6. Compute `daysOverdue` based on `FeeStructure.dueDate`

### 3.6 Analytics Aggregation (`analyticsController.getInstitutionalOverview`)
Runs parallel Prisma queries (via `Promise.all`) across all major tables to compute:
- Student count by department
- Faculty count
- Recent fee transactions total
- Attendance percentages
- Placement statistics
- Research grants total
- Recent system activity

---

## 4. Authentication Request Type

```typescript
// backend/src/middlewares/authMiddleware.ts
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}
```

Controllers that need the authenticated user import and use `AuthRequest`. Controllers that do not need user context (e.g., `facultyController.ts`) use the base `Request` type.

---

## 5. Middleware Pipeline (In Order)

```
POST /api/students  (example request)
        ¦
        ?
1. helmet() — security headers
2. morgan('combined') — logging
3. cors({origin: FRONTEND_URL}) — CORS
4. express.json({limit:'10kb'}) — body parsing
5. express.urlencoded({extended:true}) — form parsing
6. rateLimiter (100 req/15min/IP) — rate limiting
7. router.use('/students', studentRouter)
8. authenticateJWT — verify Bearer token, set req.user
9. authorizeRoles(['admin', 'student', ...]) — role check
10. createStudent / getStudents / etc. — controller
11. res.json({...}) — response
12. errorHandler — catch-all 500 handler
```

---

## 6. Error Response Shapes

Controllers return two different error patterns (inconsistently):

**Pattern A (most controllers):**
```json
{ "success": false, "message": "Error description" }
```

**Pattern B (some controllers on validation failure):**
```json
{ "message": "Error description" }
```

**Global error handler:**
```json
// production:
{ "message": "Internal Server Error" }

// development:
{ "message": "actual error message", "stack": "..." }
```

> **Inconsistency:** There is no unified error response contract across the API. Frontend code must handle multiple shapes.

---

## 7. Data Seed Architecture

### Development Seed (`prisma/seed.ts`)
Creates comprehensive realistic data:
- Multiple departments (CS, ECE, ME, Civil, MBA, MCA)
- Admin, finance_officer, librarian, management users
- Faculty members per department with HOD assignment
- Students per department/semester/section
- Courses with faculty assignments
- Timetable entries
- Attendance records
- Exam results with CGPA computation
- Fee structures and transactions
- Library books and circulation
- Notices
- Admission applications
- Placement records
- Permissions and role-permission mappings

### Production Seed (`prisma/seed.production.ts`)
Minimal — creates only essential data:
- System permissions
- Default admin user
- (Inferred — not directly read, content minimal by convention)
