import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ShieldCheck, Search, Users, GraduationCap, BookOpen,
  Award, CheckCircle2, AlertCircle, Phone, Mail, UserX,
  Loader2, RefreshCw, Plus, Building2
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDepartmentHods, useRelieveDepartmentHod } from '@/features/admin/hooks';
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

  const { data: departmentHods = [], isLoading, refetch, isFetching } = useDepartmentHods();
  const relieveMutation = useRelieveDepartmentHod();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'appointed' | 'vacant'>('all');

  // Relieve Confirmation Modal State
  const [relieveTarget, setRelieveTarget] = useState<{ departmentId: string; departmentName: string; hodName: string } | null>(null);

  // Computed metrics
  const totalDepartments = departmentHods.length;
  const appointedCount = departmentHods.filter((d: any) => d.isAppointed).length;
  const vacantCount = totalDepartments - appointedCount;
  const totalFacultyCount = departmentHods.reduce((acc: number, d: any) => acc + (d.facultyCount || 0), 0);
  const totalStudentCount = departmentHods.reduce((acc: number, d: any) => acc + (d.studentCount || 0), 0);

  // Filtered list
  const filteredDepartments = departmentHods.filter((d: any) => {
    const matchesSearch =
      d.departmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.departmentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.hod?.name && d.hod.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.hod?.employeeCode && d.hod.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'appointed' && d.isAppointed) ||
      (statusFilter === 'vacant' && !d.isAppointed);

    return matchesSearch && matchesStatus;
  });

  const handleConfirmRelieve = async () => {
    if (!relieveTarget) return;
    try {
      await relieveMutation.mutateAsync(relieveTarget.departmentId);
      setRelieveTarget(null);
    } catch (err) {
      console.error(err);
      alert('Failed to relieve HOD.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <div className="border-b-2 border-border/60 bg-gradient-to-r from-purple-500/5 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <Wrapper variants={container} initial="hidden" animate="show" className="space-y-6">
            <Wrapper variants={item}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-purple-600 text-white shadow-sm">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
                      HOD Management Console
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Oversee and onboard Department Heads across all academic divisions
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
                    triggerText="+ Onboard New HOD"
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold h-10 px-4"
                  />
                </div>
              </div>
            </Wrapper>

            {/* Metrics Grid */}
            <Wrapper variants={item}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Total Departments
                      </p>
                      <p className="font-display text-2xl font-bold mt-1 tabular-nums">{totalDepartments}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Academic Divisions</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
                      <Building2 className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Appointed HODs
                      </p>
                      <p className="font-display text-2xl font-bold mt-1 text-emerald-600 tabular-nums">
                        {appointedCount}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {totalDepartments > 0 ? `${Math.round((appointedCount / totalDepartments) * 100)}% coverage` : '0%'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Vacant Departments
                      </p>
                      <p className="font-display text-2xl font-bold mt-1 text-amber-600 tabular-nums">
                        {vacantCount}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Needs appointment</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Department Roster
                      </p>
                      <p className="font-display text-2xl font-bold mt-1 tabular-nums">
                        {totalFacultyCount} / {totalStudentCount}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Faculty / Students</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                      <Users className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Wrapper>
          </Wrapper>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 space-y-6">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search department, HOD name, code..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto bg-muted/40 p-1 rounded-lg border border-border">
            <Button
              variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className="text-xs h-8 px-3"
            >
              All ({totalDepartments})
            </Button>
            <Button
              variant={statusFilter === 'appointed' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('appointed')}
              className="text-xs h-8 px-3 text-emerald-600 font-medium"
            >
              Appointed ({appointedCount})
            </Button>
            <Button
              variant={statusFilter === 'vacant' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('vacant')}
              className="text-xs h-8 px-3 text-amber-600 font-medium"
            >
              Vacant ({vacantCount})
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-44 bg-muted/50 rounded-2xl animate-pulse border border-border" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredDepartments.length === 0 && (
          <Card className="border-2 border-dashed border-border/80 text-center py-12">
            <CardContent className="space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold">No Departments Found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? 'No academic divisions or HODs matched your search query.'
                  : 'No departments configured in the institution yet.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Department Cards Grid */}
        {!isLoading && filteredDepartments.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredDepartments.map((dept: any) => (
              <Card
                key={dept.departmentId}
                className={cn(
                  "border-2 transition-all duration-200 overflow-hidden",
                  dept.isAppointed
                    ? "border-border/80 hover:border-purple-500/40 hover:shadow-md"
                    : "border-amber-500/30 bg-amber-500/[0.02]"
                )}
              >
                <div className="p-5 space-y-4">
                  {/* Department Title & Status Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {dept.departmentCode}
                        </span>
                        <h2 className="font-display text-lg font-bold text-foreground">
                          {dept.departmentName}
                        </h2>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dept.facultyCount} Faculty Members • {dept.studentCount} Registered Students • {dept.courseCount} Courses
                      </p>
                    </div>

                    {dept.isAppointed ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Appointed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Vacant
                      </span>
                    )}
                  </div>

                  {/* HOD Profile Section or Vacant State */}
                  {dept.isAppointed && dept.hod ? (
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-600/10 text-purple-700 flex items-center justify-center font-bold text-sm">
                            {dept.hod.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                              {dept.hod.name}
                              <Award className="w-3.5 h-3.5 text-purple-600" />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {dept.hod.designation} • {dept.hod.qualification}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">
                          {dept.hod.employeeCode}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground border-t border-border/50">
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{dept.hod.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{dept.hod.phone || 'No phone recorded'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/[0.04] text-center space-y-2">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        No Head of Department appointed yet.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This department currently lacks an executive head for curriculum allocation and student documents.
                      </p>
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                    {dept.isAppointed ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            setRelieveTarget({
                              departmentId: dept.departmentId,
                              departmentName: dept.departmentName,
                              hodName: dept.hod?.name || 'HOD',
                            })
                          }
                        >
                          <UserX className="w-3.5 h-3.5 mr-1" />
                          Relieve HOD
                        </Button>
                        <AddHodDialog
                          defaultDepartmentId={dept.departmentId}
                          defaultDepartmentName={dept.departmentName}
                          triggerText="Replace HOD"
                          variant="outline"
                          className="text-xs h-8"
                        />
                      </>
                    ) : (
                      <AddHodDialog
                        defaultDepartmentId={dept.departmentId}
                        defaultDepartmentName={dept.departmentName}
                        triggerText="Appoint HOD"
                        variant="default"
                        className="text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white font-medium"
                      />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Relieve Confirmation Dialog */}
      <Dialog open={!!relieveTarget} onOpenChange={(open: boolean) => !open && setRelieveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <UserX className="w-5 h-5" />
              Relieve Head of Department
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to relieve{' '}
              <strong className="text-foreground">{relieveTarget?.hodName}</strong> from serving as HOD for{' '}
              <strong className="text-foreground">{relieveTarget?.departmentName}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground space-y-1">
            <p>• The department will immediately transition to <strong>Vacant</strong> status.</p>
            <p>• Departmental operations can be resumed once a new HOD is appointed.</p>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setRelieveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={relieveMutation.isPending}
              onClick={handleConfirmRelieve}
            >
              {relieveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Relieve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
