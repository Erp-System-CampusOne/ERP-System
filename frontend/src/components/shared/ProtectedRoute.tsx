import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/shared/AppLayout';
import { getDashboardPath } from '@/lib/dashboardRoutes';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const userRole = (role || user?.role || '').toLowerCase();
  const userRoles = (user?.roles || []).map((r: string) => r.toLowerCase());

  const isLibraryManagementRoute = location.pathname === '/library' || location.pathname.startsWith('/library/');
  if (isLibraryManagementRoute && userRole !== 'librarian' && userRole !== 'admin' && !userRoles.includes('admin') && !userRoles.includes('librarian')) {
    return <Navigate to={getDashboardPath(userRole)} replace />;
  }

  const isFinanceManagementRoute = location.pathname === '/finance' || location.pathname.startsWith('/finance/');
  if (isFinanceManagementRoute && userRole !== 'finance_officer' && userRole !== 'admin' && !userRoles.includes('admin') && !userRoles.includes('finance_officer')) {
    return <Navigate to={getDashboardPath(userRole)} replace />;
  }

  const isAnalyticsRoute = location.pathname === '/analytics' || location.pathname.startsWith('/analytics/');
  const isAnalyticsAuthorized = 
    ['management', 'analytics', 'admin', 'hod', 'director', 'principal'].includes(userRole) ||
    userRoles.some((r: string) => ['management', 'analytics', 'admin', 'hod', 'director', 'principal'].includes(r));
  if (isAnalyticsRoute && !isAnalyticsAuthorized) {
    return <Navigate to={getDashboardPath(userRole)} replace />;
  }

  const isPasswordResetRequestsRoute = 
    location.pathname === '/password-reset-requests' || 
    location.pathname.startsWith('/password-reset-requests/');
  const isApproverAuthorized = 
    ['admin', 'hod', 'management', 'director', 'principal', 'super_admin'].includes(userRole) ||
    userRoles.some((r: string) => ['admin', 'hod', 'management', 'director', 'principal', 'super_admin'].includes(r));

  if (isPasswordResetRequestsRoute && !isApproverAuthorized) {
    return <Navigate to={getDashboardPath(userRole)} replace />;
  }

  const isHodRoute = location.pathname === '/hod' || location.pathname.startsWith('/hod');
  if (isHodRoute && userRole !== 'hod' && userRole !== 'admin' && !userRoles.includes('hod') && !userRoles.includes('admin')) {
    return <Navigate to={getDashboardPath(userRole)} replace />;
  }

  const isFacultyRoute = location.pathname === '/faculty' || location.pathname.startsWith('/faculty/');
  if (isFacultyRoute && (userRole === 'hod' || userRoles.includes('hod'))) {
    return <Navigate to="/hod" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}
