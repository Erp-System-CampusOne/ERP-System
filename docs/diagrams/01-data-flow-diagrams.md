# Data Flow Diagrams

> All flows reconstructed from source code. Verification status noted per flow.

## 1. User Login Flow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant LP as Login Page
    participant AC as AuthContext
    participant API as apiCall.ts
    participant EX as Express /auth/login
    participant DB as PostgreSQL

    U->>LP: Enter identifier + password
    LP->>AC: login({identifier, password})
    AC->>API: loginUser(input)
    API->>EX: POST /api/auth/login
    EX->>DB: findFirst User where email/rollNumber/employeeCode = identifier
    DB-->>EX: User record
    EX->>EX: bcrypt.compare(password, hash)
    EX->>DB: findUnique User with studentProfile/facultyProfile
    DB-->>EX: Full profile
    EX->>EX: jwt.sign({id, role}, JWT_SECRET, {expiresIn:"1d"})
    EX-->>API: {token, user}
    API-->>AC: {token, user}
    AC->>AC: localStorage.setItem("campusone_jwt_token", token)
    AC->>AC: setApiConfig(Authorization header)
    AC->>AC: setUser(user)
    AC-->>LP: user object
    LP->>U: Redirect to role dashboard
```

## 2. Student Dashboard Data Load

```mermaid
sequenceDiagram
    participant B as Browser
    participant SP as Student Page
    participant TQ as TanStack Query
    participant API as apiCall.ts
    participant EX as Express
    participant DB as PostgreSQL

    B->>SP: Navigate to /student
    SP->>TQ: useQuery([getStudentById, id])
    TQ->>API: getStudentById(id)
    API->>EX: GET /api/students/:id
    EX->>EX: authenticateJWT + authorizeRoles
    EX->>DB: student.findUnique({include: user, department})
    DB-->>EX: Student + User + Department
    EX-->>API: Formatted student JSON
    API-->>TQ: Data
    TQ-->>SP: {data, isLoading, error}
    SP->>B: Render student profile
    Note over TQ: Cached for 5 minutes (staleTime)
```

## 3. Fee Payment Flow

```mermaid
sequenceDiagram
    participant F as Finance Officer
    participant FP as Finance Page
    participant API as apiCall.ts
    participant EX as Express /fees/transactions
    participant DB as PostgreSQL

    F->>FP: Submit payment for student
    FP->>API: recordFeePayment({studentId, amount, paymentMethod})
    API->>EX: POST /api/fees/transactions
    EX->>EX: authorizeRoles([admin, finance_officer, student])
    EX->>DB: student.findUnique(studentId) + feeTransactions where status=success
    DB-->>EX: Student + transactions
    EX->>DB: feeStructure.findUnique({program, quota})
    DB-->>EX: FeeStructure
    EX->>EX: Compute remaining = totalAmount - committed
    alt amount > remaining
        EX-->>API: 422 Payment exceeds balance
    else amount OK
        EX->>DB: feeTransaction.create({status: "success", paidAt: now()})
        DB-->>EX: Created transaction
        EX->>EX: syncStudentFeeStatus(studentId)
        EX->>DB: Recompute + update Student.feeStatus
        EX-->>API: 201 Created transaction
    end
    API-->>FP: Transaction record
    FP->>F: Success notification (Sonner toast)
```

## 4. Attendance Marking Flow

```mermaid
sequenceDiagram
    participant FA as Faculty
    participant FAP as FacultyAttendance Page
    participant API as apiCall.ts
    participant EX as Express /attendance/mark
    participant DB as PostgreSQL

    FA->>FAP: Select date + course + section
    FAP->>FAP: Build attendance list (present/absent per student)
    FA->>FAP: Submit attendance
    FAP->>API: markAttendance({courseId, date, period, records:[{studentId, status}]})
    API->>EX: POST /api/attendance/mark
    EX->>EX: authorizeRoles([faculty, admin])
    loop For each student record
        EX->>DB: attendanceRecord.upsert({studentId, courseId, date, period}, {status})
        DB-->>EX: Created/updated record
    end
    EX-->>API: {marked: N, records: [...]}
    API-->>FAP: Success
    FAP->>FA: "Attendance marked for N students"
```

## 5. Library Book Issue Flow

```mermaid
sequenceDiagram
    participant L as Librarian
    participant LC as LibraryCirculation Page
    participant API as apiCall.ts
    participant EX as Express /library/circulation/issue
    participant DB as PostgreSQL

    L->>LC: Select book + borrower user
    LC->>API: issueLibraryBook({bookId, borrowerId, dueDate})
    API->>EX: POST /api/library/circulation/issue
    EX->>EX: authorizeRoles([librarian, admin])
    EX->>DB: book.findUnique(bookId)
    DB-->>EX: Book record
    alt availableCopies <= 0
        EX-->>API: 422 No copies available
    else
        EX->>DB: circulationRecord.create({bookId, borrowerId, issueDate:now, dueDate, status:"issued"})
        EX->>DB: book.update({availableCopies: availableCopies - 1})
        EX-->>API: CirculationRecord
    end
    API-->>LC: Success
```

## 6. Book Return + Fine Generation Flow

```mermaid
sequenceDiagram
    participant L as Librarian
    participant LC as LibraryCirculation Page
    participant API as apiCall.ts
    participant EX as Express /library/circulation/return
    participant DB as PostgreSQL

    L->>LC: Return book (circulationId)
    LC->>API: returnLibraryBook({circulationId})
    API->>EX: POST /api/library/circulation/return
    EX->>DB: circulationRecord.findUnique(circulationId)
    DB-->>EX: CirculationRecord
    EX->>EX: Compute overdueDays = now - dueDate (if positive)
    EX->>EX: fineAmount = overdueDays * fine_rate_per_day
    EX->>DB: circulationRecord.update({status:"returned", returnDate:now, fineAmount})
    EX->>DB: book.update({availableCopies: +1})
    alt fineAmount > 0
        EX->>DB: fineRecord.create({userId: borrowerId, circulationId, amount:fineAmount})
    end
    EX-->>API: {circulation, fine?}
    API-->>LC: Success
```

## 7. Analytics Overview Load Flow

```mermaid
sequenceDiagram
    participant M as Manager
    participant AP as Analytics Page
    participant API as apiCall.ts
    participant EX as Express /analytics/overview
    participant DB as PostgreSQL

    M->>AP: Navigate to /analytics
    AP->>API: getInstitutionalOverview()
    API->>EX: GET /api/analytics/overview
    EX->>EX: authorizeRoles([admin, management, hod])
    EX->>DB: Promise.all([ count(Student), count(Faculty), sum(FeeTransaction where success), count(AttendanceRecord), avg(ExamResult.totalScore), count(PlacementRecord), sum(ResearchGrant.amount), findMany(SystemActivity limit:10) ])
    DB-->>EX: All aggregates
    EX->>EX: Compute KPI metrics
    EX-->>API: {totalStudents, totalFaculty, feesCollected, attendanceRate, avgCGPA, placements, researchFunding, recentActivity}
    API-->>AP: KPI data
    AP->>M: Render dashboard charts
```
