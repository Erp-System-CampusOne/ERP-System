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
  const { isAuthenticated, isLoading, role } = useAuth();
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

  const isLibraryManagementRoute = location.pathname === '/library' || location.pathname.startsWith('/library/');
  if (isLibraryManagementRoute && role !== 'librarian' && role !== 'admin') {
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  const isFinanceManagementRoute = location.pathname === '/finance' || location.pathname.startsWith('/finance/');
  if (isFinanceManagementRoute && role !== 'finance_officer' && role !== 'admin') {
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  const isAnalyticsRoute = location.pathname === '/analytics' || location.pathname.startsWith('/analytics/');
  if (isAnalyticsRoute && role !== 'management' && role !== 'analytics' && role !== 'admin' && role !== 'hod') {
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}
