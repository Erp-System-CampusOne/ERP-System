import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartments, useCreateAdminUser } from '@/features/admin/hooks';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Copy, CheckCircle2, Award } from 'lucide-react';

interface AddHodDialogProps {
  defaultDepartmentId?: string;
  defaultDepartmentName?: string;
  triggerText?: string;
  triggerIcon?: React.ElementType;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  onSuccess?: () => void;
}

export function AddHodDialog({
  defaultDepartmentId,
  defaultDepartmentName,
  triggerText = 'Onboard HOD',
  triggerIcon: TriggerIcon = Plus,
  className,
  variant = 'default',
  onSuccess,
}: AddHodDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: departments = [] } = useDepartments();
  const createAdminUser = useCreateAdminUser();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState(defaultDepartmentId || '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [qualification, setQualification] = useState('Ph.D.');
  const [createdCredentials, setCreatedCredentials] = useState<{ id: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (defaultDepartmentId) {
      setSelectedDeptId(defaultDepartmentId);
    } else if (departments.length > 0 && !selectedDeptId) {
      setSelectedDeptId(departments[0].id);
    }
  }, [defaultDepartmentId, departments, selectedDeptId]);

  // Suggest employee code based on department
  useEffect(() => {
    if (selectedDeptId && !employeeCode) {
      const dept = departments.find((d: any) => d.id === selectedDeptId);
      const code = dept?.code || 'HOD';
      setEmployeeCode(`HOD-${code}-${Math.floor(100 + Math.random() * 900)}`);
    }
  }, [selectedDeptId, departments, employeeCode]);

  if (user?.role !== 'admin') {
    return null;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedDeptId) {
      setErrorMessage('Please select a department for the HOD.');
      return;
    }

    try {
      const res = await createAdminUser.mutateAsync({
        name,
        email,
        phone,
        role: 'hod',
        departmentId: selectedDeptId,
        employeeCode: employeeCode.trim(),
        qualification: qualification.trim(),
        designation: 'Head of Department',
      });

      if (res.success && res.credentials) {
        setCreatedCredentials(res.credentials);
        queryClient.invalidateQueries({ queryKey: ['admin', 'hods'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.message || 'Failed to onboard HOD');
      }
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to onboard HOD';
      setErrorMessage(msg);
    }
  };

  const handleCopy = () => {
    if (createdCredentials) {
      navigator.clipboard.writeText(`ID: ${createdCredentials.id}\nPassword: ${createdCredentials.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setEmployeeCode('');
    setQualification('Ph.D.');
    setCreatedCredentials(null);
    setErrorMessage(null);
    if (defaultDepartmentId) {
      setSelectedDeptId(defaultDepartmentId);
    }
  };

  const selectedDepartment = departments.find((d: any) => d.id === selectedDeptId);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open: boolean) => {
        setIsOpen(open);
        if (!open) setTimeout(resetForm, 200);
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <TriggerIcon className="w-4 h-4 mr-2" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Onboard Head of Department
          </DialogTitle>
          <DialogDescription>
            {createdCredentials
              ? 'HOD account created successfully. Provide these credentials to the user.'
              : 'Directly onboard a dedicated HOD for the selected academic department.'}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}

        {createdCredentials ? (
          <div className="space-y-4 py-3">
            <div className="bg-success/10 text-success border border-success/20 p-4 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-sm">HOD Appointed & Provisioned</p>
                <p className="text-xs opacity-90">
                  {name} is now the official Head of Department for {selectedDepartment?.name || 'Department'}.
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-muted/50 p-4 rounded-xl border border-border">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Department</Label>
                <p className="text-sm font-semibold">{selectedDepartment?.name} ({selectedDepartment?.code})</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Login Identifier / Email</Label>
                <p className="font-mono text-sm font-semibold">{email}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Employee ID</Label>
                <p className="font-mono text-sm font-semibold">{createdCredentials.id}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                <p className="font-mono text-sm font-semibold text-primary">{createdCredentials.password}</p>
              </div>
            </div>

            <DialogFooter className="sm:justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Done
              </Button>
              <Button type="button" onClick={handleCopy}>
                {copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied' : 'Copy Credentials'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="hod-dept">Department</Label>
              {defaultDepartmentId ? (
                <div className="p-2.5 rounded-md border border-input bg-muted/40 text-sm font-medium">
                  {defaultDepartmentName || selectedDepartment?.name || 'Selected Department'}
                </div>
              ) : (
                <select
                  id="hod-dept"
                  required
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedDeptId}
                  onChange={(e) => {
                    setSelectedDeptId(e.target.value);
                    setEmployeeCode('');
                  }}
                >
                  <option value="">Select a Department...</option>
                  {departments.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code}) {dept.headOfDepartment ? `— [Current HOD: ${dept.headOfDepartment.split('(')[0].trim()}]` : '— [Vacant]'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="hod-name">Full Name</Label>
                <Input
                  id="hod-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Arthur Vance"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hod-code">Employee Code</Label>
                <Input
                  id="hod-code"
                  required
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  placeholder="e.g. HOD-CS-01"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="hod-email">Email Address</Label>
                <Input
                  id="hod-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="arthur.vance@campus.edu"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hod-phone">Phone Number</Label>
                <Input
                  id="hod-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hod-qualification">Highest Qualification</Label>
              <Input
                id="hod-qualification"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="e.g. Ph.D. in Computer Science & Engineering"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAdminUser.isPending}>
                {createAdminUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm & Onboard HOD
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
