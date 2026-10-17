import React, { useState } from 'react';
import { useStudentMutations, useDepartments } from '@/features/admin/hooks';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Copy, CheckCircle2, Loader2 } from 'lucide-react';

interface AddStudentDialogProps {
  defaultDepartment?: string;
  defaultDepartmentId?: string;
  className?: string;
  triggerText?: string;
}

export function AddStudentDialog({
  defaultDepartment = '',
  defaultDepartmentId = '',
  className,
  triggerText = 'Add Student',
}: AddStudentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const studentMutations = useStudentMutations();
  const { data: departments } = useDepartments();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: defaultDepartmentId || defaultDepartment || '',
    degree: 'B.Tech',
    semester: 1,
    batch: `${new Date().getFullYear()}-${new Date().getFullYear() + 4}`,
    section: 'A',
    feeQuota: 'general' as 'general' | 'merit' | 'management' | 'nri',
  });

  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    campusId?: string;
    rollNumber: string;
    email: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setCreatedCredentials(null);
      setCopied(false);
      setForm({
        name: '',
        email: '',
        phone: '',
        department: defaultDepartmentId || defaultDepartment || '',
        degree: 'B.Tech',
        semester: 1,
        batch: `${new Date().getFullYear()}-${new Date().getFullYear() + 4}`,
        section: 'A',
        feeQuota: 'general',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetDept = form.department || defaultDepartmentId || defaultDepartment || departments?.[0]?.id || '';
      const payload = {
        ...form,
        department: targetDept,
      };

      const result = await studentMutations.create.mutateAsync(payload);
      setCreatedCredentials({
        name: result.name ?? form.name,
        campusId: (result as any).campusId,
        rollNumber: result.rollNumber,
        email: result.email ?? form.email,
        password: 'student123',
      });
    } catch (err) {
      console.error('Failed to create student:', err);
      alert('Failed to create student. Please verify the input values.');
    }
  };

  const handleCopy = () => {
    if (createdCredentials) {
      const loginId = createdCredentials.campusId || createdCredentials.rollNumber;
      const text = `Student: ${createdCredentials.name}\nCampusOne ID (Login ID): ${loginId}\nRoll Number: ${createdCredentials.rollNumber}\nContact Email: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.password}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className={className || "gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"}>
          <UserPlus className="w-4 h-4" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Onboard New Student</DialogTitle>
          <DialogDescription>
            Register a student into the academic roster. A student account with credentials will be provisioned automatically.
          </DialogDescription>
        </DialogHeader>

        {createdCredentials ? (
          <div className="space-y-4 py-3">
            <div className="p-4 rounded-xl border border-success/30 bg-success/10 space-y-2">
              <div className="flex items-center gap-2 text-success font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                <span>Student Enrolled Successfully</span>
              </div>
              <div className="text-sm space-y-1 font-mono pt-2 text-foreground">
                <p><span className="text-muted-foreground font-sans">Name:</span> {createdCredentials.name}</p>
                <p><span className="text-muted-foreground font-sans">CampusOne ID (Login ID):</span> <strong className="text-primary">{createdCredentials.campusId || createdCredentials.rollNumber}</strong></p>
                <p><span className="text-muted-foreground font-sans">Roll Number:</span> {createdCredentials.rollNumber}</p>
                <p><span className="text-muted-foreground font-sans">Contact Email:</span> {createdCredentials.email}</p>
                <p><span className="text-muted-foreground font-sans">Default Password:</span> {createdCredentials.password}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={handleCopy} variant="outline" className="gap-2">
                <Copy className="w-4 h-4" />
                {copied ? 'Copied to Clipboard!' : 'Copy Credentials'}
              </Button>
              <Button onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <Label htmlFor="stu-name">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  id="stu-name"
                  required
                  placeholder="e.g. Alice Johnson"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="stu-email">Institutional Email <span className="text-destructive">*</span></Label>
                <Input
                  id="stu-email"
                  type="email"
                  required
                  placeholder="e.g. alice@campus.edu"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="stu-phone">Phone Number</Label>
                <Input
                  id="stu-phone"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="stu-dept">Department <span className="text-destructive">*</span></Label>
                {defaultDepartment ? (
                  <Input
                    id="stu-dept"
                    disabled
                    value={defaultDepartment}
                    className="bg-muted cursor-not-allowed"
                  />
                ) : (
                  <select
                    id="stu-dept"
                    required
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  >
                    <option value="">Select Department</option>
                    {departments?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="stu-degree">Degree Program <span className="text-destructive">*</span></Label>
                <Input
                  id="stu-degree"
                  required
                  placeholder="B.Tech"
                  value={form.degree}
                  onChange={(e) => setForm({ ...form, degree: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="stu-semester">Semester <span className="text-destructive">*</span></Label>
                <Input
                  id="stu-semester"
                  required
                  type="number"
                  min="1"
                  max="10"
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="stu-batch">Academic Batch <span className="text-destructive">*</span></Label>
                <Input
                  id="stu-batch"
                  required
                  placeholder="2024-2028"
                  value={form.batch}
                  onChange={(e) => setForm({ ...form, batch: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="stu-quota">Admission Quota <span className="text-destructive">*</span></Label>
                <select
                  id="stu-quota"
                  required
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.feeQuota}
                  onChange={(e) => setForm({ ...form, feeQuota: e.target.value as 'general' | 'merit' | 'management' | 'nri' })}
                >
                  <option value="general">General</option>
                  <option value="merit">Merit</option>
                  <option value="management">Management</option>
                  <option value="nri">NRI</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={studentMutations.create.isPending} className="bg-primary">
                {studentMutations.create.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  'Enroll Student'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
