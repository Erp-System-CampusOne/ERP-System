import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar,
  FileCheck, Plus, Search, Filter, CheckCircle2, Clock,
  AlertCircle, Download, Save, RotateCcw, Loader2, UploadCloud,
  XCircle, Award, UserPlus, ShieldCheck, ArrowRight, UserCheck
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

export default function HodDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;

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
  // If user has department assigned or matches first department
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  useEffect(() => {
    if (departments.length > 0 && !selectedDeptId) {
      setSelectedDeptId(departments[0].id);
    }
  }, [departments, selectedDeptId]);

  const activeDepartment = departments.find(d => d.id === selectedDeptId) || departments[0];
  const deptName = activeDepartment?.name || 'Department of Computer Science';

  // Filter department scoped data
  const deptStudents = (studentsData as Student[]).filter(
    s => !selectedDeptId || s.department === deptName || (s as any).departmentId === selectedDeptId
  );
  const deptFaculty = (facultyData as Faculty[]).filter(
    f => !selectedDeptId || f.department === deptName || (f as any).departmentId === selectedDeptId
  );
  const deptCourses = (coursesData as Course[]).filter(
    c => !selectedDeptId || c.department === deptName || (c as any).departmentId === selectedDeptId
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
      alert('Please provide a reason for rejection');
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
      {/* ─── Top Header & Department Vitals ─── */}
      <div className="border-b-2 border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-background">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                  Head of Department Portal
                </span>
                <span className="text-xs text-muted-foreground">Academic Year 2026-2027</span>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight mt-1 text-foreground">
                {deptName}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Executive Department Command Center • Direct User Provisioning • Curricula & Timetable
              </p>
            </div>

            {/* Department Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <AddStudentDialog
                defaultDepartment={deptName}
                defaultDepartmentId={selectedDeptId}
                triggerText="+ Onboard Student"
              />
              <AddStaffDialog
                role="faculty"
                roleLabel="Faculty"
                defaultDepartmentId={selectedDeptId}
              />
              <AssignExaminerDialog
                departmentName={deptName}
                triggerText="+ Appoint Examiner"
              />
            </div>
          </div>

          {/* Department Quick Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Enrolled Students</p>
                  <p className="font-display text-xl font-bold text-foreground tabular-nums">
                    {deptStudents.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Department Faculty</p>
                  <p className="font-display text-xl font-bold text-foreground tabular-nums">
                    {deptFaculty.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Active Courses</p>
                  <p className="font-display text-xl font-bold text-foreground tabular-nums">
                    {deptCourses.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${pendingDocs.length > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Document Requests</p>
                  <p className="font-display text-xl font-bold text-foreground tabular-nums">
                    {pendingDocs.length} Pending
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div className="border-b border-border/60 bg-background/95 sticky top-0 z-30 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex space-x-1 overflow-x-auto py-2">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'students', label: `Students (${deptStudents.length})`, icon: GraduationCap },
              { id: 'faculty', label: `Faculty & Workload (${deptFaculty.length})`, icon: Users },
              { id: 'courses', label: `Course Allocation (${deptCourses.length})`, icon: BookOpen },
              { id: 'timetable', label: 'Timetable Builder', icon: Calendar },
              { id: 'documents', label: `Document Requests (${pendingDocs.length})`, icon: FileCheck },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Main Content Tabs ─── */}
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Quick Actions Panel */}
              <Card className="border-2 border-border/60 md:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base font-display">Department Provisioning</CardTitle>
                  <CardDescription>Direct onboarding with instant credentials</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Onboard Student</p>
                      <p className="text-xs text-muted-foreground">Add directly into semester batch</p>
                    </div>
                    <AddStudentDialog
                      defaultDepartment={deptName}
                      defaultDepartmentId={selectedDeptId}
                      triggerText="Add"
                    />
                  </div>

                  <div className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Appoint Faculty</p>
                      <p className="text-xs text-muted-foreground">Add professor or lecturer</p>
                    </div>
                    <AddStaffDialog
                      role="faculty"
                      roleLabel="Faculty"
                      defaultDepartmentId={selectedDeptId}
                    />
                  </div>

                  <div className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Appoint Examiner</p>
                      <p className="text-xs text-muted-foreground">Assign invigilation duties</p>
                    </div>
                    <AssignExaminerDialog
                      departmentName={deptName}
                      triggerText="Assign"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Pending Clearances Box */}
              <Card className="border-2 border-border/60 md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-display">Pending Student Document Requests</CardTitle>
                    <CardDescription>Certificates awaiting your review and signed document upload</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('documents')}>
                    View All Queue <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {pendingDocs.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-success opacity-80" />
                      <p className="text-sm font-medium">All document requests are cleared!</p>
                      <p className="text-xs mt-0.5">No pending certificate requests for this department.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingDocs.slice(0, 4).map((doc: any) => (
                        <div key={doc.id} className="p-3 rounded-xl border border-border/60 bg-card flex items-center justify-between">
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
            <Card className="border-2 border-border/60">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-display">Faculty Teaching Allocations</CardTitle>
                  <CardDescription>Instructor course coverage and weekly hours</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('faculty')}>
                  Manage Workloads <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {deptFaculty.slice(0, 6).map((fac: any) => {
                    const assignedCourses = deptCourses.filter(c => (c as any).facultyId === fac.id);
                    return (
                      <div key={fac.id} className="p-3 rounded-xl border border-border/60 bg-muted/20">
                        <p className="text-sm font-semibold">{fac.user?.name || fac.id}</p>
                        <p className="text-xs text-muted-foreground">{fac.designation} • {fac.employeeCode}</p>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Courses: {assignedCourses.length}</span>
                          <span className="font-semibold text-primary">{assignedCourses.length * 4} hrs/wk</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 2: STUDENTS */}
        {activeTab === 'students' && (
          <Card className="border-2 border-border/60">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-display">Department Students Roster</CardTitle>
                  <CardDescription>Enrolled students in {deptName}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <AddStudentDialog
                    defaultDepartment={deptName}
                    defaultDepartmentId={selectedDeptId}
                    triggerText="+ Onboard Student"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mt-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by student name or roll number..."
                    className="pl-9"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>
                <select
                  className="h-10 rounded-lg border-2 border-input bg-background px-3 text-sm"
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
                <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
              ) : deptStudents.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No students enrolled in this department yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-xs font-semibold text-muted-foreground">
                        <th className="pb-3 pl-2">Student Name</th>
                        <th className="pb-3">Roll Number</th>
                        <th className="pb-3">Semester</th>
                        <th className="pb-3">Batch</th>
                        <th className="pb-3">Fee Status</th>
                        <th className="pb-3 pr-2 text-right">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {deptStudents
                        .filter(s => {
                          const matchesSearch = !studentSearch ||
                            s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                            s.rollNumber.toLowerCase().includes(studentSearch.toLowerCase());
                          const matchesSem = studentSemesterFilter === 'all' || s.semester.toString() === studentSemesterFilter;
                          return matchesSearch && matchesSem;
                        })
                        .map(s => (
                          <tr key={s.id} className="hover:bg-muted/30">
                            <td className="py-3 pl-2 font-medium">{s.name}</td>
                            <td className="py-3 font-mono text-xs">{s.rollNumber}</td>
                            <td className="py-3">Sem {s.semester}</td>
                            <td className="py-3 text-muted-foreground">{s.batch || '2024-2028'}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                s.feeStatus === 'paid' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                              }`}>
                                {s.feeStatus || 'due'}
                              </span>
                            </td>
                            <td className="py-3 pr-2 text-right font-medium">{s.attendancePercentage || 85}%</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB 3: FACULTY & WORKLOAD ALLOCATION */}
        {activeTab === 'faculty' && (
          <Card className="border-2 border-border/60">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-display">Faculty Directory & Workload Monitor</CardTitle>
                  <CardDescription>Instructors appointed to {deptName} and teaching allocation</CardDescription>
                </div>
                <AddStaffDialog
                  role="faculty"
                  roleLabel="Faculty"
                  defaultDepartmentId={selectedDeptId}
                />
              </div>

              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search faculty by name or designation..."
                    className="pl-9 max-w-md"
                    value={facultySearch}
                    onChange={(e) => setFacultySearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingFaculty ? (
                <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
              ) : deptFaculty.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No faculty appointed to this department yet.</p>
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
                      const workloadHours = assignedCourses.reduce((acc, c) => acc + (c.credits || 3), 0) * 3;
                      return (
                        <div key={fac.id} className="p-4 rounded-xl border-2 border-border/60 bg-card space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-foreground text-base">{fac.user?.name || fac.id}</h3>
                              <p className="text-xs text-muted-foreground">{fac.designation} • {fac.employeeCode}</p>
                              <p className="text-xs text-muted-foreground">{fac.user?.email || 'N/A'}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success">
                              Active
                            </span>
                          </div>

                          <div className="pt-2 border-t border-border/40">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Weekly Teaching Load</span>
                              <span className="font-bold text-primary">{workloadHours} hrs / wk</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-primary h-full rounded-full"
                                style={{ width: `${Math.min(100, (workloadHours / 20) * 100)}%` }}
                              />
                            </div>
                          </div>

                          <div className="text-xs">
                            <span className="font-medium text-foreground block mb-1">Assigned Courses:</span>
                            {assignedCourses.length === 0 ? (
                              <span className="text-muted-foreground italic">No courses allocated</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {assignedCourses.map(c => (
                                  <span key={c.id} className="px-2 py-0.5 rounded bg-muted text-xs font-mono">
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
        )}

        {/* TAB 4: COURSE ALLOCATION & CURRICULUM */}
        {activeTab === 'courses' && (
          <Card className="border-2 border-border/60">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-display">Course Allocation & Curriculum</CardTitle>
                  <CardDescription>Allocate faculty instructors to department courses</CardDescription>
                </div>
                <Button onClick={() => setShowAddCourseModal(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Course
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mt-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by course name or code..."
                    className="pl-9"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                  />
                </div>
                <select
                  className="h-10 rounded-lg border-2 border-input bg-background px-3 text-sm"
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
                <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
              ) : deptCourses.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No courses registered for this department.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-xs font-semibold text-muted-foreground">
                        <th className="pb-3 pl-2">Course Code</th>
                        <th className="pb-3">Course Name</th>
                        <th className="pb-3">Semester</th>
                        <th className="pb-3">Credits</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Assigned Faculty</th>
                        <th className="pb-3 pr-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {deptCourses
                        .filter(c => {
                          const matchesSearch = !courseSearch ||
                            c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
                            c.name.toLowerCase().includes(courseSearch.toLowerCase());
                          const matchesSem = courseSemesterFilter === 'all' || c.semester.toString() === courseSemesterFilter;
                          return matchesSearch && matchesSem;
                        })
                        .map(c => {
                          const assignedFac = deptFaculty.find(f => f.id === (c as any).facultyId);
                          const instructorName = (assignedFac as any)?.user?.name || c.facultyInstructor || null;
                          return (
                            <tr key={c.id} className="hover:bg-muted/30">
                              <td className="py-3 pl-2 font-mono font-bold text-foreground">{c.code}</td>
                              <td className="py-3 font-medium">{c.name}</td>
                              <td className="py-3">Sem {c.semester}</td>
                              <td className="py-3">{c.credits} Credits</td>
                              <td className="py-3">
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-muted uppercase">
                                  {c.type || 'theory'}
                                </span>
                              </td>
                              <td className="py-3">
                                {instructorName ? (
                                  <span className="font-medium text-primary flex items-center gap-1">
                                    <UserCheck className="w-3.5 h-3.5" /> {instructorName}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 text-xs italic">Unallocated</span>
                                )}
                              </td>
                              <td className="py-3 pr-2 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setAllocatingCourse(c);
                                    setTargetFacultyId((c as any).facultyId || '');
                                  }}
                                >
                                  {instructorName ? 'Reallocate' : 'Allocate Faculty'}
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
        )}

        {/* TAB 5: TIMETABLE BUILDER */}
        {activeTab === 'timetable' && (
          <Card className="border-2 border-border/60">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-display">Weekly Department Timetable Builder</CardTitle>
                  <CardDescription>Build class schedules and room assignments for {deptName}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
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

              {/* Semester & Section Filter */}
              <div className="flex flex-wrap gap-4 mt-4 items-end">
                <div className="w-36">
                  <Label className="mb-1 block text-xs">Semester</Label>
                  <select
                    className="h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm"
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
                    className="h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm"
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
              <div className="overflow-x-auto border-2 border-border/60 rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border/60 text-xs">
                      <th className="p-3 text-left font-semibold">Day / Period</th>
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
                                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-left">
                                  <div className="font-bold text-primary font-mono">{entry.subjectCode}</div>
                                  <div className="text-foreground truncate">{entry.subjectName}</div>
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
                                  className="w-full h-16 rounded-lg border border-dashed border-border/60 hover:border-primary/60 hover:bg-muted/30 flex items-center justify-center text-muted-foreground transition-all"
                                >
                                  <Plus className="w-3.5 h-3.5 opacity-50" />
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
        )}

        {/* TAB 6: DOCUMENT REQUESTS */}
        {activeTab === 'documents' && (
          <Card className="border-2 border-border/60">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-display">Student Document Clearances</CardTitle>
                  <CardDescription>Review certificate requests, upload signed documents, and approve</CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                  {(['all', 'pending', 'completed', 'rejected'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setDocFilter(f)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all capitalize ${
                        docFilter === f ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDocs ? (
                <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
              ) : documentRequests.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No document requests found in queue.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-xs font-semibold text-muted-foreground">
                        <th className="pb-3 pl-2">Document Requested</th>
                        <th className="pb-3">Student Name</th>
                        <th className="pb-3">Roll Number</th>
                        <th className="pb-3">Purpose</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 pr-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {documentRequests
                        .filter((d: any) => docFilter === 'all' || d.status === docFilter)
                        .map((doc: any) => {
                          const isPending = doc.status === 'pending';
                          const isCompleted = doc.status === 'completed';
                          const isRejected = doc.status === 'rejected';
                          return (
                            <tr key={doc.id} className="hover:bg-muted/30">
                              <td className="py-3 pl-2 font-medium text-foreground">{doc.documentName}</td>
                              <td className="py-3">{doc.student?.user?.name || 'Student'}</td>
                              <td className="py-3 font-mono text-xs">{doc.student?.rollNumber || 'N/A'}</td>
                              <td className="py-3 text-muted-foreground max-w-xs truncate">{doc.purpose || 'Official purpose'}</td>
                              <td className="py-3 text-xs">{new Date(doc.requestedAt).toLocaleDateString()}</td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  isCompleted ? 'bg-success/10 text-success' :
                                  isPending ? 'bg-warning/10 text-warning' :
                                  'bg-destructive/10 text-destructive'
                                }`}>
                                  {doc.status}
                                </span>
                              </td>
                              <td className="py-3 pr-2 text-right">
                                {isPending ? (
                                  <div className="flex justify-end gap-1.5">
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
                                      className="text-destructive hover:bg-destructive/10"
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
        )}
      </div>

      {/* ─── MODAL: REALLOCATE / ALLOCATE FACULTY TO COURSE ─── */}
      {allocatingCourse && (
        <Dialog open={!!allocatingCourse} onOpenChange={(open) => !open && setAllocatingCourse(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Allocate Course Faculty</DialogTitle>
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
              <DialogFooter>
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
              <DialogTitle>Create Department Course</DialogTitle>
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
                    className="mt-1 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm"
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
                    className="mt-1 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm"
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
                  className="mt-1 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm"
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
              <DialogTitle>Add Timetable Period</DialogTitle>
              <DialogDescription>
                Schedule a course session for Semester {timetableSemester} (Sec {timetableSection})
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddPeriod} className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Day of Week</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm"
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
                    className="mt-1 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm"
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
                  className="mt-1 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm"
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
                  className="mt-1 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm"
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
                <div className="p-2 rounded-lg bg-success/10 text-success">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle>Upload & Approve Certificate</DialogTitle>
                  <DialogDescription>
                    Provide signed document link or file URL for {approvingDoc.documentName}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleApproveDocument} className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
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

              <DialogFooter>
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
                <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle>Reject Document Request</DialogTitle>
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

              <DialogFooter>
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
