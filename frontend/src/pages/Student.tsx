import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Calendar, ClipboardList, DollarSign, FileText, 
  Library, TrendingUp, Award, Bell, ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStudentProfile, useStudentAttendance, useStudentCourses, useStudentTimetable, useNotices, useExaminations } from '@/features/student/hooks';
import { cn } from '@/lib/utils';
import type { Course, TimetableEntry, Examination } from '@/api/apiInterface';

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
  trend?: 'up' | 'down';
}) {
  return (
    <Card className="border-2 border-border/60 bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <div className={cn("p-2.5 rounded-xl", color)}>
            <Icon className="w-5 h-5 text-background" />
          </div>
        </div>
        <div className="mt-4">
          <span className="font-display text-3xl font-bold tracking-tight tabular-nums">{value}</span>
          {trend && (
            <span className={cn("ml-2 text-sm font-medium", trend === 'up' ? 'text-success' : 'text-destructive')}>
              {trend === 'up' ? '↑' : '↓'}
            </span>
          )}
        </div>
        {subtext && <p className="mt-1.5 text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

function AttendanceRing({ percentage }: { percentage: number }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 75 ? 'text-success' : percentage >= 65 ? 'text-warning' : 'text-destructive';
  
  return (
    <div className="relative w-28 h-28">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
        <circle 
          cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" 
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn("transition-all duration-1000", color)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-display text-2xl font-bold tabular-nums", color)}>{percentage}%</span>
        <span className="text-xs text-muted-foreground">Attendance</span>
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label, description }: {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
}) {
  return (
    <Link 
      to={href}
      className="group flex items-center gap-4 p-4 rounded-xl border-2 border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
    >
      <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

export default function Student() {
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;
  
  const { data: profile } = useStudentProfile();
  const { data: attendance } = useStudentAttendance();
  const { data: courses } = useStudentCourses();
  const { data: timetable } = useStudentTimetable();
  const { data: notices } = useNotices();

  const todayClasses = timetable?.entries.filter((e: TimetableEntry) => e.dayOfWeek === 'Monday').slice(0, 3) || [];
  const { data: examinations } = useExaminations();
  const upcomingExams = (examinations?.slice(0, 2) || []) as Examination[];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-2 border-border/60 bg-gradient-to-r from-primary/5 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <Wrapper variants={container} initial="hidden" animate="show" className="space-y-6">
            <Wrapper variants={item}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="font-display text-3xl font-bold tracking-tight">
                    Welcome back, {profile?.name?.split(' ')[0] || 'Student'}! 👋
                  </h1>
                  <p className="mt-1 text-muted-foreground flex items-center gap-2 flex-wrap">
                    {profile?.campusId && (
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {profile.campusId}
                      </span>
                    )}
                    <span>{profile?.department} • Semester {profile?.semester} • Section {profile?.section} • Roll No: {profile?.rollNumber}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success/10 text-success font-medium">
                    <Award className="w-5 h-5" />
                    <span>CGPA: {profile?.cgpa || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </Wrapper>

            <Wrapper variants={item}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                  label="Overall Attendance" 
                  value={`${attendance?.overallPercentage || 0}%`}
                  subtext={`${attendance?.attendedLectures || 0} of ${attendance?.totalLectures || 0} classes`}
                  icon={ClipboardList}
                  color="bg-success"
                  trend={attendance?.overallPercentage && attendance.overallPercentage >= 75 ? 'up' : 'down'}
                />
                <StatCard 
                  label="Current CGPA" 
                  value={profile?.cgpa || 'N/A'}
                  subtext={`${profile?.semester || 0} semester`}
                  icon={TrendingUp}
                  color="bg-info"
                  trend="up"
                />
                <StatCard 
                  label="Enrolled Courses" 
                  value={courses?.length || 0}
                  subtext={`${courses?.filter((c: Course) => c.type === 'lab').length || 0} lab courses`}
                  icon={BookOpen}
                  color="bg-info"
                />
                <StatCard 
                  label="Fee Status" 
                  value={profile?.feeStatus === 'paid' ? 'Paid' : 'Due'}
                  subtext={profile?.feeStatus === 'paid' ? 'All fees cleared' : 'View details'}
                  icon={DollarSign}
                  color={profile?.feeStatus === 'paid' ? 'bg-success' : 'bg-destructive'}
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
                  <CardTitle className="text-lg font-display">Today's Schedule</CardTitle>
                  <CardDescription>{format(new Date(), 'EEEE, MMMM d, yyyy')}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/student/timetable">View All <ArrowRight className="ml-1 w-4 h-4" /></Link>
                </Button>
              </CardHeader>
              <CardContent>
                {todayClasses.length > 0 ? (
                  <div className="space-y-3">
                    {todayClasses.map((cls: TimetableEntry, idx: number) => (
                      <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col items-center min-w-[60px]">
                          <span className="text-xs text-muted-foreground">Period</span>
                          <span className="font-mono text-sm font-semibold">{cls.period}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{cls.subjectName}</p>
                          <p className="text-sm text-muted-foreground">{cls.facultyName} • {cls.roomNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm text-muted-foreground">{cls.timeSlot}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No classes scheduled for today</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-display">Upcoming Examinations</CardTitle>
                  <CardDescription>Mid-semester exam schedule</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/student/exams">View All <ArrowRight className="ml-1 w-4 h-4" /></Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingExams.map((exam) => (
                    <div key={exam.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border-l-4 border-warning">
                      <div className="p-2 rounded-lg bg-warning/10">
                        <FileText className="w-5 h-5 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{exam.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(exam.startDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">Download Hall Ticket</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-2 border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display">Attendance Overview</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <AttendanceRing percentage={attendance?.overallPercentage || 0} />
                <div className="mt-4 w-full space-y-2">
                  {attendance?.records.slice(0, 4).map((record) => (
                    <div key={record.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[140px]">{record.subjectName}</span>
                      <span className={cn(
                        "font-mono font-semibold tabular-nums",
                        record.percentage >= 75 ? 'text-success' : record.percentage >= 65 ? 'text-warning' : 'text-destructive'
                      )}>
                        {record.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-3 w-full" asChild>
                  <Link to="/student/attendance">View Full Report <ArrowRight className="ml-1 w-4 h-4" /></Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg font-display">Notices</CardTitle>
                <Bell className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notices?.slice(0, 3).map((notice) => (
                    <Link 
                      key={notice.id} 
                      to="/student/notices"
                      className="block p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {notice.isUrgent && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive mb-1">
                          Urgent
                        </span>
                      )}
                      <p className="font-medium text-sm text-foreground line-clamp-2">{notice.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(notice.publishedAt), 'MMM d, yyyy')}
                      </p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction href="/student/courses" icon={BookOpen} label="My Courses" description="View syllabus and materials" />
            <QuickAction href="/student/attendance" icon={ClipboardList} label="Attendance" description="Track your attendance" />
            <QuickAction href="/student/fees" icon={DollarSign} label="Fee Payment" description="Pay fees online" />
            <QuickAction href="/student/library" icon={Library} label="Library" description="Borrowed books" />
          </div>
        </div>
      </div>
    </div>
  );
}
