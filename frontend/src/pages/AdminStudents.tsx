import { Student } from '@/api/apiInterface';
import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  GraduationCap, Search, Download, Plus,
  ChevronLeft, ChevronRight, X,
  Pencil, Trash2, Copy, CheckCheck, KeyRound
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStudentsList, useDepartments, useStudentMutations } from '@/features/admin/hooks';
import { cn } from '@/lib/utils';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

function getFeeStatusColor(status?: string) {
  switch (status) {
    case 'paid': return 'bg-success/10 text-success border-success/20';
    case 'partial': return 'bg-warning/10 text-warning border-warning/20';
    case 'due': return 'bg-destructive/10 text-destructive border-destructive/20';
    default: return 'bg-muted text-muted-foreground';
  }
}

export default function AdminStudents() {
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showAddModal, setShowAddModal] = useState(false);
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    degree: 'B.Tech',
    semester: 1,
    batch: '2023-2027',
    section: 'A',
    feeQuota: 'general' as 'management' | 'general' | 'merit' | 'nri'
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStudentId, setEditStudentId] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ name: string; campusId?: string; rollNumber: string; email: string; password: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const studentMutations = useStudentMutations();

  const { data: students, isLoading, error } = useStudentsList();
  const { data: departments } = useDepartments();

  const filteredStudents = students?.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = !departmentFilter || student.department === departmentFilter;
    return matchesSearch && matchesDept;
  }) || [];

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    total: students?.length || 0,
    paid: students?.filter(s => s.feeStatus === 'paid').length || 0,
    partial: students?.filter(s => s.feeStatus === 'partial').length || 0,
    due: students?.filter(s => s.feeStatus === 'due').length || 0,
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="max-w-md mx-auto mt-20 border-destructive">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">Failed to load students data</p>
            <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await studentMutations.create.mutateAsync(studentForm);
      setShowAddModal(false);
      setCreatedCredentials({
        name: result.name ?? studentForm.name,
        campusId: result.campusId,
        rollNumber: result.rollNumber,
        email: result.email ?? studentForm.email,
        password: 'student123',
      });
      setStudentForm({
        name: '', email: '', phone: '', department: '', degree: 'B.Tech',
        semester: 1, batch: '2023-2027', section: 'A', feeQuota: 'general'
      });
    } catch (err) {
      console.error('Failed to create student:', err);
      alert('Failed to create student. Please check input details.');
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudentId) return;
    try {
      await studentMutations.update.mutateAsync({
        id: editStudentId,
        name: studentForm.name,
        email: studentForm.email,
        phone: studentForm.phone,
        department: studentForm.department,
        degree: studentForm.degree,
        batch: studentForm.batch,
        semester: studentForm.semester,
        section: studentForm.section,
        feeQuota: studentForm.feeQuota,
      });
      setShowEditModal(false);
      setEditStudentId(null);
    } catch (err) {
      console.error('Failed to update student:', err);
      alert('Failed to update student.');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      await studentMutations.remove.mutateAsync(id);
    } catch (err) {
      console.error('Failed to delete student:', err);
      alert('Failed to delete student.');
    }
  };

  const openEditModal = (student: Student) => {
    setEditStudentId(student.id);
    setStudentForm({
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      department: student.department || '',
      degree: student.degree || 'B.Tech',
      semester: student.semester || 1,
      batch: student.batch || '',
      section: student.section || '',
      feeQuota: student.feeQuota || 'general'
    });
    setShowEditModal(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-2 border-border/60 bg-gradient-to-r from-emerald-500/5 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Wrapper variants={container} initial="hidden" animate="show" className="space-y-5">
            <Wrapper variants={item}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="font-display text-2xl font-bold tracking-tight">Student Directory</h1>
                    <p className="text-sm text-muted-foreground">Manage student records and enrollment</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" /> Export
                  </Button>
                  <Button size="sm" onClick={() => setShowAddModal(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Add Student
                  </Button>
                </div>
              </div>
            </Wrapper>

            <Wrapper variants={item}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="font-display text-2xl font-bold tabular-nums">{isLoading ? '...' : stats.total}</p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Fee Paid</p>
                    <p className="font-display text-2xl font-bold tabular-nums text-success">{isLoading ? '...' : stats.paid}</p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Partial Payment</p>
                    <p className="font-display text-2xl font-bold tabular-nums text-warning">{isLoading ? '...' : stats.partial}</p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Fee Due</p>
                    <p className="font-display text-2xl font-bold tabular-nums text-destructive">{isLoading ? '...' : stats.due}</p>
                  </CardContent>
                </Card>
              </div>
            </Wrapper>
          </Wrapper>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <Card className="border-2 border-border/60">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-display">All Students</CardTitle>
                <CardDescription>{filteredStudents.length} students found</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, roll..."
                    className="pl-9 w-full sm:w-64"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  />
                </div>
                <select
                  className="h-10 rounded-lg border-2 border-input bg-background px-3 text-sm"
                  value={departmentFilter}
                  onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">All Departments</option>
                  {departments?.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton />
            ) : (
              <Wrapper variants={container} initial="hidden" animate="show">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-border/60">
                        <th className="text-left pb-3 px-2 text-sm font-semibold text-muted-foreground">Roll No.</th>
                        <th className="text-left pb-3 px-2 text-sm font-semibold text-muted-foreground">Name</th>
                        <th className="text-left pb-3 px-2 text-sm font-semibold text-muted-foreground">Department</th>
                        <th className="text-center pb-3 px-2 text-sm font-semibold text-muted-foreground">Sem</th>
                        <th className="text-center pb-3 px-2 text-sm font-semibold text-muted-foreground">CGPA</th>
                        <th className="text-center pb-3 px-2 text-sm font-semibold text-muted-foreground">Fee Status</th>
                        <th className="text-right pb-3 px-2 text-sm font-semibold text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                {paginatedStudents.map((student) => (
                        <motion.tr
                          key={student.id}
                          variants={item}
                          className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 px-2">
                            <span className="font-mono text-sm font-medium">{student.rollNumber}</span>
                          </td>
                          <td className="py-3 px-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-medium">{student.name}</p>
                                {student.campusId && (
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                    {student.campusId}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-sm">{student.department}</td>
                          <td className="py-3 px-2 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-sm font-medium">
                              {student.semester}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={cn(
                              "font-mono font-semibold tabular-nums",
                              (student.cgpa || 0) >= 8 ? 'text-success' :
                              (student.cgpa || 0) >= 6 ? 'text-warning' : 'text-destructive'
                            )}>
                              {student.cgpa?.toFixed(2) || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border",
                              getFeeStatusColor(student.feeStatus)
                            )}>
                              {student.feeStatus ? student.feeStatus.charAt(0).toUpperCase() + student.feeStatus.slice(1) : '-'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditModal(student)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteStudent(student.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/40">
                    <p className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Wrapper>
            )}
          </CardContent>
        </Card>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card w-full max-w-lg rounded-xl border shadow-xl p-6 relative overflow-y-auto max-h-[90vh]"
          >
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="text-xl font-bold mb-4 font-display">Add New Student</h2>
            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></label>
                  <Input required placeholder="John Doe" value={studentForm.name} onChange={e => setStudentForm({ ...studentForm, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email <span className="text-destructive">*</span></label>
                  <Input required type="email" placeholder="john@example.com" value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input placeholder="+1234567890" value={studentForm.phone} onChange={e => setStudentForm({ ...studentForm, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Department <span className="text-destructive">*</span></label>
                  <select required className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm" value={studentForm.department} onChange={e => setStudentForm({ ...studentForm, department: e.target.value })}>
                    <option value="">Select Department</option>
                    {departments?.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Degree Program <span className="text-destructive">*</span></label>
                  <Input required placeholder="B.Tech" value={studentForm.degree} onChange={e => setStudentForm({ ...studentForm, degree: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Semester <span className="text-destructive">*</span></label>
                  <Input required type="number" min="1" max="10" placeholder="1" value={studentForm.semester} onChange={e => setStudentForm({ ...studentForm, semester: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Batch <span className="text-destructive">*</span></label>
                  <Input required placeholder="2023-2027" value={studentForm.batch} onChange={e => setStudentForm({ ...studentForm, batch: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Section</label>
                  <Input placeholder="A" value={studentForm.section} onChange={e => setStudentForm({ ...studentForm, section: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Fee Quota <span className="text-destructive">*</span></label>
                  <select required className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm" value={studentForm.feeQuota} onChange={e => setStudentForm({ ...studentForm, feeQuota: e.target.value as any /* eslint-disable-line @typescript-eslint/no-explicit-any */ })}>
                    <option value="general">General</option>
                    <option value="merit">Merit</option>
                    <option value="management">Management</option>
                    <option value="nri">NRI</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" disabled={studentMutations.create.isPending}>
                  {studentMutations.create.isPending ? 'Creating...' : 'Create Student'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card w-full max-w-lg rounded-xl border shadow-xl p-6 relative overflow-y-auto max-h-[90vh]"
          >
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="text-xl font-bold mb-4 font-display">Edit Student</h2>
            <form onSubmit={handleEditStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></label>
                  <Input required placeholder="John Doe" value={studentForm.name} onChange={e => setStudentForm({ ...studentForm, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email (Read Only)</label>
                  <Input disabled type="email" value={studentForm.email} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input placeholder="+1234567890" value={studentForm.phone} onChange={e => setStudentForm({ ...studentForm, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Semester <span className="text-destructive">*</span></label>
                  <Input required type="number" min="1" max="10" placeholder="1" value={studentForm.semester} onChange={e => setStudentForm({ ...studentForm, semester: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Section</label>
                  <Input placeholder="A" value={studentForm.section} onChange={e => setStudentForm({ ...studentForm, section: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button type="submit" disabled={studentMutations.update.isPending}>
                  {studentMutations.update.isPending ? 'Updating...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── Credentials Modal ─────────────────────────────── */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-xl border-2 border-border w-full max-w-sm shadow-xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-success/10">
                  <KeyRound className="w-4 h-4 text-success" />
                </div>
                <h2 className="font-display text-base font-semibold">Student Created</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCreatedCredentials(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Share these login credentials with <span className="font-semibold text-foreground">{createdCredentials.name}</span>.</p>
              {[
                { label: 'Campus ID (Login ID)', value: createdCredentials.campusId || '', key: 'coid' },
                { label: 'Roll Number', value: createdCredentials.rollNumber, key: 'roll' },
                { label: 'Contact Email', value: createdCredentials.email, key: 'email' },
                { label: 'Default Password', value: createdCredentials.password, key: 'pass' },
              ].map(({ label, value, key }) => (
                <div key={key} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted border border-border/60">
                    <span className="flex-1 font-mono text-sm">{value}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleCopy(value, key)}
                    >
                      {copied === key
                        ? <CheckCheck className="w-3.5 h-3.5 text-success" />
                        : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-warning pt-1">⚠ The student should change their password after first login.</p>
            </div>
            <div className="px-4 pb-4">
              <Button className="w-full" onClick={() => setCreatedCredentials(null)}>Done</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>

  );
}
