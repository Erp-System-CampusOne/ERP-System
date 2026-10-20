# CampusOne ERP — Complete Manual Testing & System Verification Guide

> **Target Environment**: Local Docker Compose Stack  
> **Application URL**: [http://localhost:8080](http://localhost:8080)  
> **Backend API Base**: [http://localhost:8080/api](http://localhost:8080/api)  
> **API Health Check**: [http://localhost:8080/api/health](http://localhost:8080/api/health)  

---

## 1. System Architecture & Docker Container Status

The CampusOne ERP platform runs as a coordinated 3-tier containerized stack managed via Docker Compose:

| Container Name | Service | Technology | Port Mapping | Health Status | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `erp_web` | Web Client | Nginx 1.27 + React SPA (Vite) | `0.0.0.0:8080 -> 80/tcp` | Active (Up) | Serves the user interface and proxies `/api` calls to `erp_api` |
| `erp_api` | Backend API | Node.js 20 + Express + Prisma ORM | Internal `3000/tcp` | Healthy | Handles business logic, role-based authorization, and REST endpoints |
| `erp_db` | Database | PostgreSQL 16 Alpine | Internal `5432/tcp` | Healthy | Multi-schema persistence with referential integrity and user credentials |

### Quick CLI Management Commands

```powershell
# Check status of containers
docker compose ps

# View live API server logs
docker compose logs -f api

# View live Web/Nginx proxy logs
docker compose logs -f web

# Re-run seeder inside container (if resetting demo data)
docker exec -i erp_api node scripts/clean_and_seed_production.js

# Restart all containers
docker compose restart

# Stop all containers cleanly
docker compose down
```

---

## 2. Authentication Rules & Canonical Credentials

### ⚠️ Critical Login Requirement
* **Exclusive Campus ID Authentication**: All logins across all roles (Admin, HOD, Faculty, Student, Finance, Library, Analytics) strictly require the user's registered **Campus ID** (`COID####`, e.g. `COID1001`) and password.
* **Email login is strictly disabled**: Entering an email address (e.g. `admin@campus.edu`) returns an explicit rejection:  
  `"Email login is disabled. Please log in using your Campus ID (e.g., COID1001)."`
* **Alternative identifiers are strictly disallowed**: Entering student roll numbers (e.g. `22CS001`), faculty employee codes (e.g. `FAC-CSE-001`), usernames, or phone numbers will be rejected with HTTP 401 (`"Invalid Campus ID or password"`).
* **Sole Allowed Identifier**:
  1. **Campus ID** (`COID####` — exclusive login identifier for all staff, leadership, and students)

---

### Master Database Credential Directory

All 20 pre-seeded accounts currently active in the database:

#### A. Administrative & Executive Leadership
| Role | CampusOne ID | Password | Name | Alternate Identifier | Target Dashboard |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **System Admin** | `COID1001` | `Admin123!` | System Administrator | — | `/admin` |
| **Institution HOD** | `COID1002` | `Hod123!` | Dr. Sarah Jenkins | `HOD-INST-001` | `/hod` |
| **Institutional Analytics** | `COID1003` | `Analytics123!` | Dr. Rohan Mehta | — | `/analytics` |
| **Librarian** | `COID1004` | `Librarian123!` | Anita Sharma | — | `/library` |
| **Finance Officer** | `COID1005` | `Finance123!` | Kavita Iyer | — | `/finance` |

#### B. Academic Faculty Members
| Role | CampusOne ID | Password | Name | Department / Designation | Employee Code | Target Dashboard |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Faculty (CSE)** | `COID2001` | `Faculty123!` | Prof. Rajesh Sharma | CSE — Professor | `FAC-CSE-001` | `/faculty` |
| **Faculty (CSE)** | `COID2002` | `Faculty123!` | Dr. Meera Iyer | CSE — Assoc. Professor | `FAC-CSE-002` | `/faculty` |
| **Faculty (CSE)** | `COID2003` | `Faculty123!` | Dr. Amit Verma | CSE — Assoc. Professor | `FAC-CSE-003` | `/faculty` |
| **Faculty (ECE)** | `COID2004` | `Faculty123!` | Prof. Vikram Gupta | ECE — Asst. Professor | `FAC-ECE-001` | `/faculty` |
| **Faculty (MECH)** | `COID2005` | `Faculty123!` | Dr. Ananya Nair | MECH — Asst. Professor | `FAC-MECH-001` | `/faculty` |

#### C. Students
| CampusOne ID | Password | Student Name | Roll Number | Degree / Dept | Semester | CGPA | Fee Status | Portal |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `COID3001` | `Student123!` | Aarav Patel | `22CS001` | B.Tech CSE | Sem 4 | 8.85 | **Paid** | `/student` |
| `COID3002` | `Student123!` | Diya Sen | `22CS002` | B.Tech CSE | Sem 4 | 9.20 | **Paid** | `/student` |
| `COID3003` | `Student123!` | Rohan Kulkarni | `22CS003` | B.Tech CSE | Sem 4 | 7.60 | **Due** | `/student` |
| `COID3004` | `Student123!` | Ananya Roy | `22CS004` | B.Tech CSE | Sem 4 | 8.40 | **Paid** | `/student` |
| `COID3005` | `Student123!` | Kabir Das | `22CS005` | B.Tech CSE | Sem 4 | 6.95 | **Due** | `/student` |
| `COID3006` | `Student123!` | Ishaan Reddy | `22CS006` | B.Tech CSE | Sem 4 | 8.10 | **Partial** | `/student` |
| `COID3007` | `Student123!` | Tanvi Joshi | `22CS007` | B.Tech CSE | Sem 4 | 9.50 | **Paid** | `/student` |
| `COID3008` | `Student123!` | Aditya Rao | `22CS008` | B.Tech CSE | Sem 2 | 8.30 | **Paid** | `/student` |
| `COID3009` | `Student123!` | Zoya Khan | `22CS009` | B.Tech CSE | Sem 2 | 7.80 | **Due** | `/student` |
| `COID3010` | `Student123!` | Varun Nair | `22CS010` | B.Tech CSE | Sem 6 | 8.90 | **Paid** | `/student` |

---

## 3. End-to-End Manual Testing Checklist

Follow this systematic step-by-step checklist to test all modules of the ERP.

```
       ┌────────────────────────────────────────────────────────┐
       │                1. AUTHENTICATION FLOW                  │
       │  • Email rejection  • CampusID login  • Roll/Code auth │
       └───────────────────────────┬────────────────────────────┘
                                   │
         ┌─────────────────────────┴────────────────────────┐
         │                                                  │
         ▼                                                  ▼
┌──────────────────┐                             ┌───────────────────────┐
│ 2. ADMIN PORTAL  │                             │   3. ACADEMIC & HOD   │
│ • Students       │                             │ • Institution HOD     │
│ • Faculty        │                             │ • Faculty Workload    │
│ • HOD Leadership │                             │ • Class Attendance    │
│ • Academics      │                             │ • Grade Submission    │
│ • Timetable      │                             │ • Faculty Leaves      │
│ • Examinations   │                             └──────────┬────────────┘
│ • Notices & RBAC │                                        │
└────────┬─────────┘                                        ▼
         │                                       ┌───────────────────────┐
         ▼                                       │   4. STUDENT PORTAL   │
┌──────────────────┐                             │ • Attendance & CGPA   │
│ 5. FINANCE & LIB │                             │ • Course Schedule     │
│ • Fee Structures │                             │ • Exam Hall Ticket    │
│ • Dues & Ledger  │                             │ • Fee Payments        │
│ • Book Catalog   │                             │ • Library Due Dates   │
│ • Circulation    │                             │ • Document Requests   │
│ • Overdue Fines  │                             └───────────────────────┘
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  6. ANALYTICS    │
│ • KPI Dashboards │
│ • Academic Dist. │
│ • Placement CTC  │
│ • Financial Run  │
└──────────────────┘
```

---

### Step 1: Authentication & Access Control Verification
1. Open your browser and navigate to: [http://localhost:8080/login](http://localhost:8080/login)
2. **Negative Test (Email Rejection)**:
   - Identifier: `admin@campus.edu`
   - Password: `Admin123!`
   - Click **Sign In**.
   - **Expected Result**: A warning toast or validation message appears: `"Email login is disabled. Please log in using your CampusOne ID (e.g., COID1001)."`.
3. **Negative Test (Wrong Password)**:
   - Identifier: `COID1001`
   - Password: `WrongPassword999`
   - Click **Sign In**.
   - **Expected Result**: Message `"Invalid Campus ID or password"`.
4. **Positive Test (Campus ID Login)**:
   - Identifier: `COID1001`
   - Password: `Admin123!`
   - Click **Sign In**.
   - **Expected Result**: Successfully redirects to `/admin` dashboard with user badge showing `System Administrator (admin)`.
5. **Negative Test (Roll Number Rejection)**:
   - Log out. Enter Identifier: `22CS001` and Password: `Student123!`.
   - **Expected Result**: Login rejected with format warning or HTTP 401 `"Invalid Campus ID or password"`. Alternative identifiers are not permitted.
6. **Negative Test (Employee Code Rejection)**:
   - Log out. Enter Identifier: `FAC-CSE-001` and Password: `Faculty123!`.
   - **Expected Result**: Login rejected with format warning or HTTP 401 `"Invalid Campus ID or password"`. Alternative identifiers are not permitted.
7. **Positive Test (Student Login via Campus ID)**:
   - Log out. Enter Identifier: `COID3001` and Password: `Student123!`.
   - **Expected Result**: Successfully redirects to `/student` dashboard as `Aarav Patel`.
8. **Positive Test (Faculty Login via Campus ID)**:
   - Log out. Enter Identifier: `COID2001` and Password: `Faculty123!`.
   - **Expected Result**: Successfully redirects to `/faculty` dashboard as `Prof. Rajesh Sharma`.

---

### Step 2: System Administrator Portal (`/admin`)
*Login as: `COID1001` / `Admin123!`*

| Checkpoint | URL / Navigation | Actions to Test | Expected Verification |
| :--- | :--- | :--- | :--- |
| **2.1 Admin Overview** | `/admin` | Inspect top stats: Total Students, Faculty, Courses, and System Health. | Metric cards display populated numbers without NaN or error spinners. |
| **2.2 Student Directory** | `/admin/students` | Search for `Aarav` or `22CS001`. Filter by Semester 4. Click **New Student Registration**. | Displays student details (Roll No, CGPA, Fee Status). Registration modal opens cleanly. |
| **2.3 Faculty Directory** | `/admin/faculty` | Review list of 5 faculty members. Check workload hours column (14-18 hrs). | Faculty records correctly map to CSE, ECE, and MECH departments. |
| **2.4 Institution HOD** | `/admin/hod` | View Institution HOD card (`Dr. Sarah Jenkins`). | Displays active institutional assignment and direct appointment details. |
| **2.5 Academic Catalog** | `/admin/academics` | Inspect list of Departments (`CSE`, `ECE`, `MECH`) and Courses (`CS301` Database Management Systems). | Department details and semester course lists render with valid credits. |
| **2.6 Timetable Builder** | `/admin/timetable-builder` | Select Department `CSE`, Semester `4`, Section `A`. | Timetable grid renders with period slots and assigned faculty rooms (e.g. CR-101). |
| **2.7 Examinations** | `/admin/examinations` | Review scheduled examination: `End Semester Examination 2026`. Check status `evaluated`. | Lists exam start/end dates and hall ticket release status. |
| **2.8 Notice Board** | `/admin/notices` | Click **Publish Notice**. Create a test notice: `"Workshop on Cloud Architecture"`, category `Academic`, target `student`. | Notice appears at the top of the notice stream in real-time. |
| **2.9 Roles & RBAC** | `/admin/roles` | Inspect list of system roles: `admin`, `hod`, `faculty`, `student`, `librarian`, `finance_officer`, `analytics`. | Displays associated permission counts per role. |

---

### Step 3: Institution HOD Portal (`/hod`)
*Login as: `COID1002` (or `HOD-INST-001`) / `Hod123!`*

| Checkpoint | URL / Navigation | Actions to Test | Expected Verification |
| :--- | :--- | :--- | :--- |
| **3.1 Institutional Oversight** | `/hod` | Check unified metrics: Institution-wide student strength, active faculty count, and departmental averages. | Header shows `Dr. Sarah Jenkins - Institution Head of Department`. |
| **3.2 Department Tabs** | `/hod` | Switch between `Computer Science`, `Electronics`, and `Mechanical` department views. | Data filters dynamically without page refresh. |
| **3.3 Faculty Workload Distribution** | `/hod` (Workload section) | Review faculty weekly teaching load vs target benchmark (16 hrs/wk). | Visual status indicator shows balanced vs overloaded faculty. |
| **3.4 Leave Approval Queue** | `/hod` (Leaves tab) | View pending faculty leave requests (e.g., Casual Leave for `Dr. Priya Menon` / `Prof. Rajesh Sharma`). | Can click **Approve** or **Reject**; status updates immediately in the UI. |

---

### Step 4: Academic Faculty Portal (`/faculty`)
*Login as: `COID2001` (or `FAC-CSE-001`) / `Faculty123!`*

| Checkpoint | URL / Navigation | Actions to Test | Expected Verification |
| :--- | :--- | :--- | :--- |
| **4.1 Faculty Dashboard** | `/faculty` | Check assigned classes, upcoming lectures, and leave balance summary (15 days). | Profile header displays `Prof. Rajesh Sharma`, Professor in CSE. |
| **4.2 My Classes** | `/faculty/classes` | Select assigned course `CS301 - Database Management Systems (Section A)`. | Enrolled student roster loads (including `Aarav Patel`, `Diya Sen`). |
| **4.3 Mark Attendance** | `/faculty/attendance` | Select date, course, and mark students as `Present` / `Absent` / `Late`. Click **Submit Attendance**. | Confirmation banner appears and daily attendance records are stored. |
| **4.4 Grade Entry** | `/faculty/grading` | Select `CS301`, assessment type `Mid-Sem Exam`. Enter scores for students. Click **Save Grades**. | Grade entries recalculate total score and display letter grades (`A`, `B`, etc.). |
| **4.5 Apply for Leave** | `/faculty/leaves` | Click **Apply Leave**. Select Type: `Casual Leave`, Dates: next week, Reason: `"Attending conference"`. | New leave appears with status `Pending` under my leave history. |
| **4.6 Teaching Schedule** | `/faculty/timetable` | Inspect weekly time-slot matrix. | Displays Monday 09:00-09:55 slot in room `CR-101`. |

---

### Step 5: Student Portal (`/student`)
*Login as: `COID3001` (or `22CS001`) / `Student123!`*

| Checkpoint | URL / Navigation | Actions to Test | Expected Verification |
| :--- | :--- | :--- | :--- |
| **5.1 Student Dashboard** | `/student` | Check KPI cards: CGPA (`8.85`), Attendance (`92.5%`), Fee Status (`Paid`), Enrolled Courses. | Welcome message displays `Aarav Patel` (B.Tech CSE, Sem 4, Sec A). |
| **5.2 Course Schedule** | `/student/courses` | View registered subjects: `Database Management Systems (CS301)`. | Course syllabus, instructor name, and credit breakdown (4 credits) are visible. |
| **5.3 Attendance History** | `/student/attendance` | Check subject-wise attendance percentage breakdown. | Progress bar displays green (`>75%` safe threshold) with attended vs total lectures. |
| **5.4 Class Timetable** | `/student/timetable` | Inspect student day-by-day timetable. | Monday period 1 shows `CS301` in room `CR-101` with `Prof. Rajesh Sharma`. |
| **5.5 Examinations & Hall Ticket** | `/student/exams` | View `End Semester Examination 2026`. Check score: Total `86/100`, Grade `A`. Click **Download Hall Ticket**. | Displays official hall ticket preview with exam schedule and roll number `22CS001`. |
| **5.6 Fee Payment & Ledger** | `/student/fees` | Check fee ledger balance (`B.Tech General Quota`). Review receipt `SEED-FIN-001` (`₹60,000` paid). | Complete payment history displays transaction ID, timestamp, and payment method (`UPI`). |
| **5.7 Library Account** | `/student/library` | Check currently issued books: `Database System Concepts` (Silberschatz). | Shows due date, days remaining, and current outstanding fines (`₹0.00`). |
| **5.8 Document Requests** | `/student/documents` | Click **Request Document**. Choose `Bonafide Certificate`, specify purpose: `"Passport Verification"`. | Request appears in queue with status `Pending Verification`. |

---

### Step 6: Finance Office Portal (`/finance`)
*Login as: `COID1005` / `Finance123!`*

| Checkpoint | URL / Navigation | Actions to Test | Expected Verification |
| :--- | :--- | :--- | :--- |
| **6.1 Finance Overview** | `/finance` | Review collection metrics: Total Collections, Outstanding Receivables, and Collection Rate. | Dashboard displays financial summary charts and recent transactions. |
| **6.2 Fee Structures** | `/finance/structures` | View master fee structures: `B.Tech General (₹1,45,000)`, `B.Tech Merit (₹1,15,000)`, `M.Tech General (₹1,25,000)`. | Fee item breakdown (Tuition, Hostel, Exam, Library Deposit) is accurate. |
| **6.3 Dues & Defaulters** | `/finance/dues` | Filter students by status `Due` or `Partial`. Find `Rohan Kulkarni` (`22CS003`) and `Ishaan Reddy` (`22CS006`). | Shows remaining due balances with option to trigger payment reminder notices. |
| **6.4 Transactions Ledger** | `/finance/transactions` | Search transaction `SEED-FIN-001` (`₹60,000`, UPI) and `SEED-FIN-002` (`₹25,000`, NetBanking). | Displays transaction ledger with reconciled status. Click receipt to preview voucher. |
| **6.5 Financial Reports** | `/finance/reports` | Check Revenue by Program, Monthly Collection Trends, and Payment Gateway Split. | Visual breakdown graphs render with valid aggregated figures. |

---

### Step 7: Campus Library Portal (`/library`)
*Login as: `COID1004` / `Librarian123!`*

| Checkpoint | URL / Navigation | Actions to Test | Expected Verification |
| :--- | :--- | :--- | :--- |
| **7.1 Library Dashboard** | `/library` | Review metrics: Total Catalog Items, Active Loans, Overdue Books, and Fines Collected. | Displays summary cards with zero broken images or missing values. |
| **7.2 Book Catalog** | `/library/catalog` | Search by ISBN `978-0078022159` (`Database System Concepts`) and `978-0132350884` (`Clean Code`). | Shows Total Copies (5 / 3) and Available Copies (4 / 3). |
| **7.3 Issue / Return Desk** | `/library/circulation` | Look up student `22CS001` (`Aarav Patel`). Check currently borrowed item. | Displays active loan record with issue date, due date, and return button. |
| **7.4 Overdue Fines** | `/library/fines` | Inspect overdue fee calculation rules (`₹5 per day overdue`). | Lists students with overdue circulation records and uncollected fines. |

---

### Step 8: Institutional Analytics Portal (`/analytics`)
*Login as: `COID1003` / `Analytics123!`*

| Checkpoint | URL / Navigation | Actions to Test | Expected Verification |
| :--- | :--- | :--- | :--- |
| **8.1 Executive Dashboard** | `/analytics` | Review institutional KPIs: Total Enrollment, Faculty Retention, Average Campus CGPA, Placement Rate. | Top-level executive cards populate with institutional metrics. |
| **8.2 Academic Performance** | `/analytics/academic-performance` | Inspect grade distribution across departments and pass percentage trends. | Chart displays grade spread (`A`, `B`, `C`, `F`) and semester GPA trajectories. |
| **8.3 Placement Analytics** | `/analytics/placement` | Review placements: `Infosys (7.5 LPA)` for Aarav Patel, `Deloitte (10.0 LPA)` for Diya Sen. | Placement statistics show median package, top hiring sectors, and recruiter list. |
| **8.4 Financial Health** | `/analytics/financial-health` | Check Budget Allocation vs Realized Revenue, operational burn rate, and fee recovery % | Financial health indices render with comparative breakdown graphs. |

---

## 4. Troubleshooting & Verification Commands

### Test Database Direct Query from Host
```powershell
@"
SELECT u."campusId", u.name, u.role, s."rollNumber", f."employeeCode"
FROM "User" u
LEFT JOIN "Student" s ON s."userId" = u.id
LEFT JOIN "Faculty" f ON f."userId" = u.id
ORDER BY u."campusId";
"@ | docker exec -i erp_db psql -U erp_user -d erp_db
```

### Test API Login via CLI
```powershell
node -e "
const test = async (id, pwd) => {
  const res = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: id, password: pwd })
  });
  const data = await res.json();
  console.log(id, res.status, data.token ? 'SUCCESS' : data.message);
};
test('COID1001', 'Admin123!');
"
```

### Resetting & Re-Seeding the Entire Stack
If you ever want to reset all test data back to the clean baseline:
```powershell
docker exec -i erp_api node scripts/clean_and_seed_production.js
```
All 20 test accounts, department timetables, fee transactions, exam records, and library catalog items will be recreated instantly.
