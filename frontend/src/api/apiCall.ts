/* eslint-disable */
/**
 * This file was automatically generated.
 * Do not modify it manually.
 */

import {
  LoginUserInput,
  LoginUserOutput,
  LogoutUserInput,
  LogoutUserOutput,
  GetCurrentUserInput,
  GetCurrentUserOutput,
  GetStudentsInput,
  GetStudentsOutput,
  CreateStudentInput,
  CreateStudentOutput,
  GetStudentByIdInput,
  GetStudentByIdOutput,
  UpdateStudentInput,
  UpdateStudentOutput,
  GetStudentAttendanceInput,
  GetStudentAttendanceOutput,
  GetStudentGradesInput,
  GetStudentGradesOutput,
  GetStudentFeesInput,
  GetStudentFeesOutput,
  GetStudentDocumentsInput,
  GetStudentDocumentsOutput,
  GetFacultyListInput,
  GetFacultyListOutput,
  CreateFacultyInput,
  CreateFacultyOutput,
  GetFacultyByIdInput,
  GetFacultyByIdOutput,
  UpdateFacultyInput,
  UpdateFacultyOutput,
  GetFacultyWorkloadInput,
  GetFacultyWorkloadOutput,
  MarkAttendanceInput,
  MarkAttendanceOutput,
  GetAttendanceReportInput,
  GetAttendanceReportOutput,
  GetCoursesInput,
  GetCoursesOutput,
  CreateCourseInput,
  CreateCourseOutput,
  GetCourseByIdInput,
  GetCourseByIdOutput,
  UpdateCourseInput,
  UpdateCourseOutput,
  GetDepartmentsInput,
  GetDepartmentsOutput,
  CreateDepartmentInput,
  CreateDepartmentOutput,
  Department,
  DepartmentInput,
  GetTimetablesInput,
  GetTimetablesOutput,
  GenerateTimetableInput,
  GenerateTimetableOutput,
  GetExaminationsInput,
  GetExaminationsOutput,
  CreateExaminationInput,
  CreateExaminationOutput,
  GetExamResultsInput,
  GetExamResultsOutput,
  SubmitExamResultsInput,
  SubmitExamResultsOutput,
  GetFeeStructuresInput,
  GetFeeStructuresOutput,
  CreateFeeStructureInput,
  CreateFeeStructureOutput,
  GetFeeTransactionsInput,
  GetFeeTransactionsOutput,
  RecordFeePaymentInput,
  RecordFeePaymentOutput,
  UpdateFeeTransactionStatusInput,
  FeeTransaction,
  GetFeeDefaultersInput,
  GetFeeDefaultersOutput,
  GetLibraryBooksInput,
  GetLibraryBooksOutput,
  CreateLibraryBookInput,
  CreateLibraryBookOutput,
  IssueLibraryBookInput,
  IssueLibraryBookOutput,
  ReturnLibraryBookInput,
  ReturnLibraryBookOutput,
  GetLibraryFinesInput,
  GetLibraryFinesOutput,
  GetNoticesInput,
  GetNoticesOutput,
  CreateNoticeInput,
  CreateNoticeOutput,
  GetInstitutionalOverviewInput,
  GetInstitutionalOverviewOutput,
  GetAdmissionsAnalyticsInput,
  GetAdmissionsAnalyticsOutput,
  GetAcademicPerformanceAnalyticsInput,
  GetAcademicPerformanceAnalyticsOutput,
  GetPlacementAnalyticsInput,
  GetPlacementAnalyticsOutput,
  GetSystemActivityOutput,
  GetFinancialHealthAnalyticsOutput
} from './apiInterface';

export class ApiProtocolError extends Error {
  status: number;
  contentType: string | null;
  operationId?: string;
  constructor(message: string, status: number, contentType: string | null, operationId?: string) {
    super(message);
    this.name = 'ApiProtocolError';
    this.status = status;
    this.contentType = contentType;
    this.operationId = operationId;
  }
}

// Runtime configuration for API client
const getInitialBaseUrl = (): string => {
  try {
    const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
    if (meta && meta.env) {
      if (meta.env.VITE_API_BASE_URL) return meta.env.VITE_API_BASE_URL;
      if (meta.env.VITE_API_URL) return meta.env.VITE_API_URL;
    }
  } catch {}
  try {
    const g = globalThis as typeof globalThis & {
      process?: {
        env?: Record<string, string | undefined>;
      };
    };
    if (g && g.process && g.process.env) {
      if (g.process.env.VITE_API_BASE_URL) return g.process.env.VITE_API_BASE_URL;
      if (g.process.env.NEXT_PUBLIC_API_URL) return g.process.env.NEXT_PUBLIC_API_URL;
      if (g.process.env.VITE_API_URL) return g.process.env.VITE_API_URL;
    }
  } catch {}
  return '';
};

export let apiConfig = {
  baseUrl: getInitialBaseUrl(),
  headers: {} as Record<string, string>,
};

export const setApiConfig = (config: Partial<typeof apiConfig>) => {
  apiConfig = { ...apiConfig, ...config };
};

async function request<T>(options: {
  operationId: string;
  method: string;
  path: string;
  input?: any;
  pathParams: string[];
  queryParams: string[];
  headerParams: string[];
}): Promise<T> {
  const { operationId, method, path, input = {}, pathParams, queryParams, headerParams } = options;

  // 1. Resolve path parameters
  let urlPath = path;
  pathParams.forEach(param => {
    if (input[param] !== undefined) {
      urlPath = urlPath.replace(`{${param}}`, encodeURIComponent(String(input[param])));
    }
  });

  // 2. Build query parameters
  const query = new URLSearchParams();
  queryParams.forEach(param => {
      if (input[param] !== undefined) {
        if (Array.isArray(input[param])) {
          input[param].forEach((val: unknown) => query.append(param, String(val)));
        } else {
          query.append(param, String(input[param]));
        }
      }
  });

  const queryString = query.toString();
  const url = `${apiConfig.baseUrl}${urlPath}${queryString ? `?${queryString}` : ''}`;

  // 3. Collect headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...apiConfig.headers,
  };

  headerParams.forEach(param => {
    if (input[param] !== undefined) {
      headers[param] = String(input[param]);
    }
  });

  // 4. Construct request body
  let body: BodyInit | undefined;
  if (!['GET', 'HEAD'].includes(method)) {
    if (input.body !== undefined) {
      body = JSON.stringify(input.body);
    } else {
      const bodyObj: Record<string, unknown> = {};
      let hasBodyKeys = false;
      const paramKeys = new Set([...pathParams, ...queryParams, ...headerParams]);
      Object.keys(input).forEach(key => {
        if (!paramKeys.has(key) && key !== 'body') {
          bodyObj[key] = input[key];
          hasBodyKeys = true;
        }
      });
      if (hasBodyKeys) {
        body = JSON.stringify(bodyObj);
      }
    }
  }

  // 5. Execute fetch
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    method,
    headers,
    body,
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    let errText = '';
    try { errText = await response.text(); } catch {}
    throw new ApiProtocolError(`API Error [${operationId}]: ${response.status} ${response.statusText}${errText ? ` - ${errText.slice(0, 200)}` : ''}`, response.status, contentType, operationId);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    if (contentType && (contentType.includes('text/html') || contentType.includes('text/plain'))) {
      throw new ApiProtocolError(`API Protocol Error [${operationId}]: Expected JSON response but received content-type '${contentType}'`, response.status, contentType, operationId);
    }
    return text as unknown as T;
  }
}

export const loginUser = async (input: LoginUserInput): Promise<LoginUserOutput> => {
  return request<LoginUserOutput>({
    operationId: 'loginUser',
    method: 'POST',
    path: '/auth/login',
    input: input,
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const logoutUser = async (_input?: LogoutUserInput): Promise<LogoutUserOutput> => {
  return request<LogoutUserOutput>({
    operationId: 'logoutUser',
    method: 'POST',
    path: '/auth/logout',
    input: {},
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const getCurrentUser = async (_input?: GetCurrentUserInput): Promise<GetCurrentUserOutput> => {
  return request<GetCurrentUserOutput>({
    operationId: 'getCurrentUser',
    method: 'GET',
    path: '/auth/me',
    input: {},
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const getStudents = async (input: GetStudentsInput): Promise<GetStudentsOutput> => {
  return request<GetStudentsOutput>({
    operationId: 'getStudents',
    method: 'GET',
    path: '/students',
    input: input,
    pathParams: [],
    queryParams: ["department","semester","batch","search"],
    headerParams: []
  });
};

export const createStudent = async (input: CreateStudentInput): Promise<CreateStudentOutput> => {
  return request<CreateStudentOutput>({
    operationId: 'createStudent',
    method: 'POST',
    path: '/students',
    input: input,
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const getStudentById = async (input: GetStudentByIdInput): Promise<GetStudentByIdOutput> => {
  return request<GetStudentByIdOutput>({
    operationId: 'getStudentById',
    method: 'GET',
    path: '/students/{id}',
    input: input,
    pathParams: ["id"],
    queryParams: [],
    headerParams: []
  });
};

export const updateStudent = async (input: UpdateStudentInput): Promise<UpdateStudentOutput> => {
  return request<UpdateStudentOutput>({
    operationId: 'updateStudent',
    method: 'PUT',
    path: '/students/{id}',
    input: input,
    pathParams: ["id"],
    queryParams: [],
    headerParams: []
  });
};

export const getStudentAttendance = async (input: GetStudentAttendanceInput): Promise<GetStudentAttendanceOutput> => {
  return request<GetStudentAttendanceOutput>({
    operationId: 'getStudentAttendance',
    method: 'GET',
    path: '/students/{id}/attendance',
    input: input,
    pathParams: ["id"],
    queryParams: ["semester"],
    headerParams: []
  });
};

export const getStudentGrades = async (input: GetStudentGradesInput): Promise<GetStudentGradesOutput> => {
  return request<GetStudentGradesOutput>({
    operationId: 'getStudentGrades',
    method: 'GET',
    path: '/students/{id}/grades',
    input: input,
    pathParams: ["id"],
    queryParams: [],
    headerParams: []
  });
};

export const getStudentFees = async (input: GetStudentFeesInput): Promise<GetStudentFeesOutput> => {
  return request<GetStudentFeesOutput>({
    operationId: 'getStudentFees',
    method: 'GET',
    path: '/students/{id}/fees',
    input: input,
    pathParams: ["id"],
    queryParams: [],
    headerParams: []
  });
};

export const getStudentDocuments = async (input: GetStudentDocumentsInput): Promise<GetStudentDocumentsOutput> => {
  return request<GetStudentDocumentsOutput>({
    operationId: 'getStudentDocuments',
    method: 'GET',
    path: '/students/{id}/documents',
    input: input,
    pathParams: ["id"],
    queryParams: [],
    headerParams: []
  });
};

export const getFacultyList = async (input: GetFacultyListInput): Promise<GetFacultyListOutput> => {
  return request<GetFacultyListOutput>({
    operationId: 'getFacultyList',
    method: 'GET',
    path: '/faculty',
    input: input,
    pathParams: [],
    queryParams: ["department","designation"],
    headerParams: []
  });
};

export const createFaculty = async (input: CreateFacultyInput): Promise<CreateFacultyOutput> => {
  return request<CreateFacultyOutput>({
    operationId: 'createFaculty',
    method: 'POST',
    path: '/faculty',
    input: input,
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const getFacultyById = async (input: GetFacultyByIdInput): Promise<GetFacultyByIdOutput> => {
  return request<GetFacultyByIdOutput>({
    operationId: 'getFacultyById',
    method: 'GET',
    path: '/faculty/{id}',
    input: input,
    pathParams: ["id"],
    queryParams: [],
    headerParams: []
  });
};

export const updateFaculty = async (input: UpdateFacultyInput): Promise<UpdateFacultyOutput> => {
  return request<UpdateFacultyOutput>({
    operationId: 'updateFaculty',
    method: 'PUT',
    path: '/faculty/{id}',
    input: input,
    pathParams: ["id"],
    queryParams: [],
    headerParams: []
  });
};

export const getFacultyWorkload = async (input: GetFacultyWorkloadInput): Promise<GetFacultyWorkloadOutput> => {
  return request<GetFacultyWorkloadOutput>({
    operationId: 'getFacultyWorkload',
    method: 'GET',
    path: '/faculty/{id}/workload',
    input: input,
    pathParams: ["id"],
    queryParams: [],
    headerParams: []
  });
};

export const markAttendance = async (input: MarkAttendanceInput): Promise<MarkAttendanceOutput> => {
  return request<MarkAttendanceOutput>({
    operationId: 'markAttendance',
    method: 'POST',
    path: '/attendance/mark',
    input: input,
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const getAttendanceReport = async (input: GetAttendanceReportInput): Promise<GetAttendanceReportOutput> => {
  return request<GetAttendanceReportOutput>({
    operationId: 'getAttendanceReport',
    method: 'GET',
    path: '/attendance/report',
    input: input,
    pathParams: [],
    queryParams: ["department","semester","date"],
    headerParams: []
  });
};

export const getCourses = async (input: GetCoursesInput): Promise<GetCoursesOutput> => {
  return request<GetCoursesOutput>({
    operationId: 'getCourses',
    method: 'GET',
    path: '/courses',
    input: input,
    pathParams: [],
    queryParams: ["department","semester"],
    headerParams: []
  });
};

export const createCourse = async (input: CreateCourseInput): Promise<CreateCourseOutput> => {
  return request<CreateCourseOutput>({
    operationId: 'createCourse',
    method: 'POST',
    path: '/courses',
    input: input,
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const getCourseById = async (input: GetCourseByIdInput): Promise<GetCourseByIdOutput> => {
  return request<GetCourseByIdOutput>({
    operationId: 'getCourseById',
    method: 'GET',
    path: '/courses/{id}',
    input: input,
    pathParams: ["id"],
    queryParams: [],
    headerParams: []
  });
};

export const updateCourse = async (input: UpdateCourseInput): Promise<UpdateCourseOutput> => {
  return request<UpdateCourseOutput>({
    operationId: 'updateCourse',
    method: 'PUT',
    path: '/courses/{id}',
    input: input,
    pathParams: ["id"],
    queryParams: [],
    headerParams: []
  });
};

export const getDepartments = async (_input?: GetDepartmentsInput): Promise<GetDepartmentsOutput> => {
  return request<GetDepartmentsOutput>({
    operationId: 'getDepartments',
    method: 'GET',
    path: '/departments',
    input: {},
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const createDepartment = async (input: CreateDepartmentInput): Promise<CreateDepartmentOutput> => {
  return request<CreateDepartmentOutput>({
    operationId: 'createDepartment',
    method: 'POST',
    path: '/departments',
    input: input,
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const updateDepartment = async (id: string, input: any): Promise<Department> => request<Department>({ operationId: 'updateDepartment', method: 'PUT', path: `/departments/${id}`, input, pathParams: [], queryParams: [], headerParams: [] });
export const deleteDepartment = async (id: string): Promise<void> => request<void>({ operationId: 'deleteDepartment', method: 'DELETE', path: `/departments/${id}`, input: {}, pathParams: [], queryParams: [], headerParams: [] });

export const getTimetables = async (input: GetTimetablesInput): Promise<GetTimetablesOutput> => {
  return request<GetTimetablesOutput>({
    operationId: 'getTimetables',
    method: 'GET',
    path: '/academics/timetable',
    input: input,
    pathParams: [],
    queryParams: ["department","semester","section","facultyId"],
    headerParams: []
  });
};

export const generateTimetable = async (input: GenerateTimetableInput): Promise<GenerateTimetableOutput> => {
  return request<GenerateTimetableOutput>({
    operationId: 'generateTimetable',
    method: 'POST',
    path: '/academics/timetable/generate',
    input: input,
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const getExaminations = async (input: GetExaminationsInput): Promise<GetExaminationsOutput> => {
  return request<GetExaminationsOutput>({
    operationId: 'getExaminations',
    method: 'GET',
    path: '/examinations',
    input: input,
    pathParams: [],
    queryParams: ["semester","status"],
    headerParams: []
  });
};

export const createExamination = async (input: CreateExaminationInput): Promise<CreateExaminationOutput> => {
  return request<CreateExaminationOutput>({
    operationId: 'createExamination',
    method: 'POST',
    path: '/examinations',
    input: input,
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const getExamResults = async (input: GetExamResultsInput): Promise<GetExamResultsOutput> => {
  return request<GetExamResultsOutput>({
    operationId: 'getExamResults',
    method: 'GET',
    path: '/examinations/{id}/results',
    input: input,
    pathParams: ["id"],
    queryParams: ["department"],
    headerParams: []
  });
};

export const submitExamResults = async (input: SubmitExamResultsInput): Promise<SubmitExamResultsOutput> => {
  return request<SubmitExamResultsOutput>({
    operationId: 'submitExamResults',
    method: 'POST',
    path: '/examinations/{id}/results',
    input: input,
    pathParams: ["id"],
    queryParams: [],
    headerParams: []
  });
};

export const getFeeStructures = async (_input?: GetFeeStructuresInput): Promise<GetFeeStructuresOutput> => {
  return request<GetFeeStructuresOutput>({
    operationId: 'getFeeStructures',
    method: 'GET',
    path: '/fees/structures',
    input: {},
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const createFeeStructure = async (input: CreateFeeStructureInput): Promise<CreateFeeStructureOutput> => {
  return request<CreateFeeStructureOutput>({
    operationId: 'createFeeStructure',
    method: 'POST',
    path: '/fees/structures',
    input: input,
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const getFeeTransactions = async (input: GetFeeTransactionsInput): Promise<GetFeeTransactionsOutput> => {
  return request<GetFeeTransactionsOutput>({
    operationId: 'getFeeTransactions',
    method: 'GET',
    path: '/fees/transactions',
    input: input,
    pathParams: [],
    queryParams: ["studentId","status"],
    headerParams: []
  });
};

export const recordFeePayment = async (input: RecordFeePaymentInput): Promise<RecordFeePaymentOutput> => {
  return request<RecordFeePaymentOutput>({
    operationId: 'recordFeePayment',
    method: 'POST',
    path: '/fees/transactions',
    input: input,
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const updateFeeTransactionStatus = async (input: UpdateFeeTransactionStatusInput): Promise<FeeTransaction> => {
  return request<FeeTransaction>({
    operationId: 'updateFeeTransactionStatus',
    method: 'PATCH',
    path: '/fees/transactions/{id}/status',
    input,
    pathParams: ['id'],
    queryParams: [],
    headerParams: [],
  });
};

export const getFeeDefaulters = async (input: GetFeeDefaultersInput): Promise<GetFeeDefaultersOutput> => {
  return request<GetFeeDefaultersOutput>({
    operationId: 'getFeeDefaulters',
    method: 'GET',
    path: '/fees/defaulters',
    input: input,
    pathParams: [],
    queryParams: ["department","semester"],
    headerParams: []
  });
};

export const getLibraryBooks = async (input: GetLibraryBooksInput): Promise<GetLibraryBooksOutput> => {
  return request<GetLibraryBooksOutput>({
    operationId: 'getLibraryBooks',
    method: 'GET',
    path: '/library/books',
    input: input,
    pathParams: [],
    queryParams: ["search","category","availableOnly"],
    headerParams: []
  });
};

export const createLibraryBook = async (input: CreateLibraryBookInput): Promise<CreateLibraryBookOutput> => {
  return request<CreateLibraryBookOutput>({
    operationId: 'createLibraryBook',
    method: 'POST',
    path: '/library/books',
    input: input,
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const issueLibraryBook = async (input: IssueLibraryBookInput): Promise<IssueLibraryBookOutput> => {
  return request<IssueLibraryBookOutput>({
    operationId: 'issueLibraryBook',
    method: 'POST',
    path: '/library/circulation/issue',
    input: input,
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const returnLibraryBook = async (input: ReturnLibraryBookInput): Promise<ReturnLibraryBookOutput> => {
  return request<ReturnLibraryBookOutput>({
    operationId: 'returnLibraryBook',
    method: 'POST',
    path: '/library/circulation/return',
    input: input,
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const getLibraryFines = async (input: GetLibraryFinesInput): Promise<GetLibraryFinesOutput> => {
  return request<GetLibraryFinesOutput>({
    operationId: 'getLibraryFines',
    method: 'GET',
    path: '/library/fines',
    input: input,
    pathParams: [],
    queryParams: ["userId"],
    headerParams: []
  });
};

export const getNotices = async (input: GetNoticesInput): Promise<GetNoticesOutput> => {
  return request<GetNoticesOutput>({
    operationId: 'getNotices',
    method: 'GET',
    path: '/notices',
    input: input,
    pathParams: [],
    queryParams: ["targetRole","department"],
    headerParams: []
  });
};

export const createNotice = async (input: CreateNoticeInput): Promise<CreateNoticeOutput> => {
  return request<CreateNoticeOutput>({
    operationId: 'createNotice',
    method: 'POST',
    path: '/notices',
    input: input,
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const getInstitutionalOverview = async (_input?: GetInstitutionalOverviewInput): Promise<GetInstitutionalOverviewOutput> => {
  return request<GetInstitutionalOverviewOutput>({
    operationId: 'getInstitutionalOverview',
    method: 'GET',
    path: '/analytics/overview',
    input: {},
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const getAdmissionsAnalytics = async (_input?: GetAdmissionsAnalyticsInput): Promise<GetAdmissionsAnalyticsOutput> => {
  return request<GetAdmissionsAnalyticsOutput>({
    operationId: 'getAdmissionsAnalytics',
    method: 'GET',
    path: '/analytics/admissions',
    input: {},
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const getAcademicPerformanceAnalytics = async (_input?: GetAcademicPerformanceAnalyticsInput): Promise<GetAcademicPerformanceAnalyticsOutput> => {
  return request<GetAcademicPerformanceAnalyticsOutput>({
    operationId: 'getAcademicPerformanceAnalytics',
    method: 'GET',
    path: '/analytics/academic-performance',
    input: {},
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const getPlacementAnalytics = async (_input?: GetPlacementAnalyticsInput): Promise<GetPlacementAnalyticsOutput> => {
  return request<GetPlacementAnalyticsOutput>({
    operationId: 'getPlacementAnalytics',
    method: 'GET',
    path: '/analytics/placements',
    input: {},
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const getSystemActivity = async (): Promise<GetSystemActivityOutput> => {
  return request<GetSystemActivityOutput>({
    operationId: 'getSystemActivity',
    method: 'GET',
    path: '/analytics/activity',
    input: {},
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const getFinancialHealthAnalytics = async (): Promise<GetFinancialHealthAnalyticsOutput> => {
  return request<GetFinancialHealthAnalyticsOutput>({
    operationId: 'getFinancialHealthAnalytics',
    method: 'GET',
    path: '/analytics/financial-health',
    input: {},
    pathParams: [],
    queryParams: [],
    headerParams: []
  });
};

export const deleteStudent = async (id: string): Promise<any> => request<any>({ operationId: 'deleteStudent', method: 'DELETE', path: `/students/${id}`, input: {}, pathParams: [], queryParams: [], headerParams: [] });
export const deleteFaculty = async (id: string): Promise<any> => request<any>({ operationId: 'deleteFaculty', method: 'DELETE', path: `/faculty/${id}`, input: {}, pathParams: [], queryParams: [], headerParams: [] });
export const updateNotice = async (id: string, input: any): Promise<any> => request<any>({ operationId: 'updateNotice', method: 'PUT', path: `/notices/${id}`, input, pathParams: [], queryParams: [], headerParams: [] });
export const pinNotice = async (id: string): Promise<any> => request<any>({ operationId: 'pinNotice', method: 'PATCH', path: `/notices/${id}/pin`, input: {}, pathParams: [], queryParams: [], headerParams: [] });
export const deleteNotice = async (id: string): Promise<any> => request<any>({ operationId: 'deleteNotice', method: 'DELETE', path: `/notices/${id}`, input: {}, pathParams: [], queryParams: [], headerParams: [] });
export const updateExamination = async (id: string, input: any): Promise<any> => request<any>({ operationId: 'updateExamination', method: 'PUT', path: `/examinations/${id}`, input, pathParams: [], queryParams: [], headerParams: [] });
export const deleteExamination = async (id: string): Promise<any> => request<any>({ operationId: 'deleteExamination', method: 'DELETE', path: `/examinations/${id}`, input: {}, pathParams: [], queryParams: [], headerParams: [] });
export const remindFaculty = async (id: string): Promise<any> => request<any>({ operationId: 'remindFaculty', method: 'POST', path: `/examinations/${id}/remind`, input: {}, pathParams: [], queryParams: [], headerParams: [] });
export const releaseHallTickets = async (id: string): Promise<any> => request<any>({ operationId: 'releaseHallTickets', method: 'POST', path: `/examinations/${id}/hall-tickets`, input: {}, pathParams: [], queryParams: [], headerParams: [] });
export const deleteCourse = async (id: string): Promise<any> => request<any>({ operationId: 'deleteCourse', method: 'DELETE', path: `/courses/${id}`, input: {}, pathParams: [], queryParams: [], headerParams: [] });
export const updateRolePermissions = async (role: string, input: any): Promise<any> => request<any>({ operationId: 'updateRolePermissions', method: 'PUT', path: `/admin/roles/${role}/permissions`, input, pathParams: [], queryParams: [], headerParams: [] });
export const updateAdmissionStatus = async (id: string, input: any): Promise<any> => request<any>({ operationId: 'updateAdmissionStatus', method: 'PUT', path: `/admin/admissions/${id}`, input, pathParams: [], queryParams: [], headerParams: [] });
export const saveTimetable = async (input: any): Promise<any> => request<any>({ operationId: 'saveTimetable', method: 'POST', path: `/academics/timetable/save`, input, pathParams: [], queryParams: [], headerParams: [] });
export const deleteTimetableEntry = async (id: string): Promise<any> => request<any>({ operationId: 'deleteTimetableEntry', method: 'DELETE', path: `/academics/timetable/${id}`, input: {}, pathParams: [], queryParams: [], headerParams: [] });
export const createAdminUser = async (input: any): Promise<any> => request<any>({ operationId: 'createAdminUser', method: 'POST', path: `/admin/users`, input, pathParams: [], queryParams: [], headerParams: [] });
export const getDocumentQueue = async (status?: string): Promise<any> => request<any>({ operationId: 'getDocumentQueue', method: 'GET', path: `/documents/queue${status ? `?status=${status}` : ''}`, input: {}, pathParams: [], queryParams: [], headerParams: [] });
export const approveDocumentRequest = async (id: string, input: { documentUrl?: string }): Promise<any> => request<any>({ operationId: 'approveDocumentRequest', method: 'PUT', path: `/documents/${id}/approve`, input, pathParams: [], queryParams: [], headerParams: [] });
export const rejectDocumentRequest = async (id: string, input: { rejectionReason: string }): Promise<any> => request<any>({ operationId: 'rejectDocumentRequest', method: 'PUT', path: `/documents/${id}/reject`, input, pathParams: [], queryParams: [], headerParams: [] });
export const getExaminers = async (): Promise<any> => request<any>({ operationId: 'getExaminers', method: 'GET', path: `/admin/examiners`, input: {}, pathParams: [], queryParams: [], headerParams: [] });
export const assignExaminer = async (input: { examinerId: string; examinationId: string; courseId: string }): Promise<any> => request<any>({ operationId: 'assignExaminer', method: 'POST', path: `/admin/examiners/assign`, input, pathParams: [], queryParams: [], headerParams: [] });
export const getDepartmentHods = async (): Promise<any> => request<any>({ operationId: 'getDepartmentHods', method: 'GET', path: `/admin/hods`, input: {}, pathParams: [], queryParams: [], headerParams: [] });
export const relieveDepartmentHod = async (departmentId?: string): Promise<any> => request<any>({ operationId: 'relieveDepartmentHod', method: 'POST', path: departmentId ? `/admin/hods/relieve/${departmentId}` : `/admin/hod/relieve`, input: {}, pathParams: [], queryParams: [], headerParams: [] });
export const relieveInstitutionHod = async (): Promise<any> => request<any>({ operationId: 'relieveInstitutionHod', method: 'POST', path: `/admin/hod/relieve`, input: {}, pathParams: [], queryParams: [], headerParams: [] });
export const promoteFacultyToHod = async (facultyId: string): Promise<any> => request<any>({ operationId: 'promoteFacultyToHod', method: 'POST', path: `/admin/hod/promote`, input: { facultyId }, pathParams: [], queryParams: [], headerParams: [] });
