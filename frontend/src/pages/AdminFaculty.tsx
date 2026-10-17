import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Users, Search, Plus, ChevronLeft, ChevronRight, X,
  Pencil, Trash2, Copy, CheckCheck, KeyRound
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFacultyList, useDepartments, useFacultyMutations } from '@/features/admin/hooks';
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

export default function AdminFaculty() {
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showAddModal, setShowAddModal] = useState(false);
  const [facultyForm, setFacultyForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: 'Assistant Professor',
    qualification: ''
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFacultyId, setEditFacultyId] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ name: string; campusId?: string; employeeCode: string; email: string; password: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const facultyMutations = useFacultyMutations();

  const { data: faculty, isLoading, error } = useFacultyList();
  const { data: departments } = useDepartments();

  const filteredFaculty = faculty?.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = !departmentFilter || f.department === departmentFilter;
    return matchesSearch && matchesDept;
  }) || [];

  const totalPages = Math.ceil(filteredFaculty.length / itemsPerPage);
  const paginatedFaculty = filteredFaculty.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    total: faculty?.length || 0,
    professors: faculty?.filter(f => f.designation.includes('Professor')).length || 0,
    avgWorkload: Math.round((faculty?.reduce((acc, f) => acc + (f.weeklyWorkloadHours || 0), 0) || 0) / (faculty?.length || 1)),
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="max-w-md mx-auto mt-20 border-destructive">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">Failed to load faculty data</p>
            <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await facultyMutations.create.mutateAsync(facultyForm);
      setShowAddModal(false);
      setCreatedCredentials({
        name: result.name ?? facultyForm.name,
        campusId: result.campusId,
        employeeCode: result.employeeCode,
        email: result.email ?? facultyForm.email,
        password: 'faculty123',
      });
      setFacultyForm({
        name: '', email: '', phone: '', department: '', designation: 'Assistant Professor', qualification: ''
      });
    } catch (err) {
      console.error('Failed to create faculty:', err);
      alert('Failed to create faculty. Please check input details.');
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleEditFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFacultyId) return;
    try {
      await facultyMutations.update.mutateAsync({
        id: editFacultyId,
        name: facultyForm.name,
        email: facultyForm.email,
        phone: facultyForm.phone,
        department: facultyForm.department,
        designation: facultyForm.designation,
        qualification: facultyForm.qualification,
      });
      setShowEditModal(false);
      setEditFacultyId(null);
    } catch (err) {
      console.error('Failed to update faculty:', err);
      alert('Failed to update faculty.');
    }
  };

  const handleDeleteFaculty = async (id: string) => {
    if (!confirm('Are you sure you want to delete this faculty member?')) return;
    try {
      await facultyMutations.remove.mutateAsync(id);
    } catch (err) {
      console.error('Failed to delete faculty:', err);
      alert('Failed to delete faculty.');
    }
  };

  const openEditModal = (faculty: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
    setEditFacultyId(faculty.id);
    setFacultyForm({
      name: faculty.name || '',
      email: faculty.email || '',
      phone: faculty.phone || '',
      department: faculty.department || '',
      designation: faculty.designation || 'Assistant Professor',
      qualification: faculty.qualification || ''
    });
    setShowEditModal(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-2 border-border/60 bg-gradient-to-r from-blue-500/5 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Wrapper variants={container} initial="hidden" animate="show" className="space-y-5">
            <Wrapper variants={item}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="font-display text-2xl font-bold tracking-tight">Faculty Directory</h1>
                    <p className="text-sm text-muted-foreground">Manage faculty and staff profiles</p>
                  </div>
                </div>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Faculty
                </Button>
              </div>
            </Wrapper>

            <Wrapper variants={item}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Faculty</p>
                    <p className="font-display text-2xl font-bold tabular-nums">{isLoading ? '...' : stats.total}</p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Professors</p>
                    <p className="font-display text-2xl font-bold tabular-nums">{isLoading ? '...' : stats.professors}</p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Avg. Workload</p>
                    <p className="font-display text-2xl font-bold tabular-nums">{isLoading ? '...' : `${stats.avgWorkload}h`}</p>
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
                <CardTitle className="text-lg font-display">All Faculty Members</CardTitle>
                <CardDescription>{filteredFaculty.length} members</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, code..."
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
                        <th className="text-left pb-3 px-2 text-sm font-semibold text-muted-foreground">Emp. Code</th>
                        <th className="text-left pb-3 px-2 text-sm font-semibold text-muted-foreground">Name</th>
                        <th className="text-left pb-3 px-2 text-sm font-semibold text-muted-foreground">Department</th>
                        <th className="text-left pb-3 px-2 text-sm font-semibold text-muted-foreground">Designation</th>
                        <th className="text-center pb-3 px-2 text-sm font-semibold text-muted-foreground">Qualification</th>
                        <th className="text-center pb-3 px-2 text-sm font-semibold text-muted-foreground">Workload</th>
                        <th className="text-center pb-3 px-2 text-sm font-semibold text-muted-foreground">Leave Bal.</th>
                        <th className="text-right pb-3 px-2 text-sm font-semibold text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedFaculty.map((f) => (
                        <motion.tr
                          key={f.id}
                          variants={item}
                          className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 px-2">
                            <span className="font-mono text-sm font-medium">{f.employeeCode}</span>
                          </td>
                          <td className="py-3 px-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-medium">{f.name}</p>
                                {f.campusId && (
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                    {f.campusId}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{f.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-sm">{f.department}</td>
                          <td className="py-3 px-2 text-sm">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
                              {f.designation}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center text-sm">{f.qualification}</td>
                          <td className="py-3 px-2 text-center">
                            <span className={cn(
                              "font-mono font-semibold",
                              (f.weeklyWorkloadHours || 0) > 18 ? 'text-warning' : 'text-success'
                            )}>
                              {f.weeklyWorkloadHours}h
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="font-mono text-sm">{f.leaveBalance}</span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditModal(f)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteFaculty(f.id)}>
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
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredFaculty.length)} of {filteredFaculty.length}
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
            <h2 className="text-xl font-bold mb-4 font-display">Add New Faculty</h2>
            <form onSubmit={handleCreateFaculty} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></label>
                  <Input required placeholder="Dr. John Doe" value={facultyForm.name} onChange={e => setFacultyForm({ ...facultyForm, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email <span className="text-destructive">*</span></label>
                  <Input required type="email" placeholder="john.doe@example.com" value={facultyForm.email} onChange={e => setFacultyForm({ ...facultyForm, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input placeholder="+1234567890" value={facultyForm.phone} onChange={e => setFacultyForm({ ...facultyForm, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Department <span className="text-destructive">*</span></label>
                  <select required className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm" value={facultyForm.department} onChange={e => setFacultyForm({ ...facultyForm, department: e.target.value })}>
                    <option value="">Select Department</option>
                    {departments?.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Designation <span className="text-destructive">*</span></label>
                  <select required className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm" value={facultyForm.designation} onChange={e => setFacultyForm({ ...facultyForm, designation: e.target.value })}>
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Lecturer">Lecturer</option>
                    <option value="Lab Assistant">Lab Assistant</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Highest Qualification</label>
                  <Input placeholder="Ph.D. in Computer Science" value={facultyForm.qualification} onChange={e => setFacultyForm({ ...facultyForm, qualification: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" disabled={facultyMutations.create.isPending}>
                  {facultyMutations.create.isPending ? 'Creating...' : 'Create Faculty'}
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
            <h2 className="text-xl font-bold mb-4 font-display">Edit Faculty</h2>
            <form onSubmit={handleEditFaculty} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></label>
                  <Input required placeholder="Dr. John Doe" value={facultyForm.name} onChange={e => setFacultyForm({ ...facultyForm, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email (Read Only)</label>
                  <Input disabled type="email" value={facultyForm.email} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input placeholder="+1234567890" value={facultyForm.phone} onChange={e => setFacultyForm({ ...facultyForm, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Designation <span className="text-destructive">*</span></label>
                  <select required className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm" value={facultyForm.designation} onChange={e => setFacultyForm({ ...facultyForm, designation: e.target.value })}>
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Lecturer">Lecturer</option>
                    <option value="Lab Assistant">Lab Assistant</option>
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium">Highest Qualification</label>
                  <Input placeholder="Ph.D. in Computer Science" value={facultyForm.qualification} onChange={e => setFacultyForm({ ...facultyForm, qualification: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button type="submit" disabled={facultyMutations.update.isPending}>
                  {facultyMutations.update.isPending ? 'Updating...' : 'Save Changes'}
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
                <h2 className="font-display text-base font-semibold">Faculty Created</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCreatedCredentials(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Share these login credentials with <span className="font-semibold text-foreground">{createdCredentials.name}</span>.</p>
              {[
                { label: 'CampusOne ID (Login ID)', value: createdCredentials.campusId || createdCredentials.employeeCode, key: 'coid' },
                { label: 'Employee Code', value: createdCredentials.employeeCode, key: 'emp' },
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
              <p className="text-xs text-warning pt-1">⚠ The faculty member should change their password after first login.</p>
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
