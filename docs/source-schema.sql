-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."ApplicationStatus" AS ENUM ('pending', 'approved', 'rejected', 'waitlisted');

-- CreateEnum
CREATE TYPE "public"."AttendanceStatus" AS ENUM ('present', 'absent');

-- CreateEnum
CREATE TYPE "public"."CirculationStatus" AS ENUM ('issued', 'returned', 'overdue');

-- CreateEnum
CREATE TYPE "public"."CourseType" AS ENUM ('theory', 'lab', 'elective', 'project');

-- CreateEnum
CREATE TYPE "public"."DayOfWeek" AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');

-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('pending', 'processing', 'completed', 'rejected');

-- CreateEnum
CREATE TYPE "public"."ExamStatus" AS ENUM ('upcoming', 'ongoing', 'completed', 'evaluated');

-- CreateEnum
CREATE TYPE "public"."FeeQuota" AS ENUM ('general', 'merit', 'management', 'nri');

-- CreateEnum
CREATE TYPE "public"."FeeStatus" AS ENUM ('paid', 'partial', 'due');

-- CreateEnum
CREATE TYPE "public"."FineStatus" AS ENUM ('unpaid', 'paid', 'waived');

-- CreateEnum
CREATE TYPE "public"."LeaveStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."NoticeCategory" AS ENUM ('academic', 'examination', 'events', 'fee', 'general');

-- CreateEnum
CREATE TYPE "public"."NoticeTargetRole" AS ENUM ('all', 'student', 'faculty', 'hod', 'admin', 'finance_officer', 'librarian', 'management');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('UPI', 'NetBanking', 'CreditCard', 'DebitCard', 'Challan', 'DemandDraft');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('student', 'faculty', 'hod', 'admin', 'finance_officer', 'librarian', 'management');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('success', 'pending', 'failed', 'refunded');

-- CreateTable
CREATE TABLE "public"."AdmissionApplication" (
    "id" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "jeeRank" INTEGER,
    "gateRank" INTEGER,
    "category" TEXT NOT NULL,
    "quota" TEXT NOT NULL,
    "status" "public"."ApplicationStatus" NOT NULL DEFAULT 'pending',
    "appliedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttendanceRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "period" INTEGER NOT NULL,
    "status" "public"."AttendanceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Book" (
    "id" TEXT NOT NULL,
    "isbn" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "publisher" TEXT,
    "category" TEXT,
    "rackLocation" TEXT,
    "totalCopies" INTEGER NOT NULL DEFAULT 1,
    "availableCopies" INTEGER NOT NULL DEFAULT 1,
    "coverImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CirculationRecord" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3),
    "fineAmount" DOUBLE PRECISION DEFAULT 0,
    "status" "public"."CirculationStatus" NOT NULL DEFAULT 'issued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CirculationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Course" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "type" "public"."CourseType" NOT NULL DEFAULT 'theory',
    "description" TEXT,
    "faculty_instructor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headOfDepartmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExamResult" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "examinationId" TEXT,
    "internalScore" DOUBLE PRECISION,
    "endSemScore" DOUBLE PRECISION,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "grade" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Examination" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "academicYear" TEXT,
    "semester" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."ExamStatus" NOT NULL DEFAULT 'upcoming',
    "hallTicketReleased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Examination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExpenseRecord" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Faculty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "qualification" TEXT,
    "weeklyWorkloadHours" DOUBLE PRECISION DEFAULT 0,
    "leaveBalance" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeeStructure" (
    "id" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "quota" "public"."FeeQuota" NOT NULL DEFAULT 'general',
    "tuitionFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hostelFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "examFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "libraryDeposit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeeTransaction" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "public"."PaymentMethod",
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FineRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "circulationId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" "public"."FineStatus" NOT NULL DEFAULT 'unpaid',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FineRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LeaveRequest" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "public"."LeaveStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notice" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "public"."NoticeCategory" NOT NULL DEFAULT 'general',
    "targetRole" "public"."NoticeTargetRole" NOT NULL DEFAULT 'all',
    "department" TEXT,
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlacementRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyType" TEXT NOT NULL,
    "ctc" DOUBLE PRECISION NOT NULL,
    "offerDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ResearchGrant" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "awardedDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RolePermission" (
    "id" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Student" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "degree" TEXT,
    "semester" INTEGER NOT NULL DEFAULT 1,
    "batch" TEXT,
    "section" TEXT,
    "cgpa" DOUBLE PRECISION DEFAULT 0.0,
    "attendancePercentage" DOUBLE PRECISION DEFAULT 0.0,
    "feeStatus" "public"."FeeStatus" NOT NULL DEFAULT 'due',
    "feeQuota" "public"."FeeQuota" NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemActivity" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TimetableEntry" (
    "id" TEXT NOT NULL,
    "dayOfWeek" "public"."DayOfWeek" NOT NULL,
    "period" INTEGER NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'student',
    "phone" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionApplication_applicationId_key" ON "public"."AdmissionApplication"("applicationId" ASC);

-- CreateIndex
CREATE INDEX "AdmissionApplication_department_idx" ON "public"."AdmissionApplication"("department" ASC);

-- CreateIndex
CREATE INDEX "AdmissionApplication_program_idx" ON "public"."AdmissionApplication"("program" ASC);

-- CreateIndex
CREATE INDEX "AdmissionApplication_status_idx" ON "public"."AdmissionApplication"("status" ASC);

-- CreateIndex
CREATE INDEX "AttendanceRecord_courseId_idx" ON "public"."AttendanceRecord"("courseId" ASC);

-- CreateIndex
CREATE INDEX "AttendanceRecord_date_idx" ON "public"."AttendanceRecord"("date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_studentId_courseId_date_period_key" ON "public"."AttendanceRecord"("studentId" ASC, "courseId" ASC, "date" ASC, "period" ASC);

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentId_courseId_idx" ON "public"."AttendanceRecord"("studentId" ASC, "courseId" ASC);

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentId_idx" ON "public"."AttendanceRecord"("studentId" ASC);

-- CreateIndex
CREATE INDEX "Book_author_idx" ON "public"."Book"("author" ASC);

-- CreateIndex
CREATE INDEX "Book_category_idx" ON "public"."Book"("category" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Book_isbn_key" ON "public"."Book"("isbn" ASC);

-- CreateIndex
CREATE INDEX "CirculationRecord_bookId_idx" ON "public"."CirculationRecord"("bookId" ASC);

-- CreateIndex
CREATE INDEX "CirculationRecord_borrowerId_idx" ON "public"."CirculationRecord"("borrowerId" ASC);

-- CreateIndex
CREATE INDEX "CirculationRecord_borrowerId_status_idx" ON "public"."CirculationRecord"("borrowerId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "CirculationRecord_dueDate_idx" ON "public"."CirculationRecord"("dueDate" ASC);

-- CreateIndex
CREATE INDEX "CirculationRecord_status_idx" ON "public"."CirculationRecord"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_key" ON "public"."Course"("code" ASC);

-- CreateIndex
CREATE INDEX "Course_departmentId_idx" ON "public"."Course"("departmentId" ASC);

-- CreateIndex
CREATE INDEX "Course_departmentId_semester_idx" ON "public"."Course"("departmentId" ASC, "semester" ASC);

-- CreateIndex
CREATE INDEX "Course_semester_idx" ON "public"."Course"("semester" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "public"."Department"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Department_headOfDepartmentId_key" ON "public"."Department"("headOfDepartmentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "public"."Department"("name" ASC);

-- CreateIndex
CREATE INDEX "DocumentRequest_status_idx" ON "public"."DocumentRequest"("status" ASC);

-- CreateIndex
CREATE INDEX "DocumentRequest_studentId_idx" ON "public"."DocumentRequest"("studentId" ASC);

-- CreateIndex
CREATE INDEX "ExamResult_courseId_idx" ON "public"."ExamResult"("courseId" ASC);

-- CreateIndex
CREATE INDEX "ExamResult_examinationId_idx" ON "public"."ExamResult"("examinationId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ExamResult_studentId_courseId_examinationId_key" ON "public"."ExamResult"("studentId" ASC, "courseId" ASC, "examinationId" ASC);

-- CreateIndex
CREATE INDEX "ExamResult_studentId_idx" ON "public"."ExamResult"("studentId" ASC);

-- CreateIndex
CREATE INDEX "Examination_semester_idx" ON "public"."Examination"("semester" ASC);

-- CreateIndex
CREATE INDEX "Examination_status_idx" ON "public"."Examination"("status" ASC);

-- CreateIndex
CREATE INDEX "ExpenseRecord_category_idx" ON "public"."ExpenseRecord"("category" ASC);

-- CreateIndex
CREATE INDEX "ExpenseRecord_date_idx" ON "public"."ExpenseRecord"("date" ASC);

-- CreateIndex
CREATE INDEX "Faculty_departmentId_idx" ON "public"."Faculty"("departmentId" ASC);

-- CreateIndex
CREATE INDEX "Faculty_designation_idx" ON "public"."Faculty"("designation" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_employeeCode_key" ON "public"."Faculty"("employeeCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_userId_key" ON "public"."Faculty"("userId" ASC);

-- CreateIndex
CREATE INDEX "FeeStructure_program_idx" ON "public"."FeeStructure"("program" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FeeStructure_program_quota_key" ON "public"."FeeStructure"("program" ASC, "quota" ASC);

-- CreateIndex
CREATE INDEX "FeeTransaction_paidAt_idx" ON "public"."FeeTransaction"("paidAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FeeTransaction_receiptNumber_key" ON "public"."FeeTransaction"("receiptNumber" ASC);

-- CreateIndex
CREATE INDEX "FeeTransaction_status_idx" ON "public"."FeeTransaction"("status" ASC);

-- CreateIndex
CREATE INDEX "FeeTransaction_studentId_idx" ON "public"."FeeTransaction"("studentId" ASC);

-- CreateIndex
CREATE INDEX "FineRecord_circulationId_idx" ON "public"."FineRecord"("circulationId" ASC);

-- CreateIndex
CREATE INDEX "FineRecord_status_idx" ON "public"."FineRecord"("status" ASC);

-- CreateIndex
CREATE INDEX "FineRecord_userId_idx" ON "public"."FineRecord"("userId" ASC);

-- CreateIndex
CREATE INDEX "LeaveRequest_facultyId_idx" ON "public"."LeaveRequest"("facultyId" ASC);

-- CreateIndex
CREATE INDEX "LeaveRequest_fromDate_toDate_idx" ON "public"."LeaveRequest"("fromDate" ASC, "toDate" ASC);

-- CreateIndex
CREATE INDEX "LeaveRequest_status_idx" ON "public"."LeaveRequest"("status" ASC);

-- CreateIndex
CREATE INDEX "Notice_department_idx" ON "public"."Notice"("department" ASC);

-- CreateIndex
CREATE INDEX "Notice_isUrgent_idx" ON "public"."Notice"("isUrgent" ASC);

-- CreateIndex
CREATE INDEX "Notice_publishedAt_idx" ON "public"."Notice"("publishedAt" ASC);

-- CreateIndex
CREATE INDEX "Notice_targetRole_idx" ON "public"."Notice"("targetRole" ASC);

-- CreateIndex
CREATE INDEX "Permission_category_idx" ON "public"."Permission"("category" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "public"."Permission"("name" ASC);

-- CreateIndex
CREATE INDEX "PlacementRecord_companyName_idx" ON "public"."PlacementRecord"("companyName" ASC);

-- CreateIndex
CREATE INDEX "PlacementRecord_studentId_idx" ON "public"."PlacementRecord"("studentId" ASC);

-- CreateIndex
CREATE INDEX "ResearchGrant_awardedDate_idx" ON "public"."ResearchGrant"("awardedDate" ASC);

-- CreateIndex
CREATE INDEX "RolePermission_role_idx" ON "public"."RolePermission"("role" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_permissionId_key" ON "public"."RolePermission"("role" ASC, "permissionId" ASC);

-- CreateIndex
CREATE INDEX "Student_batch_idx" ON "public"."Student"("batch" ASC);

-- CreateIndex
CREATE INDEX "Student_departmentId_idx" ON "public"."Student"("departmentId" ASC);

-- CreateIndex
CREATE INDEX "Student_departmentId_semester_section_idx" ON "public"."Student"("departmentId" ASC, "semester" ASC, "section" ASC);

-- CreateIndex
CREATE INDEX "Student_feeStatus_idx" ON "public"."Student"("feeStatus" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Student_rollNumber_key" ON "public"."Student"("rollNumber" ASC);

-- CreateIndex
CREATE INDEX "Student_semester_idx" ON "public"."Student"("semester" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "public"."Student"("userId" ASC);

-- CreateIndex
CREATE INDEX "SystemActivity_timestamp_idx" ON "public"."SystemActivity"("timestamp" ASC);

-- CreateIndex
CREATE INDEX "TimetableEntry_courseId_idx" ON "public"."TimetableEntry"("courseId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TimetableEntry_dayOfWeek_period_facultyId_key" ON "public"."TimetableEntry"("dayOfWeek" ASC, "period" ASC, "facultyId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TimetableEntry_dayOfWeek_period_roomNumber_key" ON "public"."TimetableEntry"("dayOfWeek" ASC, "period" ASC, "roomNumber" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TimetableEntry_dayOfWeek_period_section_semester_department_key" ON "public"."TimetableEntry"("dayOfWeek" ASC, "period" ASC, "section" ASC, "semester" ASC, "departmentId" ASC);

-- CreateIndex
CREATE INDEX "TimetableEntry_departmentId_section_semester_idx" ON "public"."TimetableEntry"("departmentId" ASC, "section" ASC, "semester" ASC);

-- CreateIndex
CREATE INDEX "TimetableEntry_facultyId_idx" ON "public"."TimetableEntry"("facultyId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role" ASC);

-- AddForeignKey
ALTER TABLE "public"."AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CirculationRecord" ADD CONSTRAINT "CirculationRecord_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "public"."Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CirculationRecord" ADD CONSTRAINT "CirculationRecord_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Course" ADD CONSTRAINT "Course_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Course" ADD CONSTRAINT "Course_faculty_instructor_fkey" FOREIGN KEY ("faculty_instructor") REFERENCES "public"."Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_headOfDepartmentId_fkey" FOREIGN KEY ("headOfDepartmentId") REFERENCES "public"."Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentRequest" ADD CONSTRAINT "DocumentRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamResult" ADD CONSTRAINT "ExamResult_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamResult" ADD CONSTRAINT "ExamResult_examinationId_fkey" FOREIGN KEY ("examinationId") REFERENCES "public"."Examination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamResult" ADD CONSTRAINT "ExamResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Faculty" ADD CONSTRAINT "Faculty_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Faculty" ADD CONSTRAINT "Faculty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeeTransaction" ADD CONSTRAINT "FeeTransaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FineRecord" ADD CONSTRAINT "FineRecord_circulationId_fkey" FOREIGN KEY ("circulationId") REFERENCES "public"."CirculationRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FineRecord" ADD CONSTRAINT "FineRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeaveRequest" ADD CONSTRAINT "LeaveRequest_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "public"."Faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notice" ADD CONSTRAINT "Notice_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlacementRecord" ADD CONSTRAINT "PlacementRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Student" ADD CONSTRAINT "Student_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimetableEntry" ADD CONSTRAINT "TimetableEntry_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimetableEntry" ADD CONSTRAINT "TimetableEntry_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimetableEntry" ADD CONSTRAINT "TimetableEntry_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "public"."Faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);

