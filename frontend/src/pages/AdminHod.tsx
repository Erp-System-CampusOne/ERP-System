import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ShieldCheck, Search, Users, GraduationCap, BookOpen,
  Award, CheckCircle2, AlertCircle, Phone, Mail, UserX,
  Loader2, RefreshCw, Plus, Building2, Calendar, Sparkles, Check, ArrowRight
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useInstitutionHod, useRelieveInstitutionHod } from '@/features/admin/hooks';
import { AddHodDialog } from '@/components/shared/AddHodDialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function AdminHod() {
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;

  const { data: hodData, isLoading, refetch, isFetching } = useInstitutionHod();
  const relieveMutation = useRelieveInstitutionHod();

  // Relieve Confirmation Modal State
  const [showRelieveModal, setShowRelieveModal] = useState(false);

  const activeHod = hodData?.activeHod || null;
  const departments = hodData?.departments || [];
  const history = hodData?.history || [];
  const totalFacultyCount = hodData?.totalFacultyCount || 0;
  const totalStudentCount = hodData?.totalStudentCount || 0;
  const totalCourseCount = hodData?.totalCourseCount || 0;

  const handleConfirmRelieve = async () => {
    try {
      await relieveMutation.mutateAsync();
      setShowRelieveModal(false);
      refetch();
    } catch (err) {
      console.error(err);
      alert('Failed to relieve Institution HOD.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <div className="border-b-2 border-border/60 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-background">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <Wrapper variants={container} initial="hidden" animate="show" className="space-y-6">
            <Wrapper variants={item}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3.5 rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/20">
                    <Award className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
                        Institution Head of Department
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                        Single Institution Role
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Unified academic leadership overseeing all departments, curricula, faculty workloads, and examination governance
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="h-10"
                  >
                    <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
                    Refresh
                  </Button>
                  <AddHodDialog
                    triggerText={activeHod ? "Replace / Re-appoint HOD" : "+ Appoint Institution HOD"}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold h-10 px-4 shadow-sm"
                  />
                </div>
              </div>
            </Wrapper>

            {/* Metrics Grid */}
            <Wrapper variants={item}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-2 border-border/60 bg-card shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Institution HOD Status
                      </p>
                      <p className={cn(
                        "font-display text-xl font-bold mt-1 flex items-center gap-1.5",
                        activeHod ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                      )}>
                        {activeHod ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            Active & Appointed
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            Position Vacant
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activeHod ? activeHod.name : 'Needs appointment'}
                      </p>
                    </div>
                    <div className={cn(
                      "p-2.5 rounded-xl",
                      activeHod ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                    )}>
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-border/60 bg-card shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Academic Divisions
                      </p>
                      <p className="font-display text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400 tabular-nums">
                        {departments.length} Departments
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        CSE • ECE • MECH
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
                      <Building2 className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-border/60 bg-card shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Academic Faculty
                      </p>
                      <p className="font-display text-2xl font-bold mt-1 tabular-nums">
                        {totalFacultyCount} Members
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Under HOD oversight</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                      <Users className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-border/60 bg-card shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Students & Courses
                      </p>
                      <p className="font-display text-2xl font-bold mt-1 tabular-nums">
                        {totalStudentCount} / {totalCourseCount}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Students / Courses</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Wrapper>
          </Wrapper>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 space-y-8">
        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            <div className="h-64 bg-muted/50 rounded-2xl animate-pulse border border-border" />
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-44 bg-muted/50 rounded-2xl animate-pulse border border-border" />
              ))}
            </div>
          </div>
        )}

        {/* ─── Active Institution HOD Showcase Card ─── */}
        {!isLoading && activeHod && (
          <Card className="border-2 border-purple-500/30 bg-gradient-to-br from-card via-card to-purple-500/5 shadow-md overflow-hidden">
            <div className="h-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500" />
            <CardHeader className="pb-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center font-display text-2xl font-bold shadow-md shadow-purple-600/20">
                    {activeHod.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-2xl font-bold text-foreground">
                        {activeHod.name}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Appointed
                      </span>
                    </div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-0.5">
                      {activeHod.designation} • {activeHod.qualification}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Institution: {activeHod.institution?.name || 'CampusOne Institute of Technology'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-950/30"
                    onClick={() => setShowRelieveModal(true)}
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Relieve Institution HOD
                  </Button>
                  <AddHodDialog
                    triggerText="Replace Appointee"
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 rounded-2xl bg-muted/40 border border-border">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">CampusOne ID</p>
                  <p className="font-mono font-bold text-sm text-primary">{activeHod.campusId || 'COID1002'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Employee Code</p>
                  <p className="font-mono font-bold text-sm text-foreground">{activeHod.employeeCode}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Email Address</p>
                  <p className="font-medium text-sm text-foreground flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{activeHod.email}</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Phone</p>
                  <p className="font-medium text-sm text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {activeHod.phone || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Appointed At</p>
                  <p className="font-medium text-sm text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {activeHod.appointedAt ? format(new Date(activeHod.appointedAt), 'PPP') : 'Active'}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-purple-600" />
                <span>
                  <strong>Full Institution Scope:</strong> {activeHod.name} is the sole academic head governing all {departments.length} departments. They hold authority over course offerings, timetable generation, faculty allocation, document verification, and examination marks approval across the entire institution.
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Vacant State Card ─── */}
        {!isLoading && !activeHod && (
          <Card className="border-2 border-dashed border-amber-500/40 bg-amber-500/5 text-center py-10 shadow-sm">
            <CardContent className="space-y-4 max-w-lg mx-auto">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display text-xl font-bold text-foreground">
                  No Active Institution HOD Appointed
                </h3>
                <p className="text-sm text-muted-foreground">
                  The institution currently does not have an appointed Head of Department. Appoint an HOD to oversee academic departments, verify student documents, and finalize exam results.
                </p>
              </div>
              <AddHodDialog
                triggerText="+ Appoint Institution HOD"
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 h-11"
              />
            </CardContent>
          </Card>
        )}

        {/* ─── Academic Divisions Under Oversight ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">
                Academic Divisions Under HOD Oversight
              </h3>
              <p className="text-xs text-muted-foreground">
                All academic departments are governed under a single institutional academic standard
              </p>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              3 Departments Active
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((dept: any) => (
              <Card key={dept.id} className="border-2 border-border/70 hover:border-purple-500/40 transition-all bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-muted text-foreground border border-border">
                        {dept.code}
                      </span>
                      <CardTitle className="font-display text-base font-bold mt-2">
                        {dept.name}
                      </CardTitle>
                    </div>
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-muted/30 border border-border text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Faculty</p>
                      <p className="font-bold text-sm">{dept.facultyCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Students</p>
                      <p className="font-bold text-sm">{dept.studentCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Courses</p>
                      <p className="font-bold text-sm">{dept.courseCount}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
                    <span>Executive Oversight:</span>
                    <span className="font-medium text-purple-600 dark:text-purple-400">
                      {activeHod ? activeHod.name : 'Vacant'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ─── Governance History & Tenure Log ─── */}
        {history.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="font-display text-lg font-bold text-foreground">
              Institution HOD Appointment History
            </h3>
            <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-4 py-3">Appointee</th>
                      <th className="px-4 py-3">CampusOne ID</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Appointed Date</th>
                      <th className="px-4 py-3">Relieved Date</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.map((record: any) => (
                      <tr key={record.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {record.user?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-primary">
                          {record.user?.campusId || '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {record.user?.email || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {record.appointedAt ? format(new Date(record.appointedAt), 'PP') : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {record.relievedAt ? format(new Date(record.relievedAt), 'PP') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                            record.isActive 
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {record.isActive ? 'Active Serving' : 'Relieved'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Relieve Confirmation Modal */}
      <Dialog open={showRelieveModal} onOpenChange={setShowRelieveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <UserX className="w-5 h-5" />
              Relieve Institution Head of Department
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to relieve <strong>{activeHod?.name}</strong> from the role of Institution Head of Department?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive space-y-1">
            <p className="font-semibold">Consequences of relieving the HOD:</p>
            <ul className="list-disc list-inside space-y-0.5 opacity-90">
              <li>The institution HOD role will become vacant until a new appointee is selected.</li>
              <li>{activeHod?.name} will be retained as a Senior Professor without executive HOD authority.</li>
              <li>Academic approvals will be delegated to the System Administrator during the vacancy.</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowRelieveModal(false)}
              disabled={relieveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRelieve}
              disabled={relieveMutation.isPending}
            >
              {relieveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm & Relieve HOD
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
