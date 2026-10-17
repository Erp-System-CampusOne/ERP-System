const ROLE_DASHBOARD_PATHS: Record<string, string> = {
  student: '/student',
  faculty: '/faculty',
  hod: '/hod',
  admin: '/admin',
  finance_officer: '/finance',
  librarian: '/library',
  management: '/analytics',
  analytics: '/analytics',
  examiner: '/faculty',
};

export const getDashboardPath = (role?: string) => ROLE_DASHBOARD_PATHS[role || ''] || '/login';
