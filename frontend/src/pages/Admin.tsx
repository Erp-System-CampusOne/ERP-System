import { SystemActivity } from '@/api/apiInterface';
import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  Users, GraduationCap, BookOpen, FileText, 
  Bell, Shield, DollarSign, ArrowRight, UserCheck, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useInstitutionalMetrics, useStudentsList, useFeeDefaulters, useNotices } from '@/features/admin/hooks';
import { useSystemActivity } from '@/features/analytics/hooks';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

function StatCard({ label, value, subtext, icon: Icon, color, trend }: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Card className="border-2 border-border/60 bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <div className={cn("p-2.5 rounded-xl", color)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-3xl font-bold tracking-tight tabular-nums">{value}</span>
          {trend && (
            <span className={cn("text-sm font-medium", trend.positive ? 'text-success' : 'text-destructive')}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        {subtext && <p className="mt-1.5 text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

function QuickAction({ href, icon: Icon, label, description, color }: {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
}) {
  return (
    <Link 
      to={href}
      className="group flex items-center gap-4 p-4 rounded-xl border-2 border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
    >
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

export default function Admin() {
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;
  
  const { data: metrics } = useInstitutionalMetrics();
  const { data: students } = useStudentsList();
  const { data: defaulters } = useFeeDefaulters();
  const { data: notices } = useNotices();
  const { data: systemActivity } = useSystemActivity();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-2 border-border/60 bg-gradient-to-r from-primary/5 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <Wrapper variants={container} initial="hidden" animate="show" className="space-y-6">
            <Wrapper variants={item}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="font-display text-3xl font-bold tracking-tight">
                    Admin Console
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    Institutional management and oversight
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success/10 text-success font-medium">
                    <Shield className="w-5 h-5" />
                    <span>NAAC Grade: {metrics?.naacGrade || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </Wrapper>

            <Wrapper variants={item}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                  label="Total Students" 
                  value={metrics?.totalStudents?.toLocaleString() || '0'}
                  subtext={`${students?.length || 0} in current semester`}
                  icon={GraduationCap}
                  color="bg-emerald-500"
                />
                <StatCard 
                  label="Total Faculty" 
                  value={metrics?.totalFaculty || 0}
                  subtext={`Ratio: ${metrics?.facultyStudentRatio || 'N/A'}`}
                  icon={Users}
                  color="bg-blue-500"
                />
                <StatCard 
                  label="Fee Collection" 
                  value={`${metrics?.feeCollectionRate || 0}%`}
                  subtext={`₹${((metrics?.totalFeeRevenue || 0) / 10000000).toFixed(1)}Cr collected`}
                  icon={DollarSign}
                  color="bg-amber-500"
                />
                <StatCard 
                  label="Avg Attendance" 
                  value={`${metrics?.averageAttendance || 0}%`}
                  subtext="Campus-wide average"
                  icon={UserCheck}
                  color="bg-violet-500"
                />
              </div>
            </Wrapper>
          </Wrapper>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 space-y-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-2 border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-display">Recent Activity</CardTitle>
                  <CardDescription>System activity and updates</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemActivity?.map((activity: SystemActivity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                      <div className={cn("p-2 rounded-lg", 
                        activity.type === 'success' ? 'bg-success/10' :
                        activity.type === 'warning' ? 'bg-warning/10' :
                        activity.type === 'destructive' ? 'bg-destructive/10' : 'bg-info/10'
                      )}>
                        {activity.type === 'success' ? <GraduationCap className="w-5 h-5 text-success" /> :
                         activity.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-warning" /> :
                         <FileText className={cn("w-5 h-5", activity.type === 'destructive' ? 'text-destructive' : 'text-info')} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{activity.action}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                  {(!systemActivity || systemActivity.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-display">Fee Defaulters</CardTitle>
                  <CardDescription>Students with pending fee dues</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/finance/dues">View All <ArrowRight className="ml-1 w-4 h-4" /></Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {defaulters?.slice(0, 3).map((defaulter) => (
                    <div key={defaulter.studentId} className="flex items-center gap-4 p-3 rounded-lg bg-destructive/5 border-l-4 border-destructive">
                      <div className="p-2 rounded-lg bg-destructive/10">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{defaulter.name}</p>
                        <p className="text-sm text-muted-foreground">{defaulter.department} • Roll: {defaulter.rollNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold text-destructive tabular-nums">₹{defaulter.dueAmount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{defaulter.daysOverdue} days overdue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-2 border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Departments</span>
                  <span className="font-mono font-semibold tabular-nums">{metrics?.totalDepartments || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active Courses</span>
                  <span className="font-mono font-semibold tabular-nums">{metrics?.activeCourses || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Placement Rate</span>
                  <span className="font-mono font-semibold tabular-nums text-success">{metrics?.placementRate || 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">NIRF Score</span>
                  <span className="font-mono font-semibold tabular-nums">{metrics?.nirfRankingScore || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg font-display">Urgent Notices</CardTitle>
                <Bell className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notices?.filter((n) => n.isUrgent).slice(0, 3).map((notice) => (
                    <Link 
                      key={notice.id} 
                      to="/admin/notices"
                      className="block p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive mb-1">
                        Urgent
                      </span>
                      <p className="font-medium text-sm text-foreground line-clamp-2">{notice.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(notice.publishedAt), 'MMM d, yyyy')}
                      </p>
                    </Link>
                  ))}
                  {(!notices || notices.filter((n) => n.isUrgent).length === 0) && (
                    <p className="text-center text-muted-foreground py-4">No urgent notices</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <QuickAction href="/admin/students" icon={GraduationCap} label="Students" description="Manage student records" color="bg-emerald-500" />
            <QuickAction href="/admin/faculty" icon={Users} label="Faculty" description="Faculty directory" color="bg-blue-500" />
            <QuickAction href="/admin/hod" icon={ShieldCheck} label="HODs" description="Department heads" color="bg-purple-600" />
            <QuickAction href="/admin/academics" icon={BookOpen} label="Academics" description="Courses & curriculum" color="bg-violet-500" />
            <QuickAction href="/admin/examinations" icon={FileText} label="Examinations" description="Exam management" color="bg-amber-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
