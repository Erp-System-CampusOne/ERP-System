import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateAdminUser } from '@/features/admin/hooks';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Copy, CheckCircle2 } from 'lucide-react';

interface AddStaffDialogProps {
  role: string;
  roleLabel: string;
  className?: string;
  defaultDepartmentId?: string;
}

export function AddStaffDialog({ role, roleLabel, className, defaultDepartmentId }: AddStaffDialogProps) {
  const { user } = useAuth();
  const createAdminUser = useCreateAdminUser();
  const [isOpen, setIsOpen] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [createdCredentials, setCreatedCredentials] = useState<{id: string, password: string} | null>(null);
  const [copied, setCopied] = useState(false);

  // Render for admin or hod
  if (user?.role !== 'admin' && user?.role !== 'hod') {
    return null;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createAdminUser.mutateAsync({
        name,
        email,
        phone,
        role,
        ...(defaultDepartmentId ? { departmentId: defaultDepartmentId } : {})
      });
      if (res.success && res.credentials) {
        setCreatedCredentials(res.credentials);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to create user');
    }
  };

  const handleCopy = () => {
    if (createdCredentials) {
      navigator.clipboard.writeText(`CampusOne ID: ${createdCredentials.id}\nPassword: ${createdCredentials.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setCreatedCredentials(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => {
      setIsOpen(open);
      if (!open) setTimeout(resetForm, 200);
    }}>
      <DialogTrigger asChild>
        <Button className={className}>
          <Plus className="w-4 h-4 mr-2" />
          Add {roleLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New {roleLabel}</DialogTitle>
          <DialogDescription>
            {createdCredentials 
              ? "Account created successfully. Please copy these credentials." 
              : `Create a new ${roleLabel} account. A temporary password will be generated.`}
          </DialogDescription>
        </DialogHeader>

        {createdCredentials ? (
          <div className="space-y-4 py-4">
            <div className="bg-success/10 text-success border border-success/20 p-4 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-sm">Success</p>
                <p className="text-sm opacity-90">Account created. Give these credentials to the user.</p>
              </div>
            </div>
            
            <div className="space-y-3 bg-muted/50 p-4 rounded-xl border border-border">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CampusOne ID (Login ID)</Label>
                <p className="font-mono text-sm font-semibold text-primary">{createdCredentials.id}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                <p className="font-mono text-sm font-medium">{createdCredentials.password}</p>
              </div>
            </div>
            
            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              <Button type="button" onClick={handleCopy}>
                {copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied' : 'Copy Credentials'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createAdminUser.isPending}>
                {createAdminUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Account
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
