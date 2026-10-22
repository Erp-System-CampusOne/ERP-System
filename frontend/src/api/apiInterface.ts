/**
 * This file was automatically generated.
 * Do not modify it manually.
 */
/* eslint-disable @typescript-eslint/no-empty-object-type */


export interface User {
  id: string;
  campusId?: string;
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'hod' | 'admin' | 'finance_officer' | 'librarian' | 'analytics' | 'management' | 'examiner';
  department?: string;
  avatarUrl?: string;
  phone?: string;
}

export interface LoginInput {
  campusId?: string;
  identifier?: string;
  password: string;
  role?: 'student' | 'faculty' | 'hod' | 'admin' | 'finance_officer' | 'librarian' | 'analytics' | 'management' | 'examiner';
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresIn?: number;
}

export interface GenericStatusResponse {
  success: boolean;
  message: string;
}

export interface Student {
  id: string;
  campusId?: string;
  rollNumber: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  degree?: string;
  semester: number;
  batch?: string;
  section?: string;
  cgpa?: number;
  attendancePercentage?: number;
  feeStatus?: 'paid' | 'partial' | 'due';
  feeQuota?: 'general' | 'merit' | 'management' | 'nri';
  avatarUrl?: string;
}

export interface StudentInput {
  name: string;
  email: string;
  phone?: string;
  department: string;
  degree: string;
  feeQuota?: 'general' | 'merit' | 'management' | 'nri';
  semester: number;
  batch: string;
  section?: string;
}

export interface AttendanceRecord {
  id?: string;
  subjectCode: string;
  subjectName: string;
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  isShortage?: boolean;
}

export interface AttendanceSummary {
  studentId: string;
  overallPercentage: number;
  totalLectures?: number;
  attendedLectures?: number;
  shortageWarning?: boolean;
  records: AttendanceRecord[];
}

export interface AttendanceMarkInput {
  courseId: string;
  section: string;
  date: string;
  period: number;
  presentStudentIds: string[];
  absentStudentIds?: string[];
}

export interface AttendanceAggregateReport {
  averageAttendance: number;
  totalStudentsEnrolled: number;
  defaultersCount?: number;
  departmentAverages?: {
  department?: string;
  percentage?: number;
}[];
}

export interface SubjectGrade {
  subjectCode: string;
  subjectName: string;
  credits: number;
  internalMarks?: number;
  endSemMarks?: number;
  totalMarks?: number;
  grade: string;
  gradePoint: number;
}

export interface GradeCard {
  semester: number;
  academicYear?: string;
  sgpa: number;
  cgpa: number;
  totalCredits?: number;
  resultStatus?: 'PASS' | 'FAIL' | 'WITHHELD';
  subjects: SubjectGrade[];
}

export interface Faculty {
  id: string;
  campusId?: string;
  employeeCode: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  designation: string;
  qualification?: string;
  weeklyWorkloadHours?: number;
  leaveBalance?: number;
  avatarUrl?: string;
  courses?: number;
  workload?: number;
}

export interface FacultyInput {
  name: string;
  email: string;
  phone?: string;
  department: string;
  designation: string;
  qualification?: string;
}

export interface WorkloadAssignment {
  id?: string;
  courseCode: string;
  courseName: string;
  section: string;
  hoursPerWeek: number;
  roomNumber?: string;
  totalStudents?: number;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  department: string;
  departmentId?: string;
  semester: number;
  credits: number;
  type?: 'theory' | 'lab' | 'elective' | 'project';
  description?: string;
  facultyId?: string;
  facultyInstructor?: string;
  students?: number;
  faculty?: string;
}

/** Richer type returned only by GET /courses/:id — extends the list type. */
export interface CourseDetails extends Course {
  facultyEmail?: string | null;
  facultyDepartment?: string | null;
  facultyDesignation?: string | null;
}


export interface CourseInput {
  code: string;
  name: string;
  department?: string;
  departmentId?: string;
  semester: number;
  credits: number;
  type?: 'theory' | 'lab' | 'elective' | 'project';
  facultyId?: string;
  description?: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  headOfDepartment?: string;
  facultyCount?: number;
  studentCount?: number;
}

export interface DepartmentInput {
  code: string;
  name: string;
  headOfDepartment?: string;
}

export interface TimetableEntry {
  id?: string;
  courseId?: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  period: number;
  timeSlot: string;
  subjectCode: string;
  subjectName?: string;
  facultyName: string;
  roomNumber: string;
  subject?: string;
  faculty?: string;
  room?: string;
}

export interface TimetableGrid {
  section: string;
  semester: number;
  entries: TimetableEntry[];
}

export interface TimetableGenerateInput {
  department: string;
  semester: number;
  sections?: string[];
}

export interface Examination {
  id: string;
  title: string;
  academicYear?: string;
  semester?: number;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'evaluated';
  hallTicketReleased?: boolean;
}

export interface ExaminationInput {
  title: string;
  semester: number;
  startDate: string;
  endDate: string;
}

export interface ExamResult {
  id?: string;
  studentId: string;
  studentName?: string;
  rollNumber?: string;
  courseCode: string;
  internalScore?: number;
  endSemScore?: number;
  totalScore: number;
  grade: string;
}

export interface MarksSubmissionInput {
  courseCode: string;
  section?: string;
  results: {
  studentId: string;
  internalScore: number;
  endSemScore: number;
}[];
}

export interface FeeStructure {
  id: string;
  program: string;
  quota?: 'general' | 'merit' | 'management' | 'nri';
  tuitionFee?: number;
  hostelFee?: number;
  examFee?: number;
  libraryDeposit?: number;
  totalAmount: number;
  dueDate: string;
}

export interface FeeStructureInput {
  program: string;
  quota: 'general' | 'merit' | 'management' | 'nri';
  tuitionFee: number;
  hostelFee?: number;
  examFee?: number;
  libraryDeposit?: number;
  dueDate?: string;
}

export interface FeeTransaction {
  id: string;
  receiptNumber: string;
  studentId: string;
  studentName?: string;
  amount: number;
  paymentMethod?: 'UPI' | 'NetBanking' | 'CreditCard' | 'DebitCard' | 'Challan' | 'DemandDraft';
  status: 'success' | 'pending' | 'failed' | 'refunded';
  paidAt?: string | null;
  createdAt?: string;
  program?: string;
  quota?: 'general' | 'merit' | 'management' | 'nri';
}

export interface PaymentInput {
  studentId: string;
  amount: number;
  paymentMethod: 'UPI' | 'NetBanking' | 'CreditCard' | 'DebitCard' | 'Challan' | 'DemandDraft';
  transactionRef?: string;
}

export interface StudentFeeLedger {
  studentId: string;
  totalAnnualFee: number;
  totalPaid: number;
  dueBalance: number;
  status: 'paid' | 'partial' | 'due';
  transactions?: FeeTransaction[];
}

export interface FeeDefaulter {
  studentId: string;
  rollNumber?: string;
  name: string;
  department?: string;
  semester?: number;
  dueAmount: number;
  daysOverdue: number;
  parentPhone?: string;
}

export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher?: string;
  category?: string;
  rackLocation?: string;
  totalCopies?: number;
  availableCopies: number;
  coverImageUrl?: string;
}

export interface BookInput {
  isbn: string;
  title: string;
  author: string;
  category?: string;
  totalCopies: number;
  rackLocation?: string;
}

export interface CirculationRecord {
  id: string;
  bookId: string;
  bookTitle?: string;
  borrowerId: string;
  borrowerName?: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  fineAmount?: number;
  status: 'issued' | 'returned' | 'overdue';
}

export interface IssueBookInput {
  bookId: string;
  borrowerId: string;
  durationDays?: number;
}

export interface ReturnBookInput {
  circulationId: string;
  waiveFine?: boolean;
}

export interface FineRecord {
  id: string;
  userId: string;
  userName?: string;
  amount: number;
  reason?: string;
  status: 'unpaid' | 'paid' | 'waived';
  issuedAt?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  category?: 'academic' | 'examination' | 'events' | 'fee' | 'general';
  targetRole?: 'all' | 'student' | 'faculty' | 'hod';
  department?: string;
  publishedBy?: string;
  publishedAt: string;
  isUrgent?: boolean;
  isPinned?: boolean;
}

export interface NoticeInput {
  title: string;
  content: string;
  category: 'academic' | 'examination' | 'events' | 'fee' | 'general';
  targetRole?: 'all' | 'student' | 'faculty' | 'hod';
  department?: string;
  isUrgent?: boolean;
}

export interface InstitutionalMetrics {
  totalStudents: number;
  totalFaculty: number;
  facultyStudentRatio?: string;
  averageAttendance: number;
  totalFeeRevenue: number;
  feeCollectionRate?: number;
  placementRate?: number;
  nirfRankingScore?: number;
  naacGrade?: string;
  totalDepartments?: number;
  activeCourses?: number;
  totalResearchGrants?: number;
}

export interface AdmissionsMetrics {
  totalApplications: number;
  admittedStudents: number;
  acceptanceRate: number;
  genderRatio?: {
  male?: number;
  female?: number;
};
  programBreakdown?: { program: string; applications: number; admitted: number }[];
  statusBreakdown?: { status: string; count: number }[];
}

export interface AcademicMetrics {
  overallPassPercentage: number;
  medianCGPA: number;
  backlogRate?: number;
  departmentPassRates?: {
  department?: string;
  passRate?: number;
}[];
  cgpaDistribution?: { range: string; students: number }[];
  backlogBySemester?: { semester: string; backlogs: number }[];
  toppers?: { name: string; cgpa: number; department: string }[];
}

export interface PlacementMetrics {
  placementPercentage: number;
  averageCTC: number;
  highestCTC: number;
  topRecruiters?: { name: string; offers: number; averageCTC: number }[];
  totalOffers: number;
  ctcDistribution?: { range: string; students: number }[];
  companyTypeDistribution?: { type: string; count: number }[];
  placementTrend?: { year: string; placed: number; offers: number }[];
}

export type LoginUserOutput = AuthResponse;

export interface LoginUserInput extends LoginInput {}

export type LogoutUserOutput = GenericStatusResponse;

export interface LogoutUserInput {}

export type GetCurrentUserOutput = User;

export interface GetCurrentUserInput {}

export type GetStudentsOutput = Student[];

export interface GetStudentsInput {
  department?: string;
  semester?: number;
  batch?: string;
  search?: string;
}

export type CreateStudentOutput = Student;

export interface CreateStudentInput extends StudentInput {}

export type GetStudentByIdOutput = Student;

export interface GetStudentByIdInput {
  id: string;
}

export type UpdateStudentOutput = Student;

export interface UpdateStudentInput extends StudentInput {
  id: string;
}

export type GetStudentAttendanceOutput = AttendanceSummary;

export interface GetStudentAttendanceInput {
  id: string;
  semester?: number;
}

export type GetStudentGradesOutput = GradeCard[];

export interface GetStudentGradesInput {
  id: string;
}

export type GetStudentFeesOutput = StudentFeeLedger;

export interface GetStudentFeesInput {
  id: string;
}

export interface DocumentRequestResponse {
  id: string;
  studentId: string;
  documentName: string;
  status: string;
  documentUrl?: string;
  purpose?: string;
  rejectionReason?: string;
  reviewer?: { id: string; name: string; role: string };
  requestedAt: string;
  updatedAt: string;
}

export type GetStudentDocumentsOutput = DocumentRequestResponse[];

export interface GetStudentDocumentsInput {
  id: string;
}

export type GetFacultyListOutput = Faculty[];

export interface GetFacultyListInput {
  department?: string;
  designation?: string;
}

export type CreateFacultyOutput = Faculty;

export interface CreateFacultyInput extends FacultyInput {}

export type GetFacultyByIdOutput = Faculty;

export interface GetFacultyByIdInput {
  id: string;
}

export type UpdateFacultyOutput = Faculty;

export interface UpdateFacultyInput extends FacultyInput {
  id: string;
}

export type GetFacultyWorkloadOutput = WorkloadAssignment[];

export interface GetFacultyWorkloadInput {
  id: string;
}

export type MarkAttendanceOutput = GenericStatusResponse;

export interface MarkAttendanceInput extends AttendanceMarkInput {}

export type GetAttendanceReportOutput = AttendanceAggregateReport;

export interface GetAttendanceReportInput {
  department?: string;
  semester?: number;
  date?: string;
}

export type GetCoursesOutput = Course[];

export interface GetCoursesInput {
  department?: string;
  semester?: number;
}

export type CreateCourseOutput = Course;

export interface CreateCourseInput extends CourseInput {}

export type GetCourseByIdOutput = CourseDetails;

export interface GetCourseByIdInput {
  id: string;
}

export type UpdateCourseOutput = Course;

export interface UpdateCourseInput extends CourseInput {
  id: string;
}

export type GetDepartmentsOutput = Department[];

export interface GetDepartmentsInput {}

export type CreateDepartmentOutput = Department;

export interface CreateDepartmentInput extends DepartmentInput {}

export type GetTimetablesOutput = TimetableGrid;

export interface GetTimetablesInput {
  department?: string;
  semester?: number;
  section?: string;
  facultyId?: string;
}

export type GenerateTimetableOutput = TimetableGrid;

export interface GenerateTimetableInput extends TimetableGenerateInput {}

export type GetExaminationsOutput = Examination[];

export interface GetExaminationsInput {
  semester?: number;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'evaluated';
}

export type CreateExaminationOutput = Examination;

export interface CreateExaminationInput extends ExaminationInput {}

export type GetExamResultsOutput = ExamResult[];

export interface GetExamResultsInput {
  id: string;
  department?: string;
}

export type SubmitExamResultsOutput = GenericStatusResponse;

export interface SubmitExamResultsInput extends MarksSubmissionInput {
  id: string;
}

export type GetFeeStructuresOutput = FeeStructure[];

export interface GetFeeStructuresInput {}

export type CreateFeeStructureOutput = FeeStructure;

export interface CreateFeeStructureInput extends FeeStructureInput {}

export type GetFeeTransactionsOutput = FeeTransaction[];

export interface GetFeeTransactionsInput {
  studentId?: string;
  status?: 'success' | 'pending' | 'failed' | 'refunded';
}

export type RecordFeePaymentOutput = FeeTransaction;

export interface RecordFeePaymentInput extends PaymentInput {}

export interface UpdateFeeTransactionStatusInput {
  id: string;
  status: 'success' | 'failed' | 'refunded';
}

export type GetFeeDefaultersOutput = FeeDefaulter[];

export interface GetFeeDefaultersInput {
  department?: string;
  semester?: number;
}

export type GetLibraryBooksOutput = Book[];

export interface GetLibraryBooksInput {
  search?: string;
  category?: string;
  availableOnly?: boolean;
}

export type CreateLibraryBookOutput = Book;

export interface CreateLibraryBookInput extends BookInput {}

export type IssueLibraryBookOutput = CirculationRecord;

export interface IssueLibraryBookInput extends IssueBookInput {}

export type ReturnLibraryBookOutput = CirculationRecord;

export interface ReturnLibraryBookInput extends ReturnBookInput {}

export type GetLibraryFinesOutput = FineRecord[];

export interface GetLibraryFinesInput {
  userId?: string;
}

export type GetNoticesOutput = Notice[];

export interface GetNoticesInput {
  targetRole?: string;
  department?: string;
}

export type CreateNoticeOutput = Notice;

export interface CreateNoticeInput extends NoticeInput {}

export type GetInstitutionalOverviewOutput = InstitutionalMetrics;

export interface GetInstitutionalOverviewInput {}

export type GetAdmissionsAnalyticsOutput = AdmissionsMetrics;

export interface GetAdmissionsAnalyticsInput {}

export type GetAcademicPerformanceAnalyticsOutput = AcademicMetrics;

export interface GetAcademicPerformanceAnalyticsInput {}

export type GetPlacementAnalyticsOutput = PlacementMetrics;

export interface GetPlacementAnalyticsInput {}

export interface CampusOneCollegeERPPlatformAPI {
  loginUser: {
    description: "Unified login with roll number/employee ID, password, or magic link";
    input: LoginUserInput;
    response: LoginUserOutput;
  };
  logoutUser: {
    description: "Logout current user session and invalidate token";
    input: LogoutUserInput;
    response: LogoutUserOutput;
  };
  getCurrentUser: {
    description: "Get authenticated user profile and assigned roles";
    input: GetCurrentUserInput;
    response: GetCurrentUserOutput;
  };
  getStudents: {
    description: "List all students with department and semester filters";
    input: GetStudentsInput;
    response: GetStudentsOutput;
  };
  createStudent: {
    description: "Enroll a new student profile";
    input: CreateStudentInput;
    response: CreateStudentOutput;
  };
  getStudentById: {
    description: "Get student details by ID or Roll Number";
    input: GetStudentByIdInput;
    response: GetStudentByIdOutput;
  };
  updateStudent: {
    description: "Update student information";
    input: UpdateStudentInput;
    response: UpdateStudentOutput;
  };
  getStudentAttendance: {
    description: "Get student subject-wise attendance logs and summary";
    input: GetStudentAttendanceInput;
    response: GetStudentAttendanceOutput;
  };
  getStudentGrades: {
    description: "Get student marks, SGPA, CGPA, and grade cards";
    input: GetStudentGradesInput;
    response: GetStudentGradesOutput;
  };
  getStudentFees: {
    description: "Get student fee dues, ledger, and payment receipts";
    input: GetStudentFeesInput;
    response: GetStudentFeesOutput;
  };
  getStudentDocuments: {
    description: "Get student document requests";
    input: GetStudentDocumentsInput;
    response: GetStudentDocumentsOutput;
  };
  getFacultyList: {
    description: "List all faculty and staff members";
    input: GetFacultyListInput;
    response: GetFacultyListOutput;
  };
  createFaculty: {
    description: "Create new faculty profile";
    input: CreateFacultyInput;
    response: CreateFacultyOutput;
  };
  getFacultyById: {
    description: "Get faculty profile details by ID";
    input: GetFacultyByIdInput;
    response: GetFacultyByIdOutput;
  };
  updateFaculty: {
    description: "Update faculty profile";
    input: UpdateFacultyInput;
    response: UpdateFacultyOutput;
  };
  getFacultyWorkload: {
    description: "Get faculty teaching workload and lecture schedule";
    input: GetFacultyWorkloadInput;
    response: GetFacultyWorkloadOutput;
  };
  markAttendance: {
    description: "Submit class lecture/lab attendance record";
    input: MarkAttendanceInput;
    response: MarkAttendanceOutput;
  };
  getAttendanceReport: {
    description: "Get institutional and departmental attendance analysis";
    input: GetAttendanceReportInput;
    response: GetAttendanceReportOutput;
  };
  getCourses: {
    description: "List all academic courses and subject curriculum";
    input: GetCoursesInput;
    response: GetCoursesOutput;
  };
  createCourse: {
    description: "Create or register a new subject course";
    input: CreateCourseInput;
    response: CreateCourseOutput;
  };
  getCourseById: {
    description: "Get subject course details and syllabus outline";
    input: GetCourseByIdInput;
    response: GetCourseByIdOutput;
  };
  updateCourse: {
    description: "Update course syllabus and credits";
    input: UpdateCourseInput;
    response: UpdateCourseOutput;
  };
  getDepartments: {
    description: "List all academic departments";
    input: GetDepartmentsInput;
    response: GetDepartmentsOutput;
  };
  createDepartment: {
    description: "Create academic department";
    input: CreateDepartmentInput;
    response: CreateDepartmentOutput;
  };
  getTimetables: {
    description: "Get timetable grid for section, faculty, or room";
    input: GetTimetablesInput;
    response: GetTimetablesOutput;
  };
  generateTimetable: {
    description: "Generate or save conflict-free timetable matrix";
    input: GenerateTimetableInput;
    response: GenerateTimetableOutput;
  };
  getExaminations: {
    description: "List examination schedules and sessions";
    input: GetExaminationsInput;
    response: GetExaminationsOutput;
  };
  createExamination: {
    description: "Create examination schedule and invigilation duties";
    input: CreateExaminationInput;
    response: CreateExaminationOutput;
  };
  getExamResults: {
    description: "Get examination marks and grading results";
    input: GetExamResultsInput;
    response: GetExamResultsOutput;
  };
  submitExamResults: {
    description: "Submit or approve examination student marks";
    input: SubmitExamResultsInput;
    response: SubmitExamResultsOutput;
  };
  getFeeStructures: {
    description: "List fee structures by department and quota category";
    input: GetFeeStructuresInput;
    response: GetFeeStructuresOutput;
  };
  createFeeStructure: {
    description: "Define fee structure schedule";
    input: CreateFeeStructureInput;
    response: CreateFeeStructureOutput;
  };
  getFeeTransactions: {
    description: "Get fee collection payment transactions and receipts";
    input: GetFeeTransactionsInput;
    response: GetFeeTransactionsOutput;
  };
  recordFeePayment: {
    description: "Record online or offline fee payment receipt";
    input: RecordFeePaymentInput;
    response: RecordFeePaymentOutput;
  };
  getFeeDefaulters: {
    description: "List fee defaulters and outstanding dues by batch";
    input: GetFeeDefaultersInput;
    response: GetFeeDefaultersOutput;
  };
  getLibraryBooks: {
    description: "Search library book catalog and availability";
    input: GetLibraryBooksInput;
    response: GetLibraryBooksOutput;
  };
  createLibraryBook: {
    description: "Add new book title to library inventory";
    input: CreateLibraryBookInput;
    response: CreateLibraryBookOutput;
  };
  issueLibraryBook: {
    description: "Issue library book to student or faculty";
    input: IssueLibraryBookInput;
    response: IssueLibraryBookOutput;
  };
  returnLibraryBook: {
    description: "Return library book and assess late fines";
    input: ReturnLibraryBookInput;
    response: ReturnLibraryBookOutput;
  };
  getLibraryFines: {
    description: "Get outstanding and paid library fine records";
    input: GetLibraryFinesInput;
    response: GetLibraryFinesOutput;
  };
  getNotices: {
    description: "Get campus announcements, circulars, and notices";
    input: GetNoticesInput;
    response: GetNoticesOutput;
  };
  createNotice: {
    description: "Broadcast new notice or campus alert";
    input: CreateNoticeInput;
    response: CreateNoticeOutput;
  };
  getInstitutionalOverview: {
    description: "Get executive institutional overview KPIs and accreditation scorecard";
    input: GetInstitutionalOverviewInput;
    response: GetInstitutionalOverviewOutput;
  };
  getAdmissionsAnalytics: {
    description: "Get admissions funnel conversion metrics and demographics";
    input: GetAdmissionsAnalyticsInput;
    response: GetAdmissionsAnalyticsOutput;
  };
  getAcademicPerformanceAnalytics: {
    description: "Get department pass percentages, CGPA distribution, and trends";
    input: GetAcademicPerformanceAnalyticsInput;
    response: GetAcademicPerformanceAnalyticsOutput;
  };

  getPlacementAnalytics: {
    description: "Get campus recruitment records, top recruiters, and CTC packages";
    input: GetPlacementAnalyticsInput;
    response: GetPlacementAnalyticsOutput;
  };
  getSystemActivity: {
    description: "Get recent system activity logs";
    input: Record<string, never>;
    response: GetSystemActivityOutput;
  };
  getFinancialHealthAnalytics: {
    description: "Get financial health including expenses, budget, and grants";
    input: Record<string, never>;
    response: GetFinancialHealthAnalyticsOutput;
  };
}

export interface SystemActivity {
  id: string;
  action: string;
  description: string;
  type: string;
  timestamp: string;
}

export type GetSystemActivityOutput = SystemActivity[];

export interface FinancialHealthAnalytics {
  expenseBreakdown: { name: string; value: number }[];
  budgetUtilization: { department: string; utilized: number; allocated: number }[];
  totalGrants: number;
}

export type GetFinancialHealthAnalyticsOutput = FinancialHealthAnalytics;
