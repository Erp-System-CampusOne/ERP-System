import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  Users, GraduationCap, BookOpen, Calendar,
  FileCheck, Plus, Search, CheckCircle2,
  Download, Save, Loader2, UploadCloud,
  XCircle, ArrowRight, Award, Clock, AlertCircle,
  Building2, Sparkles
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import {
  useStudentsList,
  useFacultyList,
  useDepartments,
  useCourses,
  useCourseMutations,
  useDocumentQueue,
  useDocumentMutations,
  useTimetableMutations
} from '@/features/admin/hooks';
import { apiConfig } from '@/api/apiCall';
import { useAuth } from '@/contexts/AuthContext';
import { AddStudentDialog } from '@/components/shared/AddStudentDialog';
import { AddStaffDialog } from '@/components/shared/AddStaffDialog';
import { AssignExaminerDialog } from '@/components/shared/AssignExaminerDialog';
import { Course, Faculty, Student } from '@/api/apiInterface';
import { cn } from '@/lib/utils';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const TIME_SLOTS = [
  { period: 1, time: '09:00 - 09:55' },
  { period: 2, time: '09:55 - 10:50' },
  { period: 3, time: '10:50 - 11:45' },
  { period: 4, time: '11:45 - 12:40' },
  { period: 5, time: '01:30 - 02:25' },
  { period: 6, time: '02:25 - 03:20' },
  { period: 7, time: '03:20 - 04:15' },
];

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-14 bg-muted/60 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

function getFeeStatusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case 'paid':
      return 'bg-success/10 text-success border-success/20';
    case 'partial':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'due':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  color,
}: {
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
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-3xl font-bold tracking-tight tabular-nums">{value}</span>
        </div>
        {subtext && <p className="mt-1.5 text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

function DivisionSelector({
  departments,
  effectiveDeptId,
  onSelect
}: {
  departments: any[];
  effectiveDeptId: string;
  onSelect: (id: string) => void;
}) {
  if (departments.length <= 1) return null;
  return (
    <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-xl border-2 border-border/60 shadow-xs">
      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground font-medium">Division:</span>
      <select
        aria-label="Department Division"
        className="h-7 text-xs bg-transparent border-0 font-semibold focus:outline-none cursor-pointer text-foreground"
        value={effectiveDeptId}
        onChange={(e) => onSelect(e.target.value)}
      >
        {departments.map((d: any) => (
          <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
        ))}
      </select>
    </div>
  );
}

export default function HodDashboard() {
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;

  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Data queries
  const { data: departments = [] } = useDepartments();
  const { data: studentsData = [], isLoading: loadingStudents } = useStudentsList();
  const { data: facultyData = [], isLoading: loadingFaculty } = useFacultyList();
  const { data: coursesData = [], isLoading: loadingCourses } = useCourses();
  const { data: documentRequests = [], isLoading: loadingDocs } = useDocumentQueue();

  const courseMutations = useCourseMutations();
  const documentMutations = useDocumentMutations();
  const timetableMutations = useTimetableMutations();

  // Determine HOD's active department
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const effectiveDeptId = selectedDeptId || departments[0]?.id || '';
  const activeDepartment = departments.find(d => d.id === effectiveDeptId) || departments[0];
  const deptName = activeDepartment?.name || 'Department of Computer Science';

  // Filter department scoped data
  const deptStudents = (studentsData as Student[]).filter(
    s => !effectiveDeptId || s.department === deptName || (s as any).departmentId === effectiveDeptId
  );
  const deptFaculty = (facultyData as Faculty[]).filter(
    f => !effectiveDeptId || f.department === deptName || (f as any).departmentId === effectiveDeptId
  );
  const deptCourses = (coursesData as Course[]).filter(
    c => !effectiveDeptId || c.department === deptName || (c as any).departmentId === effectiveDeptId
  );
  const pendingDocs = documentRequests.filter((d: any) => d.status === 'pending');

  // Search & Filters
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSemesterFilter, setStudentSemesterFilter] = useState<string>('all');
  const [facultySearch, setFacultySearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [courseSemesterFilter, setCourseSemesterFilter] = useState<string>('all');
  const [docFilter, setDocFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');

  // Modal states: Course Add/Edit Allocation
  const [allocatingCourse, setAllocatingCourse] = useState<Course | null>(null);
  const [targetFacultyId, setTargetFacultyId] = useState<string>('');
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [newCourseForm, setNewCourseForm] = useState({
    code: '',
    name: '',
    semester: 1,
    credits: 3,
    type: 'theory' as 'theory' | 'lab',
    description: '',
    facultyId: '',
  });

  // Modal states: Document Approval & Rejection
  const [approvingDoc, setApprovingDoc] = useState<any | null>(null);
  const [approvalDocUrl, setApprovalDocUrl] = useState<string>('');
  const [rejectingDoc, setRejectingDoc] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Timetable Builder State
  const [timetableSemester, setTimetableSemester] = useState<number>(1);
  const [timetableSection, setTimetableSection] = useState<string>('A');
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
  const [showAddPeriodModal, setShowAddPeriodModal] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    dayOfWeek: 'Monday',
    period: 1,
    courseId: '',
    facultyId: '',
    roomNumber: 'LH-101'
  });

  // Fetch timetable entries for selected dept, semester, section
  useEffect(() => {
    if (!deptName) return;
    const fetchTimetable = async () => {
      try {
        const res = await fetch(
          `${apiConfig.baseUrl}/academics/timetable?department=${encodeURIComponent(deptName)}&semester=${timetableSemester}&section=${timetableSection}`,
          { headers: { 'Content-Type': 'application/json', ...apiConfig.headers } }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.entries)) {
            setTimetableEntries(data.entries);
          }
        }
      } catch (e) {
        console.error('Failed to load timetable:', e);
      }
    };
    fetchTimetable();
  }, [deptName, timetableSemester, timetableSection]);

  const handleAddPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    const crs = deptCourses.find(c => c.id === periodForm.courseId);
    const fac = deptFaculty.find(f => f.id === periodForm.facultyId);
    if (!crs || !fac) {
      alert('Please select both a course and faculty member');
      return;
    }

    const timeSlot = TIME_SLOTS.find(t => t.period === Number(periodForm.period))?.time || '';

    const newEntry = {
      dayOfWeek: periodForm.dayOfWeek,
      period: Number(periodForm.period),
      courseId: crs.id,
      facultyId: fac.id,
      roomNumber: periodForm.roomNumber,
      subjectCode: crs.code,
      subjectName: crs.name,
      facultyName: (fac as any).user?.name || fac.id,
      timeSlot,
      section: timetableSection,
      semester: timetableSemester
    };

    setTimetableEntries(prev => [
      ...prev.filter(entry => !(entry.dayOfWeek === periodForm.dayOfWeek && entry.period === Number(periodForm.period))),
      newEntry
    ]);
    setShowAddPeriodModal(false);
  };

  const handleSaveTimetable = async () => {
    try {
      await timetableMutations.save.mutateAsync({
        department: deptName,
        semester: timetableSemester,
        section: timetableSection,
        entries: timetableEntries
      });
      alert('Department Timetable saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save timetable');
    }
  };

  // Handlers for Course Allocation
  const handleAssignFacultyToCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingCourse) return;
    try {
      await courseMutations.update.mutateAsync({
        id: allocatingCourse.id,
        code: allocatingCourse.code,
        name: allocatingCourse.name,
        semester: allocatingCourse.semester,
        credits: allocatingCourse.credits,
        facultyId: targetFacultyId || undefined,
      });
      setAllocatingCourse(null);
      setTargetFacultyId('');
    } catch (err) {
      console.error(err);
      alert('Failed to allocate faculty to course');
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await courseMutations.create.mutateAsync({
        code: newCourseForm.code.trim().toUpperCase(),
        name: newCourseForm.name.trim(),
        department: deptName,
        departmentId: selectedDeptId || undefined,
        semester: Number(newCourseForm.semester),
        credits: Number(newCourseForm.credits),
        type: newCourseForm.type,
        description: newCourseForm.description,
        facultyId: newCourseForm.facultyId || undefined,
      });
      setShowAddCourseModal(false);
      setNewCourseForm({
        code: '',
        name: '',
        semester: 1,
        credits: 3,
        type: 'theory',
        description: '',
        facultyId: '',
      });
    } catch (err) {
      console.error(err);
      alert('Failed to create course');
    }
  };

  // Handlers for Document Requests
  const handleApproveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingDoc) return;
    try {
      await documentMutations.approve.mutateAsync({
        id: approvingDoc.id,
        documentUrl: approvalDocUrl.trim() || undefined,
      });
      setApprovingDoc(null);
      setApprovalDocUrl('');
    } catch (err) {
      console.error(err);
      alert('Failed to approve document request');
    }
  };

  const handleRejectDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingDoc) return;
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    try {
      await documentMutations.reject.mutateAsync({
        id: rejectingDoc.id,
        rejectionReason: rejectionReason.trim(),
      });
      setRejectingDoc(null);
      setRejectionReason('');
    } catch (err) {
      console.error(err);
      alert('Failed to reject document request');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
          {/* ─── Overview Hero Header Banner ─── */}
          <div className="border-b-2 border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-background">
            <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
              <Wrapper variants={container} initial="hidden" animate="show" className="space-y-6">
                <Wrapper variants={item}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3.5 rounded-2xl bg-primary text-white shadow-md shadow-primary/20 shrink-0">
                        <Award className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                            Institution Head of Department
                          </span>
                          {user?.campusId && (
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {user.campusId}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">Academic Year 2026-2027</span>
                        </div>
                        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight mt-1 text-foreground">
                          Academic Command Center — {deptName}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Executive Leadership • {user?.name || 'Head of Department'} • Departmental Oversight, Curricula & Timetable
                        </p>
                      </div>
                    </div>

                    {/* Division Switcher & Quick Actions */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <DivisionSelector
                        departments={departments}
                        effectiveDeptId={effectiveDeptId}
                        onSelect={setSelectedDeptId}
                      />
                      <AddStudentDialog
                        defaultDepartment={deptName}
                        defaultDepartmentId={effectiveDeptId}
                        triggerText="+ Onboard Student"
                        size="sm"
                      />
                      <AddStaffDialog
                        role="faculty"
                        roleLabel="Faculty"
                        defaultDepartmentId={effectiveDeptId}
                        variant="outline"
                        size="sm"
                      />
                      <AssignExaminerDialog
                        departmentName={deptName}
                        triggerText="+ Appoint Examiner"
                        variant="outline"
                        size="sm"
                      />
                    </div>
                  </div>
                </Wrapper>

                {/* Department Metric Cards */}
                <Wrapper variants={item}>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      label="Enrolled Students"
                      value={deptStudents.length}
                      subtext={`Registered in ${deptName}`}
                      icon={GraduationCap}
                      color="bg-primary"
                    />
                    <StatCard
                      label="Department Faculty"
                      value={deptFaculty.length}
                      subtext="Teaching & Research Staff"
                      icon={Users}
                      color="bg-info"
                    />
                    <StatCard
                      label="Active Courses"
                      value={deptCourses.length}
                      subtext="Curriculum Syllabus"
                      icon={BookOpen}
                      color="bg-success"
                    />
                    <StatCard
                      label="Document Clearances"
                      value={pendingDocs.length}
                      subtext={pendingDocs.length > 0 ? "Awaiting your approval" : "All requests cleared"}
                      icon={FileCheck}
                      color={pendingDocs.length > 0 ? "bg-warning" : "bg-muted-foreground"}
                    />
                  </div>
                </Wrapper>
              </Wrapper>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
            <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Quick Actions Panel */}
              <Card className="border-2 border-border/60 bg-card md:col-span-1 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-display">Department Provisioning</CardTitle>
                  <CardDescription>Direct onboarding with instant system credentials</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3.5 rounded-xl border-2 border-border/60 bg-muted/20 flex items-center justify-between hover:border-primary/30 transition-all">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Onboard Student</p>
                      <p className="text-xs text-muted-foreground">Add directly into semester batch</p>
                    </div>
                    <AddStudentDialog
                      defaultDepartment={deptName}
                      defaultDepartmentId={effectiveDeptId}
                      triggerText="Add"
                      size="sm"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border-2 border-border/60 bg-muted/20 flex items-center justify-between hover:border-primary/30 transition-all">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Appoint Faculty</p>
                      <p className="text-xs text-muted-foreground">Add professor or lecturer</p>
                    </div>
                    <AddStaffDialog
                      role="faculty"
                      roleLabel="Faculty"
                      defaultDepartmentId={effectiveDeptId}
                      size="sm"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border-2 border-border/60 bg-muted/20 flex items-center justify-between hover:border-primary/30 transition-all">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Appoint Examiner</p>
                      <p className="text-xs text-muted-foreground">Assign invigilation duties</p>
                    </div>
                    <AssignExaminerDialog
                      departmentName={deptName}
                      triggerText="Assign"
                      size="sm"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Pending Clearances Box */}
              <Card className="border-2 border-border/60 bg-card md:col-span-2 shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base font-display">Pending Student Document Requests</CardTitle>
                    <CardDescription>Certificates awaiting your review and signed document upload</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('documents')}>
                    View All Queue <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingDocs ? (
                    <TableSkeleton />
                  ) : pendingDocs.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground">
                      <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3 text-success">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-foreground">All document requests are cleared!</p>
                      <p className="text-xs mt-0.5 text-muted-foreground">No pending certificate requests for this department.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {pendingDocs.slice(0, 4).map((doc: any) => (
                        <div key={doc.id} className="p-3.5 rounded-xl border-2 border-border/60 bg-card flex items-center justify-between hover:border-primary/30 transition-all">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{doc.documentName}</p>
                            <p className="text-xs text-muted-foreground">
                              Requested by {doc.student?.user?.name || 'Student'} ({doc.student?.rollNumber || 'N/A'}) • {new Date(doc.requestedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button size="sm" onClick={() => {
                            setApprovingDoc(doc);
                            setApprovalDocUrl('');
                          }}>
                            Upload & Approve
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Curriculum & Allocation Overview */}
            <Card className="border-2 border-border/60 bg-card shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-display">Faculty Teaching Allocations</CardTitle>
                  <CardDescription>Instructor course coverage and weekly hours</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('faculty')}>
                  Manage Workloads <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {loadingFaculty ? (
                  <TableSkeleton />
                ) : deptFaculty.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No faculty members found in this division.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {deptFaculty.slice(0, 6).map((fac: any) => {
                      const assignedCourses = deptCourses.filter(c => (c as any).facultyId === fac.id);
                      const workloadHours = (fac as any).weeklyWorkloadHours || (assignedCourses.length * 4);
                      const isOverloaded = workloadHours > 16;
                      return (
                        <div key={fac.id} className="p-3.5 rounded-xl border-2 border-border/60 bg-muted/20 hover:border-primary/30 transition-all">
                          <p className="text-sm font-semibold text-foreground">{fac.user?.name || fac.id}</p>
                          <p className="text-xs text-muted-foreground">{fac.designation} • {fac.employeeCode}</p>
                          <div className="mt-3 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Courses: {assignedCourses.length}</span>
                            <span className={cn(
                              "font-semibold px-2 py-0.5 rounded-full border text-[11px]",
                              isOverloaded ? "bg-warning/10 text-warning border-warning/20" : "bg-success/10 text-success border-success/20"
                            )}>
                              {workloadHours} hrs / wk
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )}

    {/* TAB 2: STUDENTS */}
    {activeTab === 'students' && (
      <div>
        {/* ─── Students Hero Header Banner ─── */}
        <div className="border-b-2 border-border/60 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-background">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
            <Wrapper variants={container} initial="hidden" animate="show" className="space-y-5">
              <Wrapper variants={item}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-sm shrink-0">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                        Department Student Roster
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        Enrolled student records and semester distributions for {deptName}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <DivisionSelector
                      departments={departments}
                      effectiveDeptId={effectiveDeptId}
                      onSelect={setSelectedDeptId}
                    />
                    <AddStudentDialog
                      defaultDepartment={deptName}
                      defaultDepartmentId={effectiveDeptId}
                      triggerText="+ Add Student"
                      size="sm"
                    />
                  </div>
                </div>
              </Wrapper>

              <Wrapper variants={item}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="Total Students"
                    value={deptStudents.length}
                    subtext={`Active in ${deptName}`}
                    icon={GraduationCap}
                    color="bg-emerald-500"
                  />
                  <StatCard
                    label="Fees Cleared"
                    value={deptStudents.filter(s => s.feeStatus === 'paid').length}
                    subtext="Paid in full"
                    icon={CheckCircle2}
                    color="bg-success"
                  />
                  <StatCard
                    label="Fees Pending"
                    value={deptStudents.filter(s => s.feeStatus === 'due' || s.feeStatus === 'partial').length}
                    subtext="Partial or outstanding dues"
                    icon={AlertCircle}
                    color="bg-warning"
                  />
                  <StatCard
                    label="Active Cohorts"
                    value={new Set(deptStudents.map(s => s.batch || `Sem ${s.semester}`)).size}
                    subtext="Academic batches"
                    icon={Clock}
                    color="bg-primary"
                  />
                </div>
              </Wrapper>
            </Wrapper>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Card className="border-2 border-border/60 bg-card shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-display">Directory Records</CardTitle>
                  <CardDescription>Filtered by semester enrollment and search criteria</CardDescription>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mt-4 items-center">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by student name or roll number..."
                    className="pl-9"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>
                <select
                  className="h-10 rounded-lg border-2 border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={studentSemesterFilter}
                  onChange={(e) => setStudentSemesterFilter(e.target.value)}
                >
                  <option value="all">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <option key={s} value={s.toString()}>Semester {s}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingStudents ? (
                <TableSkeleton />
              ) : deptStudents.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="font-medium text-foreground">No students enrolled</p>
                  <p className="text-xs text-muted-foreground mt-1">No student records match this department or filter criteria.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border-2 border-border/60 rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/60 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 px-3">Student Name</th>
                        <th className="py-3 px-3">Roll Number</th>
                        <th className="py-3 px-3">Semester</th>
                        <th className="py-3 px-3">Batch</th>
                        <th className="py-3 px-3">Fee Status</th>
                        <th className="py-3 px-3 text-right">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {deptStudents
                        .filter(s => {
                          const matchesSearch = !studentSearch ||
                            s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                            s.rollNumber.toLowerCase().includes(studentSearch.toLowerCase());
                          const matchesSem = studentSemesterFilter === 'all' || s.semester.toString() === studentSemesterFilter;
                          return matchesSearch && matchesSem;
                        })
                        .map(s => (
                          <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3.5 px-3 font-semibold text-foreground">{s.name}</td>
                            <td className="py-3.5 px-3 font-mono text-xs text-muted-foreground">{s.rollNumber}</td>
                            <td className="py-3.5 px-3 font-medium">Semester {s.semester}</td>
                            <td className="py-3.5 px-3 text-muted-foreground">{s.batch || '2024-2028'}</td>
                            <td className="py-3.5 px-3">
                              <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize",
                                getFeeStatusColor(s.feeStatus)
                              )}>
                                {s.feeStatus || 'due'}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right font-semibold tabular-nums text-foreground">
                              {s.attendancePercentage || 85}%
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )}

    {/* TAB 3: FACULTY & WORKLOAD ALLOCATION */}
    {activeTab === 'faculty' && (
      <div>
        {/* ─── Faculty Hero Header Banner ─── */}
        <div className="border-b-2 border-border/60 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-background">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
            <Wrapper variants={container} initial="hidden" animate="show" className="space-y-5">
              <Wrapper variants={item}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500 text-white shadow-sm shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                        Faculty Directory & Workload Monitor
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        Teaching staff, designations, and workload allocation for {deptName}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <DivisionSelector
                      departments={departments}
                      effectiveDeptId={effectiveDeptId}
                      onSelect={setSelectedDeptId}
                    />
                    <AddStaffDialog
                      role="faculty"
                      roleLabel="Faculty"
                      defaultDepartmentId={effectiveDeptId}
                      size="sm"
                    />
                    <AssignExaminerDialog
                      departmentName={deptName}
                      triggerText="+ Appoint Examiner"
                      variant="outline"
                      size="sm"
                    />
                  </div>
                </div>
              </Wrapper>

              <Wrapper variants={item}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="Total Faculty"
                    value={deptFaculty.length}
                    subtext="Department instructional staff"
                    icon={Users}
                    color="bg-blue-500"
                  />
                  <StatCard
                    label="Balanced Workload"
                    value={deptFaculty.filter((f: any) => {
                      const assigned = deptCourses.filter(c => (c as any).facultyId === f.id);
                      const hrs = (f as any).weeklyWorkloadHours || (assigned.length * 4);
                      return hrs <= 16;
                    }).length}
                    subtext="≤ 16 hours / week"
                    icon={CheckCircle2}
                    color="bg-success"
                  />
                  <StatCard
                    label="Heavy Workload"
                    value={deptFaculty.filter((f: any) => {
                      const assigned = deptCourses.filter(c => (c as any).facultyId === f.id);
                      const hrs = (f as any).weeklyWorkloadHours || (assigned.length * 4);
                      return hrs > 16;
                    }).length}
                    subtext="> 16 hours / week"
                    icon={AlertCircle}
                    color="bg-warning"
                  />
                  <StatCard
                    label="Teaching Load"
                    value={`${deptFaculty.reduce((acc, f: any) => {
                      const assigned = deptCourses.filter(c => (c as any).facultyId === f.id);
                      return acc + ((f as any).weeklyWorkloadHours || (assigned.length * 4));
                    }, 0)}h`}
                    subtext="Weekly hours across division"
                    icon={Clock}
                    color="bg-primary"
                  />
                </div>
              </Wrapper>
            </Wrapper>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Card className="border-2 border-border/60 bg-card shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-display">Faculty Members</CardTitle>
                  <CardDescription>Instructors appointed to {deptName} and teaching allocation</CardDescription>
                </div>
              </div>

              <div className="mt-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search faculty by name or designation..."
                    className="pl-9"
                    value={facultySearch}
                    onChange={(e) => setFacultySearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingFaculty ? (
                <TableSkeleton />
              ) : deptFaculty.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="font-medium text-foreground">No faculty appointed</p>
                  <p className="text-xs text-muted-foreground mt-1">No faculty members are currently assigned to this department.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {deptFaculty
                    .filter((f: any) => {
                      const name = f.user?.name || f.name || '';
                      return !facultySearch || name.toLowerCase().includes(facultySearch.toLowerCase()) || f.designation?.toLowerCase().includes(facultySearch.toLowerCase());
                    })
                    .map((fac: any) => {
                      const assignedCourses = deptCourses.filter(c => (c as any).facultyId === fac.id);
                      const workloadHours = (fac as any).weeklyWorkloadHours || (assignedCourses.length * 4);
                      const isOverloaded = workloadHours > 16;
                      return (
                        <div key={fac.id} className="p-4 rounded-xl border-2 border-border/60 bg-card hover:border-primary/30 transition-all space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-foreground text-base">{fac.user?.name || fac.id}</h3>
                              <p className="text-xs text-muted-foreground">{fac.designation} • {fac.employeeCode}</p>
                              <p className="text-xs text-muted-foreground">{fac.user?.email || 'N/A'}</p>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
                              Active
                            </span>
                          </div>

                          <div className="pt-2 border-t border-border/40">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-muted-foreground">Weekly Teaching Load</span>
                              <span className={cn(
                                "font-bold",
                                isOverloaded ? "text-warning" : "text-primary"
                              )}>
                                {workloadHours} hrs / wk
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  isOverloaded ? "bg-warning" : "bg-primary"
                                )}
                                style={{ width: `${Math.min(100, (workloadHours / 20) * 100)}%` }}
                              />
                            </div>
                          </div>

                          <div className="text-xs">
                            <span className="font-medium text-foreground block mb-1.5">Assigned Courses:</span>
                            {assignedCourses.length === 0 ? (
                              <span className="text-muted-foreground italic">No courses allocated</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {assignedCourses.map(c => (
                                  <span key={c.id} className="px-2 py-0.5 rounded bg-muted text-xs font-mono border border-border/60">
                                    {c.code}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )}

    {/* TAB 4: COURSE ALLOCATION & CURRICULUM */}
    {activeTab === 'courses' && (
      <div>
        {/* ─── Courses Hero Header Banner ─── */}
        <div className="border-b-2 border-border/60 bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-background">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
            <Wrapper variants={container} initial="hidden" animate="show" className="space-y-5">
              <Wrapper variants={item}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-violet-500 text-white shadow-sm shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                        Curriculum & Course Allocations
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        Syllabus modules, credit hours, and instructor assignments for {deptName}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <DivisionSelector
                      departments={departments}
                      effectiveDeptId={effectiveDeptId}
                      onSelect={setSelectedDeptId}
                    />
                    <Button size="sm" onClick={() => setShowAddCourseModal(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Add Course
                    </Button>
                  </div>
                </div>
              </Wrapper>

              <Wrapper variants={item}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="Total Courses"
                    value={deptCourses.length}
                    subtext="Curriculum syllabus subjects"
                    icon={BookOpen}
                    color="bg-violet-500"
                  />
                  <StatCard
                    label="Theory Modules"
                    value={deptCourses.filter(c => c.type !== 'lab').length}
                    subtext="Lecture courses"
                    icon={BookOpen}
                    color="bg-info"
                  />
                  <StatCard
                    label="Lab Practicals"
                    value={deptCourses.filter(c => c.type === 'lab').length}
                    subtext="Laboratory sessions"
                    icon={Sparkles}
                    color="bg-warning"
                  />
                  <StatCard
                    label="Faculty Allocated"
                    value={`${deptCourses.filter(c => !!(c as any).facultyId).length}/${deptCourses.length}`}
                    subtext="Assigned instructors"
                    icon={CheckCircle2}
                    color="bg-success"
                  />
                </div>
              </Wrapper>
            </Wrapper>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Card className="border-2 border-border/60 bg-card shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-display">Course Directory</CardTitle>
                  <CardDescription>Allocate faculty instructors to department courses</CardDescription>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mt-4 items-center">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by course name or code..."
                    className="pl-9"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                  />
                </div>
                <select
                  className="h-10 rounded-lg border-2 border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={courseSemesterFilter}
                  onChange={(e) => setCourseSemesterFilter(e.target.value)}
                >
                  <option value="all">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <option key={s} value={s.toString()}>Semester {s}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCourses ? (
                <TableSkeleton />
              ) : deptCourses.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="font-medium text-foreground">No courses found</p>
                  <p className="text-xs text-muted-foreground mt-1">No courses are registered under this department.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border-2 border-border/60 rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/60 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 px-3">Code</th>
                        <th className="py-3 px-3">Course Title</th>
                        <th className="py-3 px-3">Semester</th>
                        <th className="py-3 px-3">Credits</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3">Faculty Instructor</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {deptCourses
                        .filter(c => {
                          const matchesSearch = !courseSearch ||
                            c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
                            c.name.toLowerCase().includes(courseSearch.toLowerCase());
                          const matchesSem = courseSemesterFilter === 'all' || c.semester.toString() === courseSemesterFilter;
                          return matchesSearch && matchesSem;
                        })
                        .map(course => {
                          const assignedFac = deptFaculty.find(f => f.id === (course as any).facultyId);
                          return (
                            <tr key={course.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-3.5 px-3 font-mono font-bold text-xs text-primary">{course.code}</td>
                              <td className="py-3.5 px-3 font-semibold text-foreground">{course.name}</td>
                              <td className="py-3.5 px-3">Sem {course.semester}</td>
                              <td className="py-3.5 px-3 font-medium tabular-nums">{course.credits} Credits</td>
                              <td className="py-3.5 px-3">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider",
                                  course.type === 'lab' ? "bg-warning/10 text-warning border border-warning/20" : "bg-info/10 text-info border border-info/20"
                                )}>
                                  {course.type || 'theory'}
                                </span>
                              </td>
                              <td className="py-3.5 px-3">
                                {assignedFac ? (
                                  <span className="font-medium text-foreground">{(assignedFac as any).user?.name || assignedFac.id}</span>
                                ) : (
                                  <span className="text-xs font-medium text-warning bg-warning/10 px-2 py-0.5 rounded border border-warning/20">
                                    Unallocated
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setAllocatingCourse(course);
                                    setTargetFacultyId((course as any).facultyId || '');
                                  }}
                                >
                                  {assignedFac ? 'Reallocate' : 'Allocate Faculty'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )}

    {/* TAB 5: TIMETABLE BUILDER */}
    {activeTab === 'timetable' && (
      <div>
        {/* ─── Timetable Hero Header Banner ─── */}
        <div className="border-b-2 border-border/60 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-background">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
            <Wrapper variants={container} initial="hidden" animate="show" className="space-y-5">
              <Wrapper variants={item}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-sm shrink-0">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                        Department Timetable Builder
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        Weekly lecture schedules and room allocations for {deptName}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <DivisionSelector
                      departments={departments}
                      effectiveDeptId={effectiveDeptId}
                      onSelect={setSelectedDeptId}
                    />
                    <Button variant="outline" size="sm" onClick={() => setShowAddPeriodModal(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Add Period Slot
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(
                          `${apiConfig.baseUrl}/academics/timetable/export?department=${encodeURIComponent(deptName)}&semester=${timetableSemester}&section=${timetableSection}`,
                          '_blank'
                        );
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" /> Export CSV
                    </Button>
                    <Button size="sm" onClick={handleSaveTimetable} disabled={timetableMutations.save.isPending}>
                      {timetableMutations.save.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save Timetable
                    </Button>
                  </div>
                </div>
              </Wrapper>

              <Wrapper variants={item}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="Scheduled Periods"
                    value={timetableEntries.length}
                    subtext="Total weekly class slots"
                    icon={Calendar}
                    color="bg-amber-500"
                  />
                  <StatCard
                    label="Teaching Days"
                    value={new Set(timetableEntries.map(e => e.dayOfWeek)).size}
                    subtext="Days with scheduled classes"
                    icon={Clock}
                    color="bg-info"
                  />
                  <StatCard
                    label="Current Cohort"
                    value={`Sem ${timetableSemester} • Sec ${timetableSection}`}
                    subtext="Active configuration"
                    icon={GraduationCap}
                    color="bg-primary"
                  />
                  <StatCard
                    label="Instructors Assigned"
                    value={new Set(timetableEntries.map(e => e.facultyId)).size}
                    subtext="Faculty teaching this section"
                    icon={Users}
                    color="bg-success"
                  />
                </div>
              </Wrapper>
            </Wrapper>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <div className="space-y-6">
            <Card className="border-2 border-border/60 bg-card shadow-xs">
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-display">Weekly Master Schedule</CardTitle>
                    <CardDescription>Configure lecture hours and room numbers for {deptName}</CardDescription>
                  </div>
                </div>

                {/* Semester & Section Filter */}
                <div className="flex flex-wrap gap-4 mt-4 items-end">
                  <div className="w-36">
                    <Label className="mb-1 block text-xs">Semester</Label>
                    <select
                      className="h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={timetableSemester}
                      onChange={(e) => setTimetableSemester(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="w-32">
                    <Label className="mb-1 block text-xs">Section</Label>
                    <select
                      className="h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={timetableSection}
                      onChange={(e) => setTimetableSection(e.target.value)}
                    >
                      {['A', 'B', 'C'].map(s => (
                        <option key={s} value={s}>Section {s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Timetable Vitals / Counters */}
                <div className="grid gap-3 sm:grid-cols-3 mb-4">
                  <div className="p-3.5 rounded-xl border-2 border-border/60 bg-muted/20 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10 text-success">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Schedule Conflicts</p>
                      <p className="font-display text-xl font-bold text-foreground">0 Conflicts</p>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl border-2 border-border/60 bg-muted/20 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-info/10 text-info">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Scheduled Slots</p>
                      <p className="font-display text-xl font-bold text-foreground">{timetableEntries.length} Periods</p>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl border-2 border-border/60 bg-muted/20 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10 text-warning">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Unassigned Periods</p>
                      <p className="font-display text-xl font-bold text-foreground">
                        {Math.max(0, DAYS.length * TIME_SLOTS.length - timetableEntries.length)} Open
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border-2 border-border/60 rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/60 text-xs">
                        <th className="p-3 text-left font-semibold text-muted-foreground uppercase tracking-wider">Day / Period</th>
                        {TIME_SLOTS.map(slot => (
                          <th key={slot.period} className="p-3 text-center font-semibold min-w-[130px]">
                            <div>Period {slot.period}</div>
                            <div className="text-[10px] text-muted-foreground font-normal">{slot.time}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {DAYS.map(day => (
                        <tr key={day} className="hover:bg-muted/10">
                          <td className="p-3 font-semibold text-foreground bg-muted/20 whitespace-nowrap">
                            {day}
                          </td>
                          {TIME_SLOTS.map(slot => {
                            const entry = timetableEntries.find(
                              e => e.dayOfWeek === day && e.period === slot.period
                            );
                            return (
                              <td key={slot.period} className="p-2 text-center align-top border-l border-border/40">
                                {entry ? (
                                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-left shadow-2xs">
                                    <div className="font-bold text-primary font-mono">{entry.subjectCode}</div>
                                    <div className="text-foreground font-medium truncate">{entry.subjectName}</div>
                                    <div className="text-muted-foreground text-[10px] truncate">{entry.facultyName}</div>
                                    <div className="text-[10px] text-primary/80 font-semibold mt-1">Rm: {entry.roomNumber}</div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPeriodForm({
                                        dayOfWeek: day,
                                        period: slot.period,
                                        courseId: deptCourses[0]?.id || '',
                                        facultyId: deptFaculty[0]?.id || '',
                                        roomNumber: 'LH-101'
                                      });
                                      setShowAddPeriodModal(true);
                                    }}
                                    className="w-full h-16 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/60 hover:bg-muted/30 flex items-center justify-center text-muted-foreground transition-all"
                                  >
                                    <Plus className="w-4 h-4 opacity-50" />
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )}

    {/* TAB 6: DOCUMENT REQUESTS */}
    {activeTab === 'documents' && (
      <div>
        {/* ─── Documents Hero Header Banner ─── */}
        <div className="border-b-2 border-border/60 bg-gradient-to-r from-amber-500/10 via-primary/5 to-background">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
            <Wrapper variants={container} initial="hidden" animate="show" className="space-y-5">
              <Wrapper variants={item}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-warning text-white shadow-sm shrink-0">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                        Student Document Clearances
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        Review certificate requests, verify departmental clearance, and issue signed approvals for {deptName}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <DivisionSelector
                      departments={departments}
                      effectiveDeptId={effectiveDeptId}
                      onSelect={setSelectedDeptId}
                    />
                  </div>
                </div>
              </Wrapper>

              <Wrapper variants={item}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="Total Requests"
                    value={documentRequests.length}
                    subtext="Cumulative requests in queue"
                    icon={FileCheck}
                    color="bg-primary"
                  />
                  <StatCard
                    label="Awaiting Approval"
                    value={pendingDocs.length}
                    subtext={pendingDocs.length > 0 ? "Requires your review" : "All requests cleared"}
                    icon={AlertCircle}
                    color={pendingDocs.length > 0 ? "bg-warning" : "bg-muted-foreground"}
                  />
                  <StatCard
                    label="Completed"
                    value={documentRequests.filter((d: any) => d.status === 'completed').length}
                    subtext="Signed & issued certificates"
                    icon={CheckCircle2}
                    color="bg-success"
                  />
                  <StatCard
                    label="Rejected"
                    value={documentRequests.filter((d: any) => d.status === 'rejected').length}
                    subtext="Returned with feedback"
                    icon={XCircle}
                    color="bg-destructive"
                  />
                </div>
              </Wrapper>
            </Wrapper>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Card className="border-2 border-border/60 bg-card shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-display">Student Document Clearances</CardTitle>
                  <CardDescription>Review certificate requests, upload signed documents, and approve</CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/40">
                  {(['all', 'pending', 'completed', 'rejected'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setDocFilter(f)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize",
                        docFilter === f ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDocs ? (
                <TableSkeleton />
              ) : documentRequests.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <FileCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="font-medium text-foreground">No document requests found</p>
                  <p className="text-xs text-muted-foreground mt-1">No pending or completed student requests in queue.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border-2 border-border/60 rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/60 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 px-3">Document Requested</th>
                        <th className="py-3 px-3">Student Name</th>
                        <th className="py-3 px-3">Roll Number</th>
                        <th className="py-3 px-3">Purpose</th>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {documentRequests
                        .filter((d: any) => docFilter === 'all' || d.status === docFilter)
                        .map((doc: any) => {
                          const isPending = doc.status === 'pending';
                          const isCompleted = doc.status === 'completed';
                          return (
                            <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-3.5 px-3 font-semibold text-foreground">{doc.documentName}</td>
                              <td className="py-3.5 px-3 font-medium">{doc.student?.user?.name || 'Student'}</td>
                              <td className="py-3.5 px-3 font-mono text-xs text-muted-foreground">{doc.student?.rollNumber || 'N/A'}</td>
                              <td className="py-3.5 px-3 text-muted-foreground max-w-xs truncate">{doc.purpose || 'Official purpose'}</td>
                              <td className="py-3.5 px-3 text-xs tabular-nums">{new Date(doc.requestedAt).toLocaleDateString()}</td>
                              <td className="py-3.5 px-3">
                                <span className={cn(
                                  "px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize",
                                  isCompleted ? 'bg-success/10 text-success border-success/20' :
                                  isPending ? 'bg-warning/10 text-warning border-warning/20' :
                                  'bg-destructive/10 text-destructive border-destructive/20'
                                )}>
                                  {doc.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                {isPending ? (
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setApprovingDoc(doc);
                                        setApprovalDocUrl('');
                                      }}
                                    >
                                      Upload & Approve
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
                                      onClick={() => {
                                        setRejectingDoc(doc);
                                        setRejectionReason('');
                                      }}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                ) : isCompleted && doc.documentUrl ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(doc.documentUrl, '_blank')}
                                  >
                                    <Download className="w-3.5 h-3.5 mr-1" /> View Doc
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Processed</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )}

      {/* ─── MODAL: REALLOCATE / ALLOCATE FACULTY TO COURSE ─── */}
      {allocatingCourse && (
        <Dialog open={!!allocatingCourse} onOpenChange={(open) => !open && setAllocatingCourse(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display text-lg">Allocate Course Faculty</DialogTitle>
              <DialogDescription>
                Assign an instructor to {allocatingCourse.code} - {allocatingCourse.name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAssignFacultyToCourse} className="space-y-4 py-2">
              <div>
                <Label htmlFor="facultySelector">Select Faculty Instructor</Label>
                <select
                  id="facultySelector"
                  className="mt-1.5 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={targetFacultyId}
                  onChange={(e) => setTargetFacultyId(e.target.value)}
                >
                  <option value="">None (Unallocated)</option>
                  {deptFaculty.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.user?.name || f.id} ({f.designation})
                    </option>
                  ))}
                </select>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setAllocatingCourse(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={courseMutations.update.isPending}>
                  {courseMutations.update.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Allocation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL: ADD COURSE ─── */}
      {showAddCourseModal && (
        <Dialog open={showAddCourseModal} onOpenChange={setShowAddCourseModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display text-lg">Create Department Course</DialogTitle>
              <DialogDescription>Add a new curriculum course to {deptName}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCourse} className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Course Code</Label>
                  <Input
                    required
                    placeholder="e.g. CS501"
                    className="mt-1 font-mono uppercase"
                    value={newCourseForm.code}
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, code: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Credits</Label>
                  <Input
                    type="number"
                    min="1"
                    max="6"
                    required
                    className="mt-1"
                    value={newCourseForm.credits}
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, credits: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label>Course Name</Label>
                <Input
                  required
                  placeholder="e.g. Distributed Operating Systems"
                  className="mt-1"
                  value={newCourseForm.name}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Semester</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={newCourseForm.semester}
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, semester: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Type</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={newCourseForm.type}
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, type: e.target.value as any })}
                  >
                    <option value="theory">Theory (Lecture)</option>
                    <option value="lab">Lab (Practical)</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>Initial Faculty Instructor (Optional)</Label>
                <select
                  className="mt-1 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={newCourseForm.facultyId}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, facultyId: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {deptFaculty.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.user?.name || f.id}</option>
                  ))}
                </select>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddCourseModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={courseMutations.create.isPending}>
                  {courseMutations.create.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Course
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL: ADD TIMETABLE PERIOD SLOT ─── */}
      {showAddPeriodModal && (
        <Dialog open={showAddPeriodModal} onOpenChange={setShowAddPeriodModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display text-lg">Add Timetable Period</DialogTitle>
              <DialogDescription>
                Schedule a course session for Semester {timetableSemester} (Section {timetableSection})
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddPeriod} className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Day of Week</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={periodForm.dayOfWeek}
                    onChange={(e) => setPeriodForm({ ...periodForm, dayOfWeek: e.target.value })}
                  >
                    {DAYS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Period Slot</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={periodForm.period}
                    onChange={(e) => setPeriodForm({ ...periodForm, period: Number(e.target.value) })}
                  >
                    {TIME_SLOTS.map(t => (
                      <option key={t.period} value={t.period}>P{t.period} ({t.time})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label>Select Course</Label>
                <select
                  required
                  className="mt-1 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={periodForm.courseId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const matchedCourse = deptCourses.find(c => c.id === cId);
                    setPeriodForm({
                      ...periodForm,
                      courseId: cId,
                      facultyId: (matchedCourse as any)?.facultyId || periodForm.facultyId
                    });
                  }}
                >
                  <option value="">Select Course...</option>
                  {deptCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Faculty Instructor</Label>
                <select
                  required
                  className="mt-1 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={periodForm.facultyId}
                  onChange={(e) => setPeriodForm({ ...periodForm, facultyId: e.target.value })}
                >
                  <option value="">Select Faculty...</option>
                  {deptFaculty.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.user?.name || f.id} ({f.designation})</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Room / Lab Number</Label>
                <Input
                  required
                  placeholder="e.g. LH-204 / Lab-2"
                  className="mt-1"
                  value={periodForm.roomNumber}
                  onChange={(e) => setPeriodForm({ ...periodForm, roomNumber: e.target.value })}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddPeriodModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add to Schedule</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL: UPLOAD & APPROVE DOCUMENT REQUEST ─── */}
      {approvingDoc && (
        <Dialog open={!!approvingDoc} onOpenChange={(open) => !open && setApprovingDoc(null)}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-success/10 text-success">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="font-display text-lg">Upload & Approve Certificate</DialogTitle>
                  <DialogDescription>
                    Provide signed document link or file URL for {approvingDoc.documentName}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleApproveDocument} className="space-y-4 py-2">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                <p><strong>Student:</strong> {approvingDoc.student?.user?.name} ({approvingDoc.student?.rollNumber})</p>
                <p><strong>Purpose:</strong> {approvingDoc.purpose || 'Official Document'}</p>
                <p><strong>Requested:</strong> {new Date(approvingDoc.requestedAt).toLocaleDateString()}</p>
              </div>

              <div>
                <Label htmlFor="docUrlInput">Signed Certificate File / Download URL</Label>
                <Input
                  id="docUrlInput"
                  placeholder="https://storage.campus.edu/certificates/bonafide_2026.pdf"
                  className="mt-1.5"
                  value={approvalDocUrl}
                  onChange={(e) => setApprovalDocUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave blank to auto-generate a digital certificate for the student.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setApprovingDoc(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={documentMutations.approve.isPending}>
                  {documentMutations.approve.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Approve & Issue Certificate
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL: REJECT DOCUMENT REQUEST ─── */}
      {rejectingDoc && (
        <Dialog open={!!rejectingDoc} onOpenChange={(open) => !open && setRejectingDoc(null)}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="font-display text-lg">Reject Document Request</DialogTitle>
                  <DialogDescription>
                    Provide a mandatory reason for rejecting {rejectingDoc.documentName}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleRejectDocument} className="space-y-4 py-2">
              <div>
                <Label htmlFor="rejectionReason">Rejection Feedback (Mandatory)</Label>
                <textarea
                  id="rejectionReason"
                  required
                  rows={3}
                  className="mt-1.5 w-full rounded-lg border-2 border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/20"
                  placeholder="e.g. Outstanding library fee dues or missing prerequisite clearance"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setRejectingDoc(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={documentMutations.reject.isPending}
                >
                  {documentMutations.reject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirm Rejection
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
