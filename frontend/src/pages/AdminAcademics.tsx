import { Course } from '@/api/apiInterface';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  BookOpen, Plus, Search, X, Pencil, Trash2
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCourses, useDepartments, useDepartmentMutations, useCourseMutations } from '@/features/admin/hooks';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};


function getCourseTypeColor(type?: string) {
  switch (type) {
    case 'theory': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'lab': return 'bg-green-100 text-green-700 border-green-200';
    case 'elective': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'project': return 'bg-orange-100 text-orange-700 border-orange-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export default function AdminAcademics() {
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;
  const [activeTab, setActiveTab] = useState<'courses'>('courses');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [departmentForm, setDepartmentForm] = useState({ code: '', name: '' });
  
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [editCourseId, setEditCourseId] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState({
    code: '', name: '', department: '', semester: 1, credits: 3, type: 'theory' as 'theory' | 'lab' | 'elective' | 'project'
  });

  const { data: courses } = useCourses();
  const { data: departments } = useDepartments();
  const departmentMutations = useDepartmentMutations();
  const courseMutations = useCourseMutations();

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await courseMutations.create.mutateAsync(courseForm);
      setShowCourseModal(false);
      setCourseForm({ code: '', name: '', department: '', semester: 1, credits: 3, type: 'theory' as 'theory' | 'lab' | 'elective' | 'project' });
    } catch (err) {
      console.error('Failed to create course:', err);
      alert('Failed to create course. Please try again.');
    }
  };

  const handleEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCourseId) return;
    try {
      await courseMutations.update.mutateAsync({
        id: editCourseId,
        code: courseForm.code,
        name: courseForm.name,
        department: courseForm.department,
        semester: courseForm.semester,
        credits: courseForm.credits,
        type: courseForm.type,
      });
      setShowEditCourseModal(false);
      setEditCourseId(null);
    } catch (err) {
      console.error('Failed to update course:', err);
      alert('Failed to update course.');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await courseMutations.remove.mutateAsync(id);
    } catch (err) {
      console.error('Failed to delete course:', err);
      alert('Failed to delete course.');
    }
  };

  const openEditCourseModal = (course: Course) => {
    setEditCourseId(course.id);
    setCourseForm({
      code: course.code || '',
      name: course.name || '',
      department: course.department || '',
      semester: course.semester || 1,
      credits: course.credits || 3,
      type: course.type || 'theory'
    });
    setShowEditCourseModal(true);
  };

  const filteredCourses = courses?.filter(c => {
    return c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];
  
  const tabs = [
    { id: 'courses', label: 'Courses', icon: BookOpen },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-2 border-border/60 bg-gradient-to-r from-violet-500/5 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Wrapper variants={container} initial="hidden" animate="show" className="space-y-5">
            <Wrapper variants={item}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-500">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="font-display text-2xl font-bold tracking-tight">Academics Management</h1>
                    <p className="text-sm text-muted-foreground">Programs, degrees, and courses</p>
                  </div>
                </div>
                <Button onClick={() => setShowDepartmentForm((value) => !value)}>
                  <Plus className="w-4 h-4 mr-2" /> Add New
                </Button>
              </div>
            </Wrapper>

          </Wrapper>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <Card className="mb-6 border-2 border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-display">Departments</CardTitle>
              <CardDescription>{departments?.length ?? 0} departments</CardDescription>
            </div>
            <Link to="/admin/hod" className="text-xs text-primary font-medium hover:underline">
              Manage HODs &rarr;
            </Link>
          </CardHeader>
          <CardContent>
            {showDepartmentForm && <form className="mb-5 flex flex-col md:flex-row gap-3" onSubmit={async (event) => { event.preventDefault(); await departmentMutations.create.mutateAsync(departmentForm); setDepartmentForm({ code: '', name: '' }); setShowDepartmentForm(false); }}>
              <Input required placeholder="Code" value={departmentForm.code} onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value })} />
              <Input required placeholder="Department name" value={departmentForm.name} onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })} />
              <Button type="submit" disabled={departmentMutations.create.isPending}>Create</Button>
            </form>}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {departments?.map((department) => <div key={department.id} className="rounded-lg border p-4"><div className="flex justify-between"><span className="font-mono font-semibold">{department.code}</span><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={async () => { const name = window.prompt('Department name', department.name); if (name && name.trim() !== department.name) await departmentMutations.update.mutateAsync({ id: department.id, code: department.code, name: name.trim() }); }}>Edit</Button><Button variant="ghost" size="sm" onClick={async () => { if (window.confirm(`Delete ${department.name}?`)) await departmentMutations.remove.mutateAsync(department.id); }}>Delete</Button></div></div><p className="font-medium mt-1">{department.name}</p><p className="text-xs text-muted-foreground">{department.facultyCount ?? 0} faculty • {department.studentCount ?? 0} students{department.headOfDepartment ? ` • HOD: ${department.headOfDepartment}` : ''}</p></div>)}
              {!departments?.length && <p className="text-sm text-muted-foreground">No departments found.</p>}
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-1 mb-6 p-1 bg-muted/50 rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>



        {activeTab === 'courses' && (
          <Card className="border-2 border-border/60">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-display">Course Catalog</CardTitle>
                  <CardDescription>{filteredCourses.length} courses</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search courses..."
                    className="pl-9 w-full sm:w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button size="sm" onClick={() => setShowCourseModal(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Course
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Wrapper variants={container} initial="hidden" animate="show">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-border/60">
                          <th className="text-left pb-3 px-2 text-sm font-semibold text-muted-foreground">Code</th>
                          <th className="text-left pb-3 px-2 text-sm font-semibold text-muted-foreground">Course Name</th>
                          <th className="text-left pb-3 px-2 text-sm font-semibold text-muted-foreground">Department</th>
                          <th className="text-center pb-3 px-2 text-sm font-semibold text-muted-foreground">Sem</th>
                          <th className="text-center pb-3 px-2 text-sm font-semibold text-muted-foreground">Credits</th>
                          <th className="text-center pb-3 px-2 text-sm font-semibold text-muted-foreground">Type</th>
                          <th className="text-right pb-3 px-2 text-sm font-semibold text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCourses.map((course) => (
                          <motion.tr
                            key={course.id}
                            variants={item}
                            className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3 px-2">
                              <span className="font-mono text-sm font-medium">{course.code}</span>
                            </td>
                            <td className="py-3 px-2">
                              <div>
                                <p className="font-medium">{course.name}</p>
                                <p className="text-xs text-muted-foreground">{course.facultyInstructor}</p>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-sm">{course.department}</td>
                            <td className="py-3 px-2 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-sm font-medium">
                                {course.semester}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="font-mono font-semibold">{course.credits}</span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className={cn(
                                "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border",
                                getCourseTypeColor(course.type || '')
                              )}>
                                {(course.type || '').charAt(0).toUpperCase() + (course.type || '').slice(1)}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditCourseModal(course)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteCourse(course.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              </Wrapper>
            </CardContent>
          </Card>
        )}
      </div>

      {showCourseModal && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-xl border-2 border-border w-full max-w-lg shadow-xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-display text-lg font-semibold">Add New Course</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCourseModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form onSubmit={handleCreateCourse} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Course Code</Label>
                  <Input required id="code" className="mt-1.5" placeholder="CS101" value={courseForm.code} onChange={e => setCourseForm({...courseForm, code: e.target.value})} />
                </div>
                <div>
                  <Label htmlFor="name">Course Name</Label>
                  <Input required id="name" className="mt-1.5" placeholder="Intro to CS" value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} />
                </div>
                <div>
                  <Label>Department</Label>
                  <select required className="mt-1.5 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm" value={courseForm.department} onChange={e => setCourseForm({...courseForm, department: e.target.value})}>
                    <option value="">Select Department</option>
                    {departments?.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Semester</Label>
                  <Input required type="number" min="1" max="10" className="mt-1.5" value={courseForm.semester} onChange={e => setCourseForm({...courseForm, semester: Number(e.target.value)})} />
                </div>
                <div>
                  <Label>Credits</Label>
                  <Input required type="number" min="1" max="10" className="mt-1.5" value={courseForm.credits} onChange={e => setCourseForm({...courseForm, credits: Number(e.target.value)})} />
                </div>
                <div>
                  <Label>Type</Label>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <select required className="mt-1.5 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm" value={courseForm.type} onChange={e => setCourseForm({...courseForm, type: e.target.value as any})}>
                    <option value="theory">Theory</option>
                    <option value="lab">Lab</option>
                    <option value="elective">Elective</option>
                    <option value="project">Project</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowCourseModal(false)}>Cancel</Button>
                <Button type="submit" disabled={courseMutations.create.isPending}>
                  {courseMutations.create.isPending ? 'Creating...' : 'Create Course'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showEditCourseModal && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-xl border-2 border-border w-full max-w-lg shadow-xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-display text-lg font-semibold">Edit Course</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowEditCourseModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form onSubmit={handleEditCourse} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code-edit">Course Code (Read Only)</Label>
                  <Input disabled id="code-edit" className="mt-1.5" value={courseForm.code} />
                </div>
                <div>
                  <Label htmlFor="name-edit">Course Name</Label>
                  <Input required id="name-edit" className="mt-1.5" placeholder="Intro to CS" value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} />
                </div>
                <div>
                  <Label>Credits</Label>
                  <Input required type="number" min="1" max="10" className="mt-1.5" value={courseForm.credits} onChange={e => setCourseForm({...courseForm, credits: Number(e.target.value)})} />
                </div>
                <div>
                  <Label>Type</Label>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <select required className="mt-1.5 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm" value={courseForm.type} onChange={e => setCourseForm({...courseForm, type: e.target.value as any})}>
                    <option value="theory">Theory</option>
                    <option value="lab">Lab</option>
                    <option value="elective">Elective</option>
                    <option value="project">Project</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowEditCourseModal(false)}>Cancel</Button>
                <Button type="submit" disabled={courseMutations.update.isPending}>
                  {courseMutations.update.isPending ? 'Updating...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
