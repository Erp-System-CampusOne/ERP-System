import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Users, Shield, Library, BarChart3, 
  GraduationCap, Home, Calendar, BookMarked, FileText, 
  DollarSign, ClipboardList, Settings, LogOut, Menu, X,
  Bell, Moon, Sun, ChevronDown, FileCheck, ShieldCheck,
  Pin, AlertTriangle, Loader2, ArrowRight, KeyRound
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { useAuth } from '@/contexts/AuthContext';
import { getNotices, getPendingRecoveryRequestsCount, listRecoveryRequests } from '@/api/apiCall';
import { Notice, PasswordRecoveryRequestRecord } from '@/api/apiInterface';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

function formatDateSafe(dateVal: any, pattern: string, fallback = '—'): string {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return format(d, pattern);
  } catch {
    return fallback;
  }
}

const STUDENT_NAV = [
  { href: '/student', label: 'Dashboard', icon: Home },
  { href: '/student/courses', label: 'Courses', icon: BookOpen },
  { href: '/student/attendance', label: 'Attendance', icon: ClipboardList },
  { href: '/student/timetable', label: 'Timetable', icon: Calendar },
  { href: '/student/exams', label: 'Exams', icon: FileText },
  { href: '/student/fees', label: 'Fees', icon: DollarSign },
  { href: '/student/library', label: 'Library', icon: Library },
  { href: '/student/documents', label: 'Documents', icon: FileText },
];

const FACULTY_NAV = [
  { href: '/faculty', label: 'Dashboard', icon: Home },
  { href: '/faculty/attendance', label: 'Attendance', icon: ClipboardList },
  { href: '/faculty/classes', label: 'Classes', icon: Users },
  { href: '/faculty/grading', label: 'Grading', icon: BookMarked },
  { href: '/faculty/leaves', label: 'Leaves', icon: Calendar },
  { href: '/faculty/timetable', label: 'Timetable', icon: Calendar },
];

const HOD_NAV = [
  { href: '/hod', label: 'Command Center', icon: Home },
  { href: '/hod?tab=students', label: 'Students', icon: GraduationCap },
  { href: '/hod?tab=faculty', label: 'Faculty & Workload', icon: Users },
  { href: '/hod?tab=courses', label: 'Course Allocation', icon: BookOpen },
  { href: '/hod?tab=timetable', label: 'Timetable Builder', icon: Calendar },
  { href: '/hod?tab=documents', label: 'Document Requests', icon: FileCheck },
  { href: '/password-reset-requests', label: 'Reset Requests', icon: KeyRound },
];

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/students', label: 'Students', icon: GraduationCap },
  { href: '/admin/faculty', label: 'Faculty', icon: Users },
  { href: '/admin/hod', label: 'HODs', icon: ShieldCheck },
  { href: '/admin/academics', label: 'Academics', icon: BookOpen },
  { href: '/admin/timetable-builder', label: 'Timetable', icon: Calendar },
  { href: '/admin/examinations', label: 'Exams', icon: FileText },
  { href: '/admin/notices', label: 'Notices', icon: Bell },
  { href: '/password-reset-requests', label: 'Reset Requests', icon: KeyRound },
  { href: '/finance', label: 'Finance', icon: DollarSign },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/roles', label: 'Roles', icon: Shield },
];

const FINANCE_NAV = [
  { href: '/finance', label: 'Dashboard', icon: Home },
  { href: '/finance/structures', label: 'Fee Structures', icon: DollarSign },
  { href: '/finance/dues', label: 'Dues', icon: ClipboardList },
  { href: '/finance/transactions', label: 'Transactions', icon: DollarSign },
  { href: '/finance/reports', label: 'Reports', icon: BarChart3 },
];

const LIBRARY_NAV = [
  { href: '/library', label: 'Dashboard', icon: Home },
  { href: '/library/catalog', label: 'Catalog', icon: BookOpen },
  { href: '/library/circulation', label: 'Circulation', icon: BookMarked },
  { href: '/library/fines', label: 'Fines', icon: DollarSign },
];

const ANALYTICS_NAV = [
  { href: '/analytics', label: 'Overview', icon: Home },
  { href: '/analytics/academic-performance', label: 'Academic', icon: BookOpen },
  { href: '/analytics/placement', label: 'Placement', icon: GraduationCap },
  { href: '/analytics/financial-health', label: 'Financial', icon: DollarSign },
  { href: '/password-reset-requests', label: 'Reset Requests', icon: KeyRound },
];

const ROLE_CONFIG: Record<string, { nav: typeof STUDENT_NAV; title: string; color: string }> = {
  student: { nav: STUDENT_NAV, title: 'Student Portal', color: 'bg-success' },
  faculty: { nav: FACULTY_NAV, title: 'Faculty Portal', color: 'bg-info' },
  admin: { nav: ADMIN_NAV, title: 'Admin Console', color: 'bg-primary' },
  hod: { nav: HOD_NAV, title: 'HOD Command Center', color: 'bg-primary' },
  finance_officer: { nav: FINANCE_NAV, title: 'Finance Office', color: 'bg-warning' },
  librarian: { nav: LIBRARY_NAV, title: 'Library System', color: 'bg-destructive' },
  management: { nav: ANALYTICS_NAV, title: 'Analytics', color: 'bg-info' },
  analytics: { nav: ANALYTICS_NAV, title: 'Analytics', color: 'bg-info' },
  examiner: { nav: FACULTY_NAV, title: 'Examiner Portal', color: 'bg-primary' },
};

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout, role } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeNoticeModal, setActiveNoticeModal] = useState<Notice | null>(null);

  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(target)
      ) {
        setIsNotificationsOpen(false);
      }
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(target)
      ) {
        setIsProfileOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Fetch real authenticated notices from GET /api/notices filtered by role and department
  const userDept = user?.department || (user as any)?.studentProfile?.department?.name || (user as any)?.facultyProfile?.department?.name;
  const navigate = useNavigate();

  const userRole = (role || user?.role || '').toLowerCase();
  const userRoles = (user?.roles || []).map((r: string) => r.toLowerCase());
  const isApprover =
    ['admin', 'hod', 'management', 'director', 'principal', 'super_admin'].includes(userRole) ||
    userRoles.some((r: string) => ['admin', 'hod', 'management', 'director', 'principal', 'super_admin'].includes(r));
  const [activeNotificationTab, setActiveNotificationTab] = useState<'notices' | 'resets'>('notices');

  // Pending recovery requests query for authorized approvers
  const {
    data: pendingRecoveryData,
    refetch: refetchPendingRecovery,
  } = useQuery({
    queryKey: ['layout', 'pending-recovery-count', role, user?.id],
    queryFn: async () => {
      try {
        return await getPendingRecoveryRequestsCount();
      } catch {
        return { success: true, count: 0 };
      }
    },
    enabled: !!user && isApprover,
    refetchInterval: 15000,
    staleTime: 5000,
  });

  // Pending recovery requests list for authorized approvers to render inside the notification panel
  const {
    data: recoveryRequestsData,
    isLoading: isRecoveryLoading,
    refetch: refetchRecoveryRequests,
  } = useQuery({
    queryKey: ['layout', 'pending-recovery-requests', role, user?.id],
    queryFn: async () => {
      try {
        return await listRecoveryRequests({ status: 'pending_approval' });
      } catch {
        return { success: true, requests: [] };
      }
    },
    enabled: !!user && isApprover,
    refetchInterval: 15000,
    staleTime: 5000,
  });

  const pendingRequests: PasswordRecoveryRequestRecord[] = (isApprover && recoveryRequestsData?.requests) ? recoveryRequestsData.requests : [];
  const pendingResetCount = (isApprover && pendingRecoveryData?.success)
    ? Math.max(pendingRecoveryData.count || 0, pendingRequests.length)
    : pendingRequests.length;

  const {
    data: notices = [],
    isLoading: isNoticesLoading,
    isError: isNoticesError,
    refetch: refetchNotices,
  } = useQuery<Notice[]>({
    queryKey: ['layout', 'notices', role, userDept],
    queryFn: async () => {
      return await getNotices({
        targetRole: role === 'admin' ? undefined : role,
        department: userDept || undefined,
      });
    },
    enabled: !!user,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Track read/seen notices per user via localStorage
  const [seenNoticeIds, setSeenNoticeIds] = useState<string[]>(() => {
    try {
      if (!user?.id) return [];
      const stored = localStorage.getItem(`campusone_seen_notices_${user.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!user?.id) {
      setSeenNoticeIds([]);
      return;
    }
    try {
      const stored = localStorage.getItem(`campusone_seen_notices_${user.id}`);
      setSeenNoticeIds(stored ? JSON.parse(stored) : []);
    } catch {
      setSeenNoticeIds([]);
    }
  }, [user?.id]);

  const markAllAsSeen = () => {
    if (!user?.id || notices.length === 0) return;
    const allIds = Array.from(new Set([...seenNoticeIds, ...notices.map((n) => n.id)]));
    setSeenNoticeIds(allIds);
    try {
      localStorage.setItem(`campusone_seen_notices_${user.id}`, JSON.stringify(allIds));
    } catch (e) {
      console.error('Failed to store seen notices', e);
    }
  };

  const markNoticeAsSeen = (id: string) => {
    if (!user?.id || seenNoticeIds.includes(id)) return;
    const updated = [...seenNoticeIds, id];
    setSeenNoticeIds(updated);
    try {
      localStorage.setItem(`campusone_seen_notices_${user.id}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to store seen notice', e);
    }
  };

  const totalNotices = notices.length;
  const unreadNotices = notices.filter((n) => !seenNoticeIds.includes(n.id));
  const hasUnread = unreadNotices.length > 0;
  const urgentNotices = unreadNotices.filter((n) => n.isUrgent);
  const hasUrgent = urgentNotices.length > 0;

  const totalBadgeCount = isApprover
    ? unreadNotices.length + pendingResetCount
    : unreadNotices.length;

  useEffect(() => {
    if (isNotificationsOpen && notices.length > 0 && activeNotificationTab === 'notices') {
      const hasUnseen = notices.some((n) => !seenNoticeIds.includes(n.id));
      if (hasUnseen) {
        markAllAsSeen();
      }
    }
  }, [isNotificationsOpen, notices, seenNoticeIds, activeNotificationTab]);

  const roleKey = (role || user?.role || '').toLowerCase();
  const config = ROLE_CONFIG[roleKey] || (roleKey === 'principal' || roleKey === 'director' ? ROLE_CONFIG.management : ROLE_CONFIG.student);
  const navItems = config?.nav || STUDENT_NAV;

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const isNavItemActive = (itemHref: string) => {
    const currentPath = location.pathname;
    const currentSearch = location.search;
    const currentFullUrl = currentPath + currentSearch;

    if (currentFullUrl === itemHref) return true;

    if (itemHref.includes('?')) {
      return currentFullUrl === itemHref;
    }

    if (currentSearch && currentSearch !== '' && currentSearch !== '?tab=overview') {
      return false;
    }

    if (currentPath === itemHref) return true;

    const dashboardRoots = ['/admin', '/student', '/faculty', '/hod', '/finance', '/library', '/analytics'];
    if (!dashboardRoots.includes(itemHref) && currentPath.startsWith(itemHref + '/')) {
      return true;
    }

    return false;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b-2 border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-16 items-center px-4 md:px-6">
          <Link to="/" className="flex items-center gap-3 mr-6">
            <div className={`p-2 rounded-lg ${config?.color || 'bg-primary'} text-background`}>
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-display text-xl font-bold hidden sm:inline-block">
              Campus<span className="text-primary">One</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center justify-center gap-0.5 flex-1 overflow-hidden">
            {navItems.map((item) => {
              const isActive = isNavItemActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  title={item.label}
                  className={cn(
                    "group flex items-center gap-0 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden shrink-0",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span
                    className={cn(
                      "overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out",
                      isActive
                        ? "max-w-[160px] ml-1.5 opacity-100"
                        : "max-w-0 group-hover:max-w-[140px] group-hover:ml-1.5 opacity-0 group-hover:opacity-100"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 ml-auto">
            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notificationDropdownRef}>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 relative"
                onClick={() => {
                  const willOpen = !isNotificationsOpen;
                  setIsNotificationsOpen(willOpen);
                  setIsProfileOpen(false);
                  if (willOpen) {
                    if (isApprover && pendingResetCount > 0 && unreadNotices.length === 0) {
                      setActiveNotificationTab('resets');
                    } else if (activeNotificationTab === 'notices') {
                      markAllAsSeen();
                    }
                  }
                }}
                aria-label={`Notifications${totalBadgeCount > 0 ? ` (${totalBadgeCount} unread)` : ''}`}
                aria-expanded={isNotificationsOpen}
              >
                <Bell className="w-5 h-5" />
                {totalBadgeCount > 0 ? (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold shadow-sm",
                      hasUrgent || (isApprover && pendingResetCount > 0)
                        ? "bg-destructive text-destructive-foreground animate-pulse"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
                  </span>
                ) : (
                  totalNotices > 0 && hasUnread && (
                    <span
                      className={cn(
                        "absolute top-1.5 right-1.5 flex h-2.5 w-2.5",
                        hasUrgent ? "text-destructive" : "text-primary"
                      )}
                    >
                      {hasUrgent && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                      )}
                      <span
                        className={cn(
                          "relative inline-flex rounded-full h-2.5 w-2.5",
                          hasUrgent ? "bg-destructive" : "bg-primary"
                        )}
                      />
                    </span>
                  )
                )}
              </Button>

              {isNotificationsOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border-2 border-border bg-popover shadow-xl z-50 overflow-hidden flex flex-col"
                  role="region"
                  aria-label="Notifications Panel"
                >
                  {/* Panel Header */}
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/40">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      <h3 className="font-display text-sm font-bold">Notifications</h3>
                      {totalBadgeCount > 0 ? (
                        <span className="font-mono text-xs px-1.5 py-0.2 rounded bg-destructive/10 text-destructive border border-destructive/20 font-semibold">
                          {totalBadgeCount} new
                        </span>
                      ) : totalNotices > 0 ? (
                        <span className="font-mono text-xs px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border font-semibold">
                          {totalNotices}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      {activeNotificationTab === 'notices' && unreadNotices.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                          onClick={markAllAsSeen}
                        >
                          Mark all as read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                        onClick={() => setIsNotificationsOpen(false)}
                        aria-label="Close notification panel"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Tabs for Approvers */}
                  {isApprover && (
                    <div className="flex border-b border-border bg-muted/20">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveNotificationTab('notices');
                          markAllAsSeen();
                        }}
                        className={cn(
                          "flex-1 py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors",
                          activeNotificationTab === 'notices'
                            ? "border-primary text-primary bg-background"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Bell className="w-3.5 h-3.5" />
                        Notices
                        {unreadNotices.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary/10 text-primary font-bold">
                            {unreadNotices.length}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveNotificationTab('resets')}
                        className={cn(
                          "flex-1 py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors",
                          activeNotificationTab === 'resets'
                            ? "border-primary text-primary bg-background"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Reset Requests
                        {pendingResetCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-destructive text-destructive-foreground font-bold">
                            {pendingResetCount}
                          </span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Immediate Alert for Approvers with Pending Reset Requests */}
                  {isApprover && pendingResetCount > 0 && (
                    <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="p-1 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0">
                          <KeyRound className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 truncate">
                            {pendingResetCount} Password Reset Request{pendingResetCount > 1 ? 's' : ''} Pending
                          </p>
                          <p className="text-[10px] text-amber-700 dark:text-amber-400">
                            Awaiting your approval
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/password-reset-requests"
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          navigate('/password-reset-requests');
                        }}
                        className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 flex items-center gap-1 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1 rounded transition-colors shrink-0"
                      >
                        Review <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}

                  {/* Panel Body */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
                    {activeNotificationTab === 'resets' && isApprover ? (
                      isRecoveryLoading ? (
                        <div className="py-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          <span className="text-xs">Loading reset requests...</span>
                        </div>
                      ) : pendingRequests.length === 0 ? (
                        <div className="py-8 px-4 text-center space-y-1">
                          <ShieldCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm font-medium text-foreground">No pending requests</p>
                          <p className="text-xs text-muted-foreground">
                            All password reset requests in your department have been reviewed.
                          </p>
                        </div>
                      ) : (
                        pendingRequests.map((req) => (
                          <Link
                            key={req.id}
                            to="/password-reset-requests"
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              navigate('/password-reset-requests');
                            }}
                            className="w-full text-left p-3.5 transition-colors hover:bg-muted/60 flex flex-col gap-1.5 group block"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                                <KeyRound className="w-3.5 h-3.5 text-primary shrink-0" />
                                {req.targetUser?.name || 'User'}
                              </span>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                Pending
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                              <span>
                                COID: <span className="font-mono font-medium text-foreground">{req.campusId || req.targetUser?.campusId || 'N/A'}</span>
                                {req.department && ` • ${req.department}`}
                              </span>
                              <span>
                                {formatDateSafe(req.createdAt, 'MMM d, h:mm a')}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              Password recovery approval requested. Click to review.
                            </p>
                          </Link>
                        ))
                      )
                    ) : (
                      // Notices Tab
                      isNoticesLoading ? (
                        <div className="py-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          <span className="text-xs">Loading notices...</span>
                        </div>
                      ) : isNoticesError ? (
                        <div className="py-6 px-4 text-center space-y-2">
                          <p className="text-xs text-destructive font-medium">Failed to load institutional notices.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => refetchNotices()}
                          >
                            Retry
                          </Button>
                        </div>
                      ) : totalNotices === 0 ? (
                        <div className="py-8 px-4 text-center space-y-1">
                          <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm font-medium text-foreground">No notices found</p>
                          <p className="text-xs text-muted-foreground">
                            You are up to date. No new announcements for your department or role.
                          </p>
                        </div>
                      ) : (
                        notices.map((notice) => (
                          <button
                            key={notice.id}
                            type="button"
                            onClick={() => {
                              markNoticeAsSeen(notice.id);
                              setActiveNoticeModal(notice);
                              setIsNotificationsOpen(false);
                            }}
                            className={cn(
                              "w-full text-left p-3.5 transition-colors hover:bg-muted/60 flex flex-col gap-1.5 group",
                              notice.isUrgent && "bg-destructive/5 hover:bg-destructive/10"
                            )}
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {notice.isPinned && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  <Pin className="w-2.5 h-2.5" /> Pinned
                                </span>
                              )}
                              {notice.isUrgent && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/20">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Urgent
                                </span>
                              )}
                              {notice.category && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground uppercase tracking-wider">
                                  {notice.category}
                                </span>
                              )}
                              <span className="text-[11px] text-muted-foreground ml-auto">
                                {formatDateSafe(notice.publishedAt, 'MMM d')}
                              </span>
                            </div>

                            <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {notice.title}
                            </p>

                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {notice.content}
                            </p>
                          </button>
                        ))
                      )
                    )}
                  </div>

                  {/* Panel Footer: Role-Authorized Navigation */}
                  <div className="p-2.5 bg-muted/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    {activeNotificationTab === 'resets' && isApprover ? (
                      <Link
                        to="/password-reset-requests"
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          navigate('/password-reset-requests');
                        }}
                        className="text-primary hover:underline font-semibold flex items-center gap-1 w-full justify-center h-7 text-xs"
                      >
                        Open Approval Dashboard ({pendingResetCount}) <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : role === 'admin' ? (
                      <Link
                        to="/admin/notices"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="text-primary hover:underline font-semibold flex items-center gap-1 w-full justify-center py-1"
                      >
                        Open Notices Manager <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <span className="text-[11px] text-muted-foreground mx-auto">
                        Filtered for {config?.title || role}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <Button
                variant="ghost"
                className="gap-2 hidden sm:flex"
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen);
                  setIsNotificationsOpen(false);
                }}
                aria-expanded={isProfileOpen}
                aria-label="User profile menu"
              >
                <img
                  src={user?.avatarUrl || `https://api.dicebear.com/9.x/toon-head/svg?seed=${encodeURIComponent(user?.department || user?.name || 'User')}`}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover border-2 border-primary/20"
                />
                <span className="font-medium text-sm max-w-[100px] truncate">{user?.name || 'User'}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>

              {isProfileOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-60 rounded-xl border-2 border-border bg-popover p-2 shadow-lg z-50"
                  role="menu"
                >
                  <div className="px-3 py-2 border-b border-border mb-2">
                    <p className="font-medium text-sm truncate">{user?.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {user?.campusId && (
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {user.campusId}
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setIsDark(!isDark)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors text-left"
                    role="menuitem"
                  >
                    {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </button>

                  <Link
                    to="/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                    role="menuitem"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={isSidebarOpen}
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isSidebarOpen && (
          <div className="md:hidden border-t-2 border-border bg-background">
            {/* User Profile summary on mobile */}
            <div className="p-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <img
                  src={user?.avatarUrl || `https://api.dicebear.com/9.x/toon-head/svg?seed=${encodeURIComponent(user?.department || user?.name || 'User')}`}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{user?.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {user?.campusId && (
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                        {user.campusId}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground uppercase">{user?.role}</span>
                  </div>
                </div>
              </div>
            </div>

            <nav className="flex flex-col p-4 gap-1">
              {navItems.map((item) => {
                const isActive = isNavItemActive(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}

              <div className="pt-2 mt-2 border-t border-border space-y-1">
                <Link
                  to="/settings"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Settings className="w-5 h-5" />
                  Account Settings
                </Link>

                <button
                  type="button"
                  onClick={() => setIsDark(!isDark)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted text-left"
                >
                  {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-400" />}
                  {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 text-left"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Notice Details Modal */}
      {activeNoticeModal && (
        <Dialog open={!!activeNoticeModal} onOpenChange={(open) => !open && setActiveNoticeModal(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                {activeNoticeModal.isPinned && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Pin className="w-3 h-3" /> Pinned
                  </span>
                )}
                {activeNoticeModal.isUrgent && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-destructive/15 text-destructive border border-destructive/20">
                    <AlertTriangle className="w-3 h-3" /> Urgent Notice
                  </span>
                )}
                {activeNoticeModal.category && (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground uppercase">
                    {activeNoticeModal.category}
                  </span>
                )}
              </div>
              <DialogTitle className="text-xl font-display leading-snug">
                {activeNoticeModal.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Published on {format(new Date(activeNoticeModal.publishedAt), 'MMMM d, yyyy')}
                {activeNoticeModal.department ? ` • Department: ${activeNoticeModal.department}` : ' • Institution-Wide'}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed border-t border-b">
              {activeNoticeModal.content}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setActiveNoticeModal(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export function useLayout() {
  const { role } = useAuth();
  return { role };
}
