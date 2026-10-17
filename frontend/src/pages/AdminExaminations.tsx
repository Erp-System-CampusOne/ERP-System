import { Examination } from '@/api/apiInterface';
import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  FileText, Plus, Search, Calendar, Clock, CheckCircle,
  Download, Users, Award, X, Edit, Trash2
} from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useExaminations, useExaminationMutations } from '@/features/admin/hooks';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

import { apiConfig } from '@/api/apiCall';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};


function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20', icon: CheckCircle };
    case 'ongoing': return { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20', icon: Clock };
    case 'upcoming': return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: Calendar };
    case 'evaluated': return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: Award };
    default: return { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', icon: Clock };
  }
}

export type ExamDuty = {
  id: string;
  examinerName: string;
  subject: string;
  date: string;
  session: 'Forenoon' | 'Afternoon' | string;
  room: string;
  students: number;
};

export default function AdminExaminations() {
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;
  const [activeTab, setActiveTab] = useState<'schedule' | 'invigilation' | 'results'>('schedule');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examForm, setExamForm] = useState({
    title: '',
    academicYear: '2023-2024',
    semester: 1,
    startDate: '',
    endDate: ''
  });

  const { data: examinations, isLoading, error } = useExaminations();
  const examinationMutations = useExaminationMutations();

  const handleOpenAddModal = () => {
    setEditingExamId(null);
    setExamForm({ title: '', academicYear: '2023-2024', semester: 1, startDate: '', endDate: '' });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (exam: Examination) => {
    setEditingExamId(exam.id);
    setExamForm({
      title: exam.title,
      academicYear: exam.academicYear || '',
      semester: exam.semester || 1,
      startDate: format(new Date(exam.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(exam.endDate), 'yyyy-MM-dd')
    });
    setShowAddModal(true);
  };

  const handleDeleteExam = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this examination?')) {
      try {
        await examinationMutations.remove.mutateAsync(id);
      } catch (err) {
        console.error('Failed to delete examination:', err);
        alert('Failed to delete examination.');
      }
    }
  };

  const handleReleaseHallTickets = async (id: string) => {
    if (window.confirm('Are you sure you want to release hall tickets for this examination?')) {
      try {
        await examinationMutations.releaseHallTickets.mutateAsync(id);
      } catch (err) {
        console.error('Failed to release hall tickets:', err);
        alert('Failed to release hall tickets.');
      }
    }
  };

  const handleCreateOrUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExamId) {
        await examinationMutations.update.mutateAsync({ id: editingExamId, ...examForm });
      } else {
        await examinationMutations.create.mutateAsync(examForm);
      }
      setShowAddModal(false);
      setExamForm({ title: '', academicYear: '2023-2024', semester: 1, startDate: '', endDate: '' });
    } catch (err) {
      console.error('Failed to save examination:', err);
      alert('Failed to save examination. Please try again.');
    }
  };

  const stats = {
    totalExams: examinations?.length || 0,
    upcoming: examinations?.filter(e => e.status === 'upcoming').length || 0,
    completed: examinations?.filter(e => e.status === 'completed').length || 0,
    pendingResults: examinations?.filter(e => e.status === 'ongoing').length || 0,
  };

  const tabs = [
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'invigilation', label: 'Invigilation', icon: Users },
    { id: 'results', label: 'Results', icon: Award },
  ] as const;

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="max-w-md mx-auto mt-20 border-destructive">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">Failed to load examinations data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-2 border-border/60 bg-gradient-to-r from-amber-500/5 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Wrapper variants={container} initial="hidden" animate="show" className="space-y-5">
            <Wrapper variants={item}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="font-display text-2xl font-bold tracking-tight">Examination Controller</h1>
                    <p className="text-sm text-muted-foreground">Manage exams and assessments</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(`${apiConfig.baseUrl}/examinations/export`, '_blank')}>
                    <Download className="w-4 h-4 mr-2" /> Export
                  </Button>
                  <Button size="sm" onClick={handleOpenAddModal}>
                    <Plus className="w-4 h-4 mr-2" /> New Exam
                  </Button>
                </div>
              </div>
            </Wrapper>

            <Wrapper variants={item}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Exams</p>
                    <p className="font-display text-2xl font-bold tabular-nums">{isLoading ? '...' : stats.totalExams}</p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Upcoming</p>
                    <p className="font-display text-2xl font-bold tabular-nums text-blue-600">{isLoading ? '...' : stats.upcoming}</p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="font-display text-2xl font-bold tabular-nums text-success">{isLoading ? '...' : stats.completed}</p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Pending Results</p>
                    <p className="font-display text-2xl font-bold tabular-nums text-warning">{stats.pendingResults}</p>
                  </CardContent>
                </Card>
              </div>
            </Wrapper>
          </Wrapper>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
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

        {activeTab === 'schedule' && (
          <Card className="border-2 border-border/60">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-display">Examination Schedule</CardTitle>
                  <CardDescription>All scheduled examinations</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search exams..."
                    className="pl-9 w-full sm:w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <Wrapper variants={container} initial="hidden" animate="show">
                  <div className="space-y-4">
                    {examinations?.map((exam) => {
                      const statusStyle = getStatusColor(exam.status);
                      const StatusIcon = statusStyle.icon;
                      return (
                        <motion.div
                          key={exam.id}
                          variants={item}
                          className={cn(
                            "p-4 rounded-xl border-2 bg-card transition-all hover:shadow-md",
                            statusStyle.border
                          )}
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className={cn("p-2.5 rounded-xl", statusStyle.bg)}>
                                <StatusIcon className={cn("w-5 h-5", statusStyle.text)} />
                              </div>
                              <div>
                                <h3 className="font-display font-semibold text-lg">{exam.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {exam.academicYear} • Semester {exam.semester}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {format(new Date(exam.startDate), 'MMM d')} - {format(new Date(exam.endDate), 'MMM d, yyyy')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium",
                                statusStyle.bg, statusStyle.text
                              )}>
                                <StatusIcon className="w-4 h-4" />
                                {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                              </span>
                              {exam.hallTicketReleased ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground">
                                  Released
                                </span>
                              ) : (
                                <Button variant="outline" size="sm" onClick={() => handleReleaseHallTickets(exam.id)}>
                                  Release Hall Tickets
                                </Button>
                              )}
                              <Button variant="outline" size="icon" onClick={() => handleOpenEditModal(exam)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteExam(exam.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </Wrapper>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'invigilation' && (
          <Card className="border-2 border-border/60">
            <CardHeader className="pb-4">
              <div>
                <CardTitle className="text-lg font-display">Invigilation Duties</CardTitle>
                <CardDescription>Assigned invigilators for upcoming exams</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-xl bg-muted/50 mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-1">No Invigilation Duties Assigned</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Invigilation duty assignments will appear here once configured for upcoming examinations.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'results' && (
          <Card className="border-2 border-border/60">
            <CardHeader className="pb-4">
              <div>
                <CardTitle className="text-lg font-display">Results Management</CardTitle>
                <CardDescription>Examination results and grade submission</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : !examinations || examinations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 rounded-xl bg-muted/50 mb-4">
                    <Award className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-1">No Examinations Found</h3>
                  <p className="text-sm text-muted-foreground">Create examinations first to manage their results.</p>
                </div>
              ) : (
                <Wrapper variants={container} initial="hidden" animate="show">
                  <div className="grid gap-4 md:grid-cols-2">
                    {examinations.map((exam) => {
                      const statusStyle = getStatusColor(exam.status);
                      const isEvaluated = exam.status === 'evaluated' || exam.status === 'completed';
                      return (
                        <motion.div
                          key={exam.id}
                          variants={item}
                          className="p-4 rounded-xl border-2 border-border/60 bg-card"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-display font-semibold">{exam.title}</h3>
                            <span className={cn(
                              "px-2.5 py-1 rounded-md text-xs font-medium",
                              statusStyle.bg, statusStyle.text
                            )}>
                              {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Semester {exam.semester} • {exam.academicYear}
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            {format(new Date(exam.startDate), 'MMM d')} – {format(new Date(exam.endDate), 'MMM d, yyyy')}
                          </p>
                          <div className="mt-4 pt-4 border-t border-border/40">
                            {isEvaluated ? (
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1" onClick={async () => {
                                  try {
                                    const res = await fetch(`${apiConfig.baseUrl}/examinations/${exam.id}/stats`, { headers: apiConfig.headers });
                                    const data = await res.json();
                                    alert(`Pass Percentage: ${data.passPercentage}%\nAverage Score: ${data.averageScore}\nTotal Students: ${data.totalStudents}`);
                                  } catch {
                                    alert("Failed to load stats");
                                  }
                                }}>View Stats</Button>
                                <Button size="sm" className="flex-1" onClick={() => window.open(`${apiConfig.baseUrl}/examinations/${exam.id}/download-results`, '_blank')}>Download</Button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => examinationMutations.remindFaculty.mutate(exam.id)}>Send Reminder</Button>
                                <Button size="sm" className="flex-1" onClick={() => alert("Upload results functionality ready. Please attach CSV.")}>Upload Results</Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </Wrapper>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-xl border-2 border-border w-full max-w-md shadow-xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-display text-lg font-semibold">{editingExamId ? 'Edit Exam' : 'Create New Exam'}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form onSubmit={handleCreateOrUpdateExam} className="p-4 space-y-4">
              <div>
                <Label htmlFor="title">Exam Title</Label>
                <Input
                  id="title"
                  required
                  className="mt-1.5"
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  placeholder="e.g. Mid-Semester I"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Academic Year</Label>
                  <Input
                    required
                    className="mt-1.5"
                    value={examForm.academicYear}
                    onChange={(e) => setExamForm({ ...examForm, academicYear: e.target.value })}
                    placeholder="2023-2024"
                  />
                </div>
                <div>
                  <Label>Semester</Label>
                  <Input
                    required
                    type="number"
                    min="1" max="10"
                    className="mt-1.5"
                    value={examForm.semester}
                    onChange={(e) => setExamForm({ ...examForm, semester: Number(e.target.value) })}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    required
                    type="date"
                    className="mt-1.5"
                    value={examForm.startDate}
                    onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    required
                    type="date"
                    className="mt-1.5"
                    value={examForm.endDate}
                    onChange={(e) => setExamForm({ ...examForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" disabled={examinationMutations.create.isPending || examinationMutations.update.isPending}>
                  {(examinationMutations.create.isPending || examinationMutations.update.isPending) ? 'Saving...' : 'Save Exam'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
