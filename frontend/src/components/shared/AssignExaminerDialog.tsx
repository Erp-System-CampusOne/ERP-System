import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useExaminers, useAssignExaminerMutation, useExaminations, useCourses, useCreateAdminUser } from '@/features/admin/hooks';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { Course, Examination } from '@/api/apiInterface';

interface ExaminerOption {
  id: string;
  name: string;
  email: string;
}

interface AssignExaminerDialogProps {
  departmentName?: string;
  className?: string;
  triggerText?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function AssignExaminerDialog({
  departmentName,
  className,
  triggerText = 'Assign Examiner',
  variant,
  size,
}: AssignExaminerDialogProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'assign' | 'create'>('assign');

  // Queries & Mutations
  const { data: examiners = [], isLoading: loadingExaminers } = useExaminers();
  const { data: examinations = [] } = useExaminations();
  const { data: courses = [] } = useCourses();
  const assignMutation = useAssignExaminerMutation();
  const createAdminUser = useCreateAdminUser();

  // Assign Form
  const [selectedExaminerId, setSelectedExaminerId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [assignSuccess, setAssignSuccess] = useState(false);

  // Create Form
  const [newExaminerName, setNewExaminerName] = useState('');
  const [newExaminerEmail, setNewExaminerEmail] = useState('');
  const [newExaminerPhone, setNewExaminerPhone] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{ id: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Only Admin and HOD can manage examiners
  if (user?.role !== 'admin' && user?.role !== 'hod') {
    return null;
  }

  // Filter department courses if specified
  const filteredCourses = departmentName
    ? courses.filter((c: Course) => c.department === departmentName)
    : courses;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExaminerId || !selectedExamId || !selectedCourseId) {
      alert('Please select an examiner, examination, and course');
      return;
    }

    try {
      await assignMutation.mutateAsync({
        examinerId: selectedExaminerId,
        examinationId: selectedExamId,
        courseId: selectedCourseId,
      });
      setAssignSuccess(true);
      setTimeout(() => {
        setAssignSuccess(false);
        setIsOpen(false);
      }, 1500);
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to assign examiner');
    }
  };

  const handleCreateExaminer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createAdminUser.mutateAsync({
        name: newExaminerName,
        email: newExaminerEmail,
        phone: newExaminerPhone,
        role: 'examiner',
      });
      if (res.success && res.credentials) {
        setCreatedCredentials(res.credentials);
      }
    } catch (err: unknown) {
      console.error(err);
      alert('Failed to onboard examiner');
    }
  };

  const handleCopy = () => {
    if (createdCredentials) {
      navigator.clipboard.writeText(`Campus ID: ${createdCredentials.id}\nPassword: ${createdCredentials.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setSelectedExaminerId('');
    setSelectedExamId('');
    setSelectedCourseId('');
    setAssignSuccess(false);
    setNewExaminerName('');
    setNewExaminerEmail('');
    setNewExaminerPhone('');
    setCreatedCredentials(null);
    setMode('assign');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => {
      setIsOpen(open);
      if (!open) setTimeout(resetForm, 200);
    }}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <ShieldCheck className="w-4 h-4 mr-2" />
          {triggerText}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="font-display">Examiner Management</DialogTitle>
              <DialogDescription>
                Assign invigilators to exams or onboard new certified examiners
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-border/60 mt-2">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
              mode === 'assign'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setMode('assign')}
          >
            Assign Duty
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
              mode === 'create'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setMode('create')}
          >
            + Onboard Examiner
          </button>
        </div>

        {mode === 'assign' ? (
          assignSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-display font-semibold text-base text-foreground">Examiner Duty Assigned</h3>
              <p className="text-sm text-muted-foreground">The invigilation assignment has been saved to the database.</p>
            </div>
          ) : (
            <form onSubmit={handleAssign} className="space-y-4 py-3">
              <div>
                <Label htmlFor="examinerSelect">Certified Examiner</Label>
                <select
                  id="examinerSelect"
                  required
                  className="mt-1.5 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={selectedExaminerId}
                  onChange={(e) => setSelectedExaminerId(e.target.value)}
                >
                  <option value="">Select an Examiner...</option>
                  {examiners.map((ex: ExaminerOption) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} ({ex.email})
                    </option>
                  ))}
                </select>
                {examiners.length === 0 && !loadingExaminers && (
                  <p className="text-xs text-amber-600 mt-1">
                    No examiners onboarded yet. Switch to "+ Onboard Examiner" tab to create one.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="examSelect">Examination Schedule</Label>
                <select
                  id="examSelect"
                  required
                  className="mt-1.5 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                >
                  <option value="">Select Examination...</option>
                  {examinations.map((ex: Examination) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} (Sem {ex.semester} • {ex.academicYear})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="courseSelect">Target Course</Label>
                <select
                  id="courseSelect"
                  required
                  className="mt-1.5 h-10 w-full rounded-lg border-2 border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                >
                  <option value="">Select Course...</option>
                  {filteredCourses.map((c: Course) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name} (Sem {c.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={assignMutation.isPending}>
                  {assignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirm Assignment
                </Button>
              </div>
            </form>
          )
        ) : (
          /* Onboard Examiner Form */
          createdCredentials ? (
            <div className="space-y-4 py-4">
              <div className="bg-success/10 text-success border border-success/20 p-4 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Examiner Account Created</p>
                  <p className="text-sm opacity-90">Please record or provide these credentials to the examiner.</p>
                </div>
              </div>

              <div className="space-y-3 bg-muted/50 p-4 rounded-xl border border-border">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Campus ID (Login ID)</Label>
                  <p className="font-mono text-sm font-bold text-primary">{createdCredentials.id}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Default Password</Label>
                  <p className="font-mono text-sm font-medium">{createdCredentials.password}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button type="button" variant="outline" onClick={() => {
                  setCreatedCredentials(null);
                  setMode('assign');
                }}>
                  Back to Assign
                </Button>
                <Button type="button" onClick={handleCopy}>
                  {copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied' : 'Copy Credentials'}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateExaminer} className="space-y-4 py-3">
              <div>
                <Label htmlFor="examinerName">Examiner Full Name</Label>
                <Input
                  id="examinerName"
                  required
                  className="mt-1.5"
                  value={newExaminerName}
                  onChange={(e) => setNewExaminerName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Kumar"
                />
              </div>

              <div>
                <Label htmlFor="examinerEmail">Examiner Email</Label>
                <Input
                  id="examinerEmail"
                  type="email"
                  required
                  className="mt-1.5"
                  value={newExaminerEmail}
                  onChange={(e) => setNewExaminerEmail(e.target.value)}
                  placeholder="rajesh.examiner@campus.edu"
                />
              </div>

              <div>
                <Label htmlFor="examinerPhone">Contact Phone (Optional)</Label>
                <Input
                  id="examinerPhone"
                  className="mt-1.5"
                  value={newExaminerPhone}
                  onChange={(e) => setNewExaminerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAdminUser.isPending}>
                  {createAdminUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Examiner Account
                </Button>
              </div>
            </form>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
