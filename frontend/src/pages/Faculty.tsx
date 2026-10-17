import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  Users, ClipboardList, ArrowRight, BookOpen, TrendingUp,
  Clock, Calendar, Bookmark
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFacultyProfile, useFacultyWorkload, useFacultyAttendance } from '@/features/faculty/hooks';
import { cn } from '@/lib/utils';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

function StatCard({ label, value, subtext, icon: Icon, color }: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  color: string;
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
        <div className="mt-4">
          <span className="font-display text-3xl font-bold tracking-tight tabular-nums">{value}</span>
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

export default function Faculty() {
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;
  
  const { data: profile } = useFacultyProfile();
  const { data: workload } = useFacultyWorkload();
  useFacultyAttendance();

  const totalHours = workload?.reduce((acc, w) => acc + w.hoursPerWeek, 0) || 0;
  const totalStudents = workload?.reduce((acc, w) => acc + (w.totalStudents || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-2 border-border/60 bg-gradient-to-r from-primary/5 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <Wrapper variants={container} initial="hidden" animate="show" className="space-y-6">
            <Wrapper variants={item}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="font-display text-3xl font-bold tracking-tight">
                    Faculty Dashboard
                  </h1>
                  <p className="mt-1 text-muted-foreground flex items-center gap-2 flex-wrap">
                    {profile?.campusId && (
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {profile.campusId}
                      </span>
                    )}
                    <span>{profile?.designation} • {profile?.department} • Emp Code: {profile?.employeeCode}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success/10 text-success font-medium">
                    <TrendingUp className="w-5 h-5" />
                    <span>{profile?.leaveBalance || 0} Leave Days</span>
                  </div>
                </div>
              </div>
            </Wrapper>

            <Wrapper variants={item}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                  label="Weekly Hours" 
                  value={`${totalHours}h`}
                  subtext={`${workload?.length || 0} courses assigned`}
                  icon={Clock}
                  color="bg-emerald-500"
                />
                <StatCard 
                  label="Total Students" 
                  value={totalStudents}
                  subtext="Across all sections"
                  icon={Users}
                  color="bg-blue-500"
                />
                <StatCard 
                  label="Classes Today" 
                  value={3}
                  subtext="Next: DBMS at 9:00 AM"
                  icon={Calendar}
                  color="bg-violet-500"
                />
                <StatCard 
                  label="Leave Balance" 
                  value={profile?.leaveBalance || 0}
                  subtext="Days available"
                  icon={Bookmark}
                  color="bg-amber-500"
                />
              </div>
            </Wrapper>
          </Wrapper>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 space-y-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-2 border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-display">Today's Schedule</CardTitle>
                <CardDescription>Monday, March 4, 2024</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/faculty/timetable">View All <ArrowRight className="ml-1 w-4 h-4" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                  <div className="flex flex-col items-center min-w-[60px]">
                    <span className="text-xs text-muted-foreground">09:00</span>
                    <span className="text-xs text-muted-foreground">10:00</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">Database Management Systems</p>
                    <p className="text-sm text-muted-foreground">Section A • CR-101</p>
                  </div>
                  <Button variant="outline" size="sm">Mark Attendance</Button>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                  <div className="flex flex-col items-center min-w-[60px]">
                    <span className="text-xs text-muted-foreground">11:00</span>
                    <span className="text-xs text-muted-foreground">12:00</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">Database Management Systems</p>
                    <p className="text-sm text-muted-foreground">Section B • CR-102</p>
                  </div>
                  <Button variant="outline" size="sm">Mark Attendance</Button>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                  <div className="flex flex-col items-center min-w-[60px]">
                    <span className="text-xs text-muted-foreground">14:00</span>
                    <span className="text-xs text-muted-foreground">16:00</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">Web Development Lab</p>
                    <p className="text-sm text-muted-foreground">Section A • Lab-201</p>
                  </div>
                  <Button variant="outline" size="sm">Mark Attendance</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-display">Assigned Courses</CardTitle>
                <CardDescription>Current semester workload</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/faculty/classes">View All <ArrowRight className="ml-1 w-4 h-4" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workload?.slice(0, 4).map((course) => (
                  <div key={course.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{course.courseName}</p>
                      <p className="text-sm text-muted-foreground">Section {course.section} • {course.roomNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold text-primary">{course.hoursPerWeek}h</p>
                      <p className="text-xs text-muted-foreground">{course.totalStudents} students</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction href="/faculty/attendance" icon={ClipboardList} label="Mark Attendance" description="Record student attendance" color="bg-emerald-500" />
            <QuickAction href="/faculty/classes" icon={Users} label="My Classes" description="View assigned batches" color="bg-blue-500" />
            <QuickAction href="/faculty/grading" icon={Bookmark} label="Grade Entry" description="Submit student grades" color="bg-violet-500" />
            <QuickAction href="/faculty/leaves" icon={Bookmark} label="Leave Requests" description="Apply for leave" color="bg-amber-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
