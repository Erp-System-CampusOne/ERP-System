import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, TrendingUp, Users, GraduationCap, 
  Building2, ArrowRight, Activity, Award
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useInstitutionalOverview, useAdmissionsAnalytics, useAcademicPerformanceAnalytics, usePlacementAnalytics } from '@/features/analytics/hooks';
import { cn } from '@/lib/utils';
import { AddStaffDialog } from '@/components/shared/AddStaffDialog';

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

export default function Analytics() {
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;
  const { data: overview } = useInstitutionalOverview();
  const { data: admissions } = useAdmissionsAnalytics();
  const { data: academic } = useAcademicPerformanceAnalytics();
  const { data: placementData } = usePlacementAnalytics();
  // The API stores CTC in rupees; this dashboard presents it in lakhs.
  const placement = placementData ? {
    ...placementData,
    averageCTC: placementData.averageCTC / 100000,
    highestCTC: placementData.highestCTC / 100000,
  } : placementData;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-2 border-border/60 bg-gradient-to-r from-primary/5 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <Wrapper variants={container} initial="hidden" animate="show" className="space-y-6">
            <Wrapper variants={item}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="font-display text-3xl font-bold tracking-tight">
                    Institutional Analytics
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    Executive scorecard and KPI dashboard
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <AddStaffDialog role="analytics" roleLabel="Analytics Officer" />
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success/10 text-success font-medium">
                    <Award className="w-5 h-5" />
                    <span>NAAC: {overview?.naacGrade || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </Wrapper>

            <Wrapper variants={item}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                  label="Total Students" 
                  value={overview?.totalStudents?.toLocaleString() || '0'}
                  subtext="Enrolled across all programs"
                  icon={Users}
                  color="bg-emerald-500"
                />
                <StatCard 
                  label="Faculty Ratio" 
                  value={overview?.facultyStudentRatio || 'N/A'}
                  subtext={`${overview?.totalFaculty || 0} faculty members`}
                  icon={GraduationCap}
                  color="bg-blue-500"
                />
                <StatCard 
                  label="Placement Rate" 
                  value={`${placement?.placementPercentage || 0}%`}
                  subtext={`Avg CTC: ₹${placement?.averageCTC || 0}L`}
                  icon={TrendingUp}
                  color="bg-violet-500"
                />
                <StatCard 
                  label="Pass Rate" 
                  value={`${academic?.overallPassPercentage || 0}%`}
                  subtext="Overall academic performance"
                  icon={Activity}
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
                <CardTitle className="text-lg font-display">Admissions Overview</CardTitle>
                <CardDescription>Application and enrollment metrics</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/analytics/admissions">Details <ArrowRight className="ml-1 w-4 h-4" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Total Applications</span>
                  <span className="font-mono font-bold tabular-nums">{admissions?.totalApplications?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Admitted</span>
                  <span className="font-mono font-bold tabular-nums">{admissions?.admittedStudents || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Acceptance Rate</span>
                  <span className="font-mono font-bold tabular-nums">{admissions?.acceptanceRate || 0}%</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Gender Ratio (M:F)</span>
                  <span className="font-mono font-bold tabular-nums">{admissions?.genderRatio ? `${admissions.genderRatio.male}:${admissions.genderRatio.female}` : 'Not tracked'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-display">Placement Highlights</CardTitle>
                <CardDescription>Recruitment statistics</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/analytics/placement">Details <ArrowRight className="ml-1 w-4 h-4" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Placement Rate</span>
                  <span className="font-mono font-bold tabular-nums text-success">{placement?.placementPercentage || 0}%</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Average CTC</span>
                  <span className="font-mono font-bold tabular-nums">₹{placement?.averageCTC || 0}L</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Highest CTC</span>
                  <span className="font-mono font-bold tabular-nums">₹{placement?.highestCTC || 0}L</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Total Offers</span>
                  <span className="font-mono font-bold tabular-nums">{placement?.totalOffers || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2 border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-display">Department Performance</CardTitle>
              <CardDescription>Pass rates by department</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/analytics/academic-performance">Details <ArrowRight className="ml-1 w-4 h-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {academic?.departmentPassRates?.map((dept) => (
                <div key={dept.department} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{dept.department}</span>
                    <span className="font-mono tabular-nums">{dept.passRate}%</span>
                  </div>
                  <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500" 
                      style={{ width: `${dept.passRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">Analytics Modules</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link 
              to="/analytics/admissions"
              className="group flex items-center gap-4 p-4 rounded-xl border-2 border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="p-3 rounded-xl bg-emerald-500">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">Admissions</p>
                <p className="text-sm text-muted-foreground">Enrollment funnel</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
            <Link 
              to="/analytics/academic-performance"
              className="group flex items-center gap-4 p-4 rounded-xl border-2 border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="p-3 rounded-xl bg-blue-500">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">Academic</p>
                <p className="text-sm text-muted-foreground">Performance metrics</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
            <Link 
              to="/analytics/placement"
              className="group flex items-center gap-4 p-4 rounded-xl border-2 border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="p-3 rounded-xl bg-violet-500">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">Placement</p>
                <p className="text-sm text-muted-foreground">Recruitment stats</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
            <Link 
              to="/analytics/financial-health"
              className="group flex items-center gap-4 p-4 rounded-xl border-2 border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="p-3 rounded-xl bg-amber-500">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">Financial</p>
                <p className="text-sm text-muted-foreground">Revenue analytics</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
