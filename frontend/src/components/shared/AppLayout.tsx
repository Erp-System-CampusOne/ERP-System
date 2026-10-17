import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpen, Users, Shield, Library, BarChart3, 
  GraduationCap, Home, Calendar, BookMarked, FileText, 
  DollarSign, ClipboardList, Settings, LogOut, Menu, X,
  Bell, Moon, Sun, ChevronDown
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';


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
  { href: '/faculty/department', label: 'Department', icon: Shield },
];

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/students', label: 'Students', icon: GraduationCap },
  { href: '/admin/admissions', label: 'Admissions', icon: Users },
  { href: '/admin/faculty', label: 'Faculty', icon: Users },
  { href: '/admin/academics', label: 'Academics', icon: BookOpen },
  { href: '/admin/timetable-builder', label: 'Timetable', icon: Calendar },
  { href: '/admin/examinations', label: 'Exams', icon: FileText },
  { href: '/admin/notices', label: 'Notices', icon: Bell },
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
  { href: '/analytics/admissions', label: 'Admissions', icon: Users },
  { href: '/analytics/academic-performance', label: 'Academic', icon: BookOpen },
  { href: '/analytics/placement', label: 'Placement', icon: GraduationCap },
  { href: '/analytics/financial-health', label: 'Financial', icon: DollarSign },
];

const ROLE_CONFIG: Record<string, { nav: typeof STUDENT_NAV; title: string; color: string }> = {
  student: { nav: STUDENT_NAV, title: 'Student Portal', color: 'bg-success' },
  faculty: { nav: FACULTY_NAV, title: 'Faculty Portal', color: 'bg-info' },
  admin: { nav: ADMIN_NAV, title: 'Admin Console', color: 'bg-primary' },
  hod: { nav: FACULTY_NAV, title: 'HOD Dashboard', color: 'bg-primary' },
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

  const config = role ? ROLE_CONFIG[role] : ROLE_CONFIG.student;
  const navItems = config?.nav || STUDENT_NAV;

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
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
              const isActive = location.pathname === item.href || 
                (item.href !== '/admin' && item.href !== '/student' && item.href !== '/faculty' && item.href !== '/finance' && item.href !== '/library' && item.href !== '/analytics' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  title={item.label}
                  className={cn(
                    "group flex items-center gap-0 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden shrink-0",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span
                    className="overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out max-w-0 group-hover:max-w-[120px] group-hover:ml-1.5 opacity-0 group-hover:opacity-100"
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" size="icon" className="shrink-0 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </Button>

            <div className="relative">
              <Button
                variant="ghost"
                className="gap-2 hidden sm:flex"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
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
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border-2 border-border bg-popover p-2 shadow-lg">
                  <div className="px-3 py-2 border-b border-border mb-2">
                    <p className="font-medium text-sm truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  
                  <button
                    onClick={() => setIsDark(!isDark)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                  >
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </button>

                  <Link
                    to="/settings"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {isSidebarOpen && (
          <div className="md:hidden border-t-2 border-border bg-background">
            <nav className="flex flex-col p-4 gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

export function useLayout() {
  const { role } = useAuth();
  return { role };
}
