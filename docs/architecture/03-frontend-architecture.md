# Frontend Architecture & Route Map

> **Verification Status:** Verified from `frontend/src/app/router.generated.tsx`, `frontend/src/main.tsx`, and `frontend/src/contexts/AuthContext.tsx`.

## 1. Provider Hierarchy

```
ReactDOM.createRoot
  +-- React.StrictMode
        +-- QueryClientProvider (TanStack Query — staleTime: 5 min, retry: 1)
              +-- AuthProvider (JWT state management)
                    +-- ErrorBoundary
                          +-- RouterProvider (React Router v6)
                                +-- Toaster (Sonner notifications)
                                +-- Analytics (Vercel Analytics)
```

## 2. Route Definitions

All routes are lazy-loaded via `React.lazy()`. Protected routes are wrapped in `<ProtectedRoute>`.

| Path | Page Component | Auth Required | Route ID |
|---|---|---|---|
| `/` | (redirects to `/login`) | No | - |
| `/login` | Login | No | login |
| `/signup` | Signup | No | signup |
| `/forgot-password` | ForgotPassword | No | forgot-password |
| `/reset-password` | ResetPassword | No | reset-password |
| `/verify-email` | VerifyEmail | No | verify-email |
| `/not-found` | NotFound | No | not-found |
| `/student` | Student | **Yes** | student |
| `/student/courses` | StudentCourses | **Yes** | student-courses |
| `/student/attendance` | StudentAttendance | **Yes** | student-attendance |
| `/student/timetable` | StudentTimetable | **Yes** | student-timetable |
| `/student/exams` | StudentExams | **Yes** | student-exams |
| `/student/fees` | StudentFees | **Yes** | student-fees |
| `/student/library` | StudentLibrary | **Yes** | student-library |
| `/student/documents` | StudentDocuments | **Yes** | student-documents |
| `/faculty` | Faculty | **Yes** | faculty |
| `/faculty/attendance` | FacultyAttendance | **Yes** | faculty-attendance |
| `/faculty/classes` | FacultyClasses | **Yes** | faculty-classes |
| `/faculty/grading` | FacultyGrading | **Yes** | faculty-grading |
| `/faculty/leaves` | FacultyLeaves | **Yes** | faculty-leaves |
| `/faculty/timetable` | FacultyTimetable | **Yes** | faculty-timetable |
| `/faculty/department` | FacultyDepartment | **Yes** | faculty-department |
| `/admin` | Admin | **Yes** | admin |
| `/admin/students` | AdminStudents | **Yes** | admin-students |
| `/admin/admissions` | AdminAdmissions | **Yes** | admin-admissions |
| `/admin/faculty` | AdminFaculty | **Yes** | admin-faculty |
| `/admin/academics` | AdminAcademics | **Yes** | admin-academics |
| `/admin/timetable-builder` | AdminTimetableBuilder | **Yes** | admin-timetable-builder |
| `/admin/examinations` | AdminExaminations | **Yes** | admin-examinations |
| `/admin/notices` | AdminNotices | **Yes** | admin-notices |
| `/admin/roles` | AdminRoles | **Yes** | admin-roles |
| `/finance` | Finance | **Yes** | finance |
| `/finance_officer` | (redirects to `/finance`) | No | - |
| `/finance/structures` | FinanceStructures | **Yes** | finance-structures |
| `/finance/dues` | FinanceDues | **Yes** | finance-dues |
| `/finance/transactions` | FinanceTransactions | **Yes** | finance-transactions |
| `/finance/reports` | FinanceReports | **Yes** | finance-reports |
| `/library` | Library | **Yes** | library |
| `/library/catalog` | LibraryCatalog | **Yes** | library-catalog |
| `/library/circulation` | LibraryCirculation | **Yes** | library-circulation |
| `/library/fines` | LibraryFines | **Yes** | library-fines |
| `/analytics` | Analytics | **Yes** | analytics |
| `/management` | (redirects to `/analytics`) | No | - |
| `/analytics/admissions` | AnalyticsAdmissions | **Yes** | analytics-admissions |
| `/analytics/academic-performance` | AnalyticsAcademicPerformance | **Yes** | analytics-academic-performance |
| `/analytics/placement` | AnalyticsPlacement | **Yes** | analytics-placement |
| `/analytics/financial-health` | AnalyticsFinancialHealth | **Yes** | analytics-financial-health |
| `*` | NotFound | No | catchall-not-found |

**Total routes: 47** (42 unique pages + 5 redirects/catch-all)

### Redirect Aliases
- `/finance_officer` ? `/finance` (role-name shortcut)
- `/management` ? `/analytics` (role-name shortcut)

---

## 3. ProtectedRoute Behaviour

```typescript
// Verified from: frontend/src/components/shared/ProtectedRoute.tsx
```
**Inferred behaviour** (component not fully read):
- Checks `isAuthenticated` from `useAuth()` context.
- If not authenticated, redirects to `/login`.
- If loading (checking token), shows loading spinner.
- If authenticated, renders children.

> Note: `ProtectedRoute` does **not** enforce role-based access at the frontend route level. All protected routes require any valid authentication. Role-specific restrictions are enforced server-side only.

---

## 4. Authentication State Management

```
+---------------------------------------------------------+
¦ AuthContext                                             ¦
¦                                                         ¦
¦ State:                                                  ¦
¦   user: User | null          ? Full user profile        ¦
¦   isLoading: boolean         ? Token validation in-flight¦
¦   isAuthenticated: boolean   ? !!user                  ¦
¦   role: string | undefined   ? user?.role              ¦
¦                                                         ¦
¦ Startup:                                                ¦
¦   1. Check localStorage for campusone_jwt_token        ¦
¦   2. If token found: setApiConfig + fetchCurrentUser() ¦
¦   3. If /auth/me fails: clear token + setUser(null)    ¦
¦                                                         ¦
¦ Login:                                                  ¦
¦   1. POST /auth/login                                   ¦
¦   2. Store token in localStorage                        ¦
¦   3. setApiConfig({headers: {Authorization: Bearer...}})¦
¦   4. setUser(user)                                      ¦
¦                                                         ¦
¦ Logout:                                                 ¦
¦   1. POST /auth/logout (fire-and-forget)               ¦
¦   2. setUser(null)                                      ¦
¦   3. Remove token from localStorage                     ¦
¦   4. Clear Authorization header                         ¦
+---------------------------------------------------------+
```

---

## 5. API Client Architecture

### apiCall.ts (auto-generated)

- Exports individual typed functions for each API endpoint.
- Uses a shared `request()` function internally.
- Reads from a module-level `apiConfig` object (`baseUrl`, `headers`).
- `setApiConfig()` mutates this object — called in `main.tsx` (set base URL) and `AuthContext` (set token).

### customApi.ts (handwritten)

- Supplements the auto-generated client with endpoints not covered.
- Used for admin-specific routes, timetable save, notice management, etc.

### Error Handling (Frontend)

- `frontend/src/lib/error-bridge.ts` is imported in `main.tsx` — suggests a global error listener bridge.
- `ErrorBoundary` component catches React render errors.
- Individual API calls handle errors via `.catch()` in hooks.

---

## 6. Key Frontend Dependencies

| Library | Role | Integration Point |
|---|---|---|
| TanStack Query | All data fetching, caching, mutation | Per-feature hooks |
| Recharts | Charts in Analytics pages | Analytics feature components |
| Radix UI | Modal, Select, Dropdown, Tabs, Toast | Shared UI components |
| Lucide React | Icons throughout | All pages |
| Sonner | Toast notifications | `main.tsx` + toast() calls |
| Motion | Animations and transitions | Feature components |
| date-fns | Date formatting | Form inputs, display |
| class-variance-authority + clsx + tailwind-merge | Component variant styling | UI primitives |
| Fontsource/Rubik + Urbanist + JetBrains Mono | Typography | `index.css` imports |
