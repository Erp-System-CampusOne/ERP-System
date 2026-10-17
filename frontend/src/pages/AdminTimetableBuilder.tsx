import { Course, Faculty } from '@/api/apiInterface';
import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Calendar, Plus, Save, Download, RotateCcw,
  Clock, MapPin, CheckCircle, AlertCircle, X, Loader2
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useCourses, useDepartments, useFacultyList, useTimetableMutations } from '@/features/admin/hooks';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
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

import { useQuery } from '@tanstack/react-query';
import { apiConfig } from '@/api/apiCall';

function useTimetables() {
  return useQuery({
    queryKey: ['admin', 'timetables'],
    queryFn: async () => {
      const res = await fetch(`${apiConfig.baseUrl}/academics/timetable`, {
        headers: {
          'Content-Type': 'application/json',
          ...apiConfig.headers,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch timetables');
      return res.json();
    },
  });
}

export default function AdminTimetableBuilder() {
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(4);
  const [selectedSection, setSelectedSection] = useState('A');
  const [localEntries, setLocalEntries] = useState<any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    dayOfWeek: 'Monday',
    period: 1,
    courseId: '',
    facultyId: '',
    roomNumber: ''
  });

  const { data: coursesData } = useCourses();
  const { data: facultyData } = useFacultyList();
  const { data: departments } = useDepartments();
  const { data: timetablesData } = useTimetables();
  const timetableMutations = useTimetableMutations();
  
  const courses = Array.isArray(coursesData) ? coursesData : [];
  const faculty = Array.isArray(facultyData) ? facultyData : [];

  React.useEffect(() => {
    if (timetablesData && Array.isArray(timetablesData.entries)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalEntries(timetablesData.entries);
    }
  }, [timetablesData]);

  const getEntry = (day: string, period: number) => {
    return localEntries.find((e) => e.dayOfWeek === day && e.period === period);
  };

  const handleAddPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    const course = courses.find((c: Course) => c.id === periodForm.courseId);
    const fac = faculty.find((f: Faculty) => f.id === periodForm.facultyId);
    
    if (!course || !fac) return;

    const timeSlot = TIME_SLOTS.find(t => t.period === periodForm.period)?.time || '';

    const newEntry = {
      dayOfWeek: periodForm.dayOfWeek,
      period: periodForm.period,
      courseId: periodForm.courseId,
      facultyId: periodForm.facultyId,
      roomNumber: periodForm.roomNumber,
      subjectCode: course.code,
      subjectName: course.name,
      facultyName: (fac as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).user?.name || fac.id,
      timeSlot
    };

    setLocalEntries(prev => [...prev.filter(e => !(e.dayOfWeek === periodForm.dayOfWeek && e.period === periodForm.period)), newEntry]);
    setShowAddModal(false);
  };

  const handleSaveTimetable = async () => {
    if (!selectedDepartment) {
      alert('Please select a department');
      return;
    }
    try {
      await timetableMutations.save.mutateAsync({
        department: selectedDepartment,
        semester: selectedSemester,
        section: selectedSection,
        entries: localEntries
      });
      alert('Timetable saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save timetable');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-2 border-border/60 bg-gradient-to-r from-amber-500/5 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Wrapper variants={container} initial="hidden" animate="show" className="space-y-5">
            <Wrapper variants={item}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="font-display text-2xl font-bold tracking-tight">Timetable Builder</h1>
                    <p className="text-sm text-muted-foreground">Create and manage class schedules</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    if (timetablesData && Array.isArray(timetablesData.entries)) {
                      setLocalEntries(timetablesData.entries);
                    }
                  }}>
                    <RotateCcw className="w-4 h-4 mr-1" /> Reset
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    if (!selectedDepartment) {
                      alert('Please select a department first');
                      return;
                    }
                    window.open(`${apiConfig.baseUrl}/academics/timetable/export?department=${selectedDepartment}&semester=${selectedSemester}&section=${selectedSection}`, '_blank');
                  }}>
                    <Download className="w-4 h-4 mr-1" /> Export
                  </Button>
                  <Button size="sm" onClick={handleSaveTimetable} disabled={timetableMutations.save.isPending}>
                    {timetableMutations.save.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save
                  </Button>
                </div>
              </div>
            </Wrapper>

            <Wrapper variants={item}>
              <Card className="border-2 border-border/60 bg-card">
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-48">
                      <Label className="mb-1.5 block">Department</Label>
                      <select
                        className="h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm"
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                      >
                        <option value="">Select Department</option>
                        {departments?.map(dept => (
                          <option key={dept.id} value={dept.name}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-28">
                      <Label className="mb-1.5 block">Semester</Label>
                      <select
                        className="h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm"
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(Number(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                          <option key={s} value={s}>Semester {s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <Label className="mb-1.5 block">Section</Label>
                      <select
                        className="h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm"
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                      >
                        {['A', 'B', 'C'].map(s => (
                          <option key={s} value={s}>Section {s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Wrapper>

            <Wrapper variants={item}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Conflicts</p>
                      <p className="font-display text-xl font-bold">0</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <AlertCircle className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Unassigned</p>
                      <p className="font-display text-xl font-bold">
                        {DAYS.length * TIME_SLOTS.length - localEntries.length}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-info/10">
                      <Clock className="w-5 h-5 text-info" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Periods</p>
                      <p className="font-display text-xl font-bold">{localEntries.length}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Wrapper>
          </Wrapper>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <Card className="border-2 border-border/60 overflow-hidden">
          <CardHeader className="pb-4 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-display">Weekly Timetable</CardTitle>
                <CardDescription>Section {selectedSection} - Semester {selectedSemester}</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Period
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Wrapper variants={container} initial="hidden" animate="show">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground w-24">Time</th>
                      {DAYS.map(day => (
                        <th key={day} className="p-3 text-center text-sm font-semibold text-muted-foreground">
                          {day.slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map((slot) => (
                      <motion.tr key={slot.period} variants={item} className="border-t border-border/40">
                        <td className="p-3 text-sm">
                          <div className="font-mono text-xs text-muted-foreground">{slot.time}</div>
                          <div className="font-medium text-xs">P{slot.period}</div>
                        </td>
                        {DAYS.map(day => {
                          const entry = getEntry(day, slot.period);
                          return (
                            <td key={`${day}-${slot.period}`} className="p-2 align-top">
                              {entry ? (
                                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 hover:border-amber-300 transition-colors cursor-pointer group">
                                  <p className="font-medium text-xs text-foreground line-clamp-2">{entry.subjectName}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{entry.facultyName}</p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3" /> {entry.roomNumber}
                                  </p>
                                </div>
                              ) : (
                                <button onClick={() => {
                                  setPeriodForm(prev => ({ ...prev, dayOfWeek: day, period: slot.period }));
                                  setShowAddModal(true);
                                }} className="w-full h-16 rounded-lg border-2 border-dashed border-border/60 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center group">
                                  <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Wrapper>
          </CardContent>
        </Card>

        <Card className="border-2 border-border/60 mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Quick Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-500" />
                <span className="text-sm text-muted-foreground">Theory</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-500" />
                <span className="text-sm text-muted-foreground">Lab</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-500" />
                <span className="text-sm text-muted-foreground">Elective</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-xl border-2 border-border w-full max-w-md shadow-xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-display text-lg font-semibold">Add Period</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form onSubmit={handleAddPeriod} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Day</Label>
                  <select 
                    className="h-10 w-full mt-1.5 rounded-lg border-2 border-input bg-background px-3 text-sm"
                    value={periodForm.dayOfWeek}
                    onChange={e => setPeriodForm({ ...periodForm, dayOfWeek: e.target.value })}
                    required
                  >
                    {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Period</Label>
                  <select 
                    className="h-10 w-full mt-1.5 rounded-lg border-2 border-input bg-background px-3 text-sm"
                    value={periodForm.period}
                    onChange={e => setPeriodForm({ ...periodForm, period: Number(e.target.value) })}
                    required
                  >
                    {TIME_SLOTS.map(s => <option key={s.period} value={s.period}>Period {s.period}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <Label>Course</Label>
                <select 
                  className="h-10 w-full mt-1.5 rounded-lg border-2 border-input bg-background px-3 text-sm"
                  value={periodForm.courseId}
                  onChange={e => setPeriodForm({ ...periodForm, courseId: e.target.value })}
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map((c: Course) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>

              <div>
                <Label>Faculty</Label>
                <select 
                  className="h-10 w-full mt-1.5 rounded-lg border-2 border-input bg-background px-3 text-sm"
                  value={periodForm.facultyId}
                  onChange={e => setPeriodForm({ ...periodForm, facultyId: e.target.value })}
                  required
                >
                  <option value="">Select Faculty</option>
                  {faculty.map((f: Faculty) => <option key={f.id} value={f.id}>{(f as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).user?.name || f.employeeCode}</option>)}
                </select>
              </div>

              <div>
                <Label>Room Number</Label>
                <input 
                  type="text"
                  className="h-10 w-full mt-1.5 rounded-lg border-2 border-input bg-background px-3 text-sm"
                  value={periodForm.roomNumber}
                  onChange={e => setPeriodForm({ ...periodForm, roomNumber: e.target.value })}
                  placeholder="e.g. 401"
                  required
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit">Add Period</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
