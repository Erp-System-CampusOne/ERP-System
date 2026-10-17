/**
 * PROTECTED ROUTER DEFINITION - DETERMINISTICALLY GENERATED
 * Do not modify this file manually. It is generator-owned and hash-protected.
 */
import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { SeoManager } from '@/components/shared/SeoManager';

function RouteBoundary({ children, routeId }: { children: React.ReactNode; routeId: string }) {
  return (
    <div data-farcl-route-id={routeId} className="w-full h-full min-h-screen">
      <SeoManager />
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }>
        {children}
      </Suspense>
    </div>
  );
}

const NotFound = lazy(() => import('../pages/NotFound'));
const Login = lazy(() => import('../pages/Login'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/ResetPassword'));
const VerifyEmail = lazy(() => import('../pages/VerifyEmail'));
const Student = lazy(() => import('../pages/Student'));
const StudentCourses = lazy(() => import('../pages/StudentCourses'));
const StudentAttendance = lazy(() => import('../pages/StudentAttendance'));
const StudentTimetable = lazy(() => import('../pages/StudentTimetable'));
const StudentExams = lazy(() => import('../pages/StudentExams'));
const StudentFees = lazy(() => import('../pages/StudentFees'));
const StudentLibrary = lazy(() => import('../pages/StudentLibrary'));
const StudentDocuments = lazy(() => import('../pages/StudentDocuments'));
const Faculty = lazy(() => import('../pages/Faculty'));
const FacultyAttendance = lazy(() => import('../pages/FacultyAttendance'));
const FacultyClasses = lazy(() => import('../pages/FacultyClasses'));
const FacultyGrading = lazy(() => import('../pages/FacultyGrading'));
const FacultyLeaves = lazy(() => import('../pages/FacultyLeaves'));
const FacultyTimetable = lazy(() => import('../pages/FacultyTimetable'));
const HodDashboard = lazy(() => import('../pages/HodDashboard'));
const Admin = lazy(() => import('../pages/Admin'));
const AdminStudents = lazy(() => import('../pages/AdminStudents'));
const AdminFaculty = lazy(() => import('../pages/AdminFaculty'));
const AdminHod = lazy(() => import('../pages/AdminHod'));
const AdminAcademics = lazy(() => import('../pages/AdminAcademics'));
const AdminTimetableBuilder = lazy(() => import('../pages/AdminTimetableBuilder'));
const AdminExaminations = lazy(() => import('../pages/AdminExaminations'));
const AdminNotices = lazy(() => import('../pages/AdminNotices'));
const AdminRoles = lazy(() => import('../pages/AdminRoles'));
const Finance = lazy(() => import('../pages/Finance'));
const FinanceStructures = lazy(() => import('../pages/FinanceStructures'));
const FinanceDues = lazy(() => import('../pages/FinanceDues'));
const FinanceTransactions = lazy(() => import('../pages/FinanceTransactions'));
const FinanceReports = lazy(() => import('../pages/FinanceReports'));
const Library = lazy(() => import('../pages/Library'));
const LibraryCatalog = lazy(() => import('../pages/LibraryCatalog'));
const LibraryCirculation = lazy(() => import('../pages/LibraryCirculation'));
const LibraryFines = lazy(() => import('../pages/LibraryFines'));
const Analytics = lazy(() => import('../pages/Analytics'));
const AnalyticsAcademicPerformance = lazy(() => import('../pages/AnalyticsAcademicPerformance'));
const AnalyticsPlacement = lazy(() => import('../pages/AnalyticsPlacement'));
const AnalyticsFinancialHealth = lazy(() => import('../pages/AnalyticsFinancialHealth'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: (
      <RouteBoundary routeId="login">
        <Login />
      </RouteBoundary>
    ),
  },
  {
    path: '/signup',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/forgot-password',
    element: (
      <RouteBoundary routeId="forgot-password">
        <ForgotPassword />
      </RouteBoundary>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <RouteBoundary routeId="reset-password">
        <ResetPassword />
      </RouteBoundary>
    ),
  },
  {
    path: '/verify-email',
    element: (
      <RouteBoundary routeId="verify-email">
        <VerifyEmail />
      </RouteBoundary>
    ),
  },
  {
    path: '/not-found',
    element: (
      <RouteBoundary routeId="not-found">
        <NotFound />
      </RouteBoundary>
    ),
  },
  {
    path: '/student',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="student">
          <Student />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/student/courses',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="student-courses">
          <StudentCourses />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/student/attendance',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="student-attendance">
          <StudentAttendance />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/student/timetable',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="student-timetable">
          <StudentTimetable />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/student/exams',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="student-exams">
          <StudentExams />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/student/fees',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="student-fees">
          <StudentFees />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/student/library',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="student-library">
          <StudentLibrary />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/student/documents',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="student-documents">
          <StudentDocuments />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/faculty',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="faculty">
          <Faculty />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/faculty/attendance',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="faculty-attendance">
          <FacultyAttendance />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/faculty/classes',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="faculty-classes">
          <FacultyClasses />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/faculty/grading',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="faculty-grading">
          <FacultyGrading />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/faculty/leaves',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="faculty-leaves">
          <FacultyLeaves />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/faculty/timetable',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="faculty-timetable">
          <FacultyTimetable />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/faculty/department',
    element: <Navigate to="/hod" replace />,
  },
  {
    path: '/hod',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="hod">
          <HodDashboard />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="admin">
          <Admin />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/students',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="admin-students">
          <AdminStudents />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/admissions',
    element: <Navigate to="/admin/students" replace />,
  },
  {
    path: '/admin/faculty',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="admin-faculty">
          <AdminFaculty />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/hod',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="admin-hod">
          <AdminHod />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/academics',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="admin-academics">
          <AdminAcademics />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/timetable-builder',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="admin-timetable-builder">
          <AdminTimetableBuilder />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/examinations',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="admin-examinations">
          <AdminExaminations />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/notices',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="admin-notices">
          <AdminNotices />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/roles',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="admin-roles">
          <AdminRoles />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/finance',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="finance">
          <Finance />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/finance_officer',
    element: <Navigate to="/finance" replace />,
  },
  {
    path: '/finance/structures',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="finance-structures">
          <FinanceStructures />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/finance/dues',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="finance-dues">
          <FinanceDues />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/finance/transactions',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="finance-transactions">
          <FinanceTransactions />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/finance/reports',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="finance-reports">
          <FinanceReports />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/library',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="library">
          <Library />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/library/catalog',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="library-catalog">
          <LibraryCatalog />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/library/circulation',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="library-circulation">
          <LibraryCirculation />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/library/fines',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="library-fines">
          <LibraryFines />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/analytics',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="analytics">
          <Analytics />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/management',
    element: <Navigate to="/analytics" replace />,
  },
  {
    path: '/analytics/admissions',
    element: <Navigate to="/analytics" replace />,
  },
  {
    path: '/analytics/academic-performance',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="analytics-academic-performance">
          <AnalyticsAcademicPerformance />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/analytics/placement',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="analytics-placement">
          <AnalyticsPlacement />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/analytics/financial-health',
    element: (
      <ProtectedRoute>
        <RouteBoundary routeId="analytics-financial-health">
          <AnalyticsFinancialHealth />
        </RouteBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: (
      <RouteBoundary routeId="catchall-not-found">
        <NotFound />
      </RouteBoundary>
    ),
  },
]);
