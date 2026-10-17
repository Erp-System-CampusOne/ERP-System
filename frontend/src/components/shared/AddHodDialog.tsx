import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartments, useCreateAdminUser, useFacultyList, usePromoteFacultyToHod } from '@/features/admin/hooks';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Copy, CheckCircle2, Award, UserCheck, Sparkles, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddHodDialogProps {
  triggerText?: string;
  triggerIcon?: React.ElementType;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  onSuccess?: () => void;
}

export function AddHodDialog({
  triggerText = '+ Appoint Institution HOD',
  triggerIcon: TriggerIcon = Plus,
  className,
  variant = 'default',
  onSuccess,
}: AddHodDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: departments = [] } = useDepartments();
  const { data: facultyList = [] } = useFacultyList();
  const createAdminUser = useCreateAdminUser();
  const promoteFacultyMutation = usePromoteFacultyToHod();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'onboard' | 'promote'>('onboard');

  // Form states for Mode 1: Onboard New
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeCode, setEmployeeCode] = useState(() => `HOD-INST-${Math.floor(100 + Math.random() * 900)}`);
  const [qualification, setQualification] = useState('Ph.D.');
  const [createdCredentials, setCreatedCredentials] = useState<{ id: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states for Mode 2: Promote Existing Faculty
  const [selectedFacultyId, setSelectedFacultyId] = useState('');

  if (user?.role !== 'admin') {
    return null;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      const res = await createAdminUser.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: 'hod',
        departmentId: departments[0]?.id,
        employeeCode: employeeCode.trim(),
        qualification: qualification.trim(),
        designation: 'Institution Head of Department',
      });

      if (res.success && res.credentials) {
        setCreatedCredentials(res.credentials);
        queryClient.invalidateQueries({ queryKey: ['admin', 'hods'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.message || 'Failed to onboard Institution HOD');
      }
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to onboard Institution HOD';
      setErrorMessage(msg);
    }
  };

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedFacultyId) {
      setErrorMessage('Please select a faculty member to promote.');
      return;
    }

    try {
      const res = await promoteFacultyMutation.mutateAsync(selectedFacultyId);
      if (res.success) {
        setSuccessMessage(res.message || 'Faculty member successfully promoted to Institution HOD.');
        queryClient.invalidateQueries({ queryKey: ['admin', 'hods'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'faculty'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.message || 'Failed to promote faculty member.');
      }
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to promote faculty member';
      setErrorMessage(msg);
    }
  };

  const handleCopy = () => {
    if (createdCredentials) {
      navigator.clipboard.writeText(`CampusOne ID: ${createdCredentials.id}\nPassword: ${createdCredentials.password}\nEmail: ${email}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setEmployeeCode(`HOD-INST-${Math.floor(100 + Math.random() * 900)}`);
    setQualification('Ph.D.');
    setCreatedCredentials(null);
    setSelectedFacultyId('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setActiveTab('onboard');
  };

  const selectedFacultyObj: any = facultyList.find((f: any) => f.id === selectedFacultyId);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open: boolean) => {
        setIsOpen(open);
        if (open && !employeeCode) {
          setEmployeeCode(`HOD-INST-${Math.floor(100 + Math.random() * 900)}`);
        }
        if (!open) setTimeout(resetForm, 200);
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <TriggerIcon className="w-4 h-4 mr-2" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
            Appoint Institution Head of Department
          </DialogTitle>
          <DialogDescription>
            The Institution HOD serves as the single chief academic officer across all academic divisions (CSE, ECE, MECH).
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}

        {successMessage ? (
          <div className="space-y-4 py-3">
            <div className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-sm">Appointment Successful</p>
                <p className="text-xs opacity-90">{successMessage}</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setIsOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : createdCredentials ? (
          <div className="space-y-4 py-3">
            <div className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-sm">Institution HOD Appointed & Provisioned</p>
                <p className="text-xs opacity-90">
                  {name} is now the single Institution Head of Department with academic authority across all divisions.
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-muted/50 p-4 rounded-xl border border-border">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Appointed Position</Label>
                <p className="text-sm font-semibold">Institution Head of Department (All Divisions)</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CampusOne ID (Login ID)</Label>
                <p className="font-mono text-sm font-bold text-primary">{createdCredentials.id}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Contact Email</Label>
                <p className="font-mono text-sm font-medium">{email}</p>
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
          <div className="w-full space-y-4">
            {/* Custom Tab Switcher */}
            <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setActiveTab('onboard')}
                className={cn(
                  "py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
                  activeTab === 'onboard'
                    ? "bg-background text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Plus className="w-3.5 h-3.5" />
                Onboard New HOD
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('promote')}
                className={cn(
                  "py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
                  activeTab === 'promote'
                    ? "bg-background text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Promote Existing Faculty
              </button>
            </div>

            {activeTab === 'onboard' && (
              <form onSubmit={handleCreate} className="space-y-3.5 py-1">
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    The appointed HOD will govern curricula, timetables, and document approvals across all {departments.length} departments.
                  </span>
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
                      placeholder="e.g. HOD-INST-001"
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
                  <Button type="submit" disabled={createAdminUser.isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
                    {createAdminUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Confirm & Onboard HOD
                  </Button>
                </DialogFooter>
              </form>
            )}

            {activeTab === 'promote' && (
              <form onSubmit={handlePromote} className="space-y-4 py-1">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Select an esteemed faculty member from any department and elevate them to Institution Head of Department.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="faculty-select">Select Faculty Member</Label>
                  <select
                    id="faculty-select"
                    required
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedFacultyId}
                    onChange={(e) => setSelectedFacultyId(e.target.value)}
                  >
                    <option value="">Choose a Faculty Member...</option>
                    {facultyList.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.user?.name || f.name} — {f.department?.name || f.department || 'Faculty'} ({f.employeeCode || f.designation})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedFacultyObj && (
                  <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1">
                    <p className="font-semibold text-foreground text-sm">{selectedFacultyObj.user?.name || selectedFacultyObj.name}</p>
                    <p className="text-muted-foreground">Current Department: {selectedFacultyObj.department?.name || selectedFacultyObj.department || 'N/A'}</p>
                    <p className="text-muted-foreground">Designation: {selectedFacultyObj.designation || 'Professor'}</p>
                    <p className="text-muted-foreground">Qualification: {selectedFacultyObj.qualification || 'Ph.D.'}</p>
                  </div>
                )}

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={promoteFacultyMutation.isPending || !selectedFacultyId} className="bg-purple-600 hover:bg-purple-700 text-white">
                    {promoteFacultyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Promote to Institution HOD
                  </Button>
                </DialogFooter>
              </form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
