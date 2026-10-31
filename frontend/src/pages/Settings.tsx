import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { 
  User as UserIcon, 
  Shield, 
  Moon, 
  Sun, 
  Phone, 
  Mail, 
  Lock, 
  Check, 
  ArrowLeft, 
  GraduationCap, 
  Briefcase,
  Laptop,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  AlertTriangle,
  RefreshCw,
  KeyRound
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile, listRecoveryRequests, approveRecoveryRequest, rejectRecoveryRequest } from '@/api/apiCall';
import type { PasswordRecoveryRequestRecord } from '@/api/apiInterface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;

  // Active Tab: personal profile or credential approvals
  const isApprover = user?.role === 'admin' || user?.role === 'hod';
  const [activeTab, setActiveTab] = useState<'profile' | 'recovery'>('profile');

  // Theme management synchronized with HTML element & localStorage
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 
        (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    }
    return 'light';
  });

  // Profile editable fields
  const [phone, setPhone] = useState(user?.phone || '');
  const [name, setName] = useState(user?.name || '');
  const [prevUserId, setPrevUserId] = useState(user?.id);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Password Recovery Approvals State (for HODs & Admins)
  const [recoveryRequests, setRecoveryRequests] = useState<PasswordRecoveryRequestRecord[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(isApprover);
  const [requestsError, setRequestsError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Generated In-App Reset Link display (when outbound email is unconfigured)
  const [generatedResetLink, setGeneratedResetLink] = useState<{
    url: string;
    campusId: string;
    name?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (user && user.id !== prevUserId) {
    setPrevUserId(user.id);
    setPhone(user.phone || '');
    setName(user.name || '');
  }

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess(false);

    const trimmedPhone = phone.trim();
    if (trimmedPhone && !/^\+?[\d\s-]{7,20}$/.test(trimmedPhone)) {
      setSaveError('Please enter a valid phone number (7-20 digits).');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSaveError('Full Name cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await updateUserProfile({
        phone: trimmedPhone || null,
        name: trimmedName,
      });

      if (response && response.success) {
        updateUser(response.user);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError('Failed to update profile settings.');
      }
    } catch (err: any) {
      setSaveError(err.message || 'An error occurred while updating profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadRecoveryRequests = useCallback(async () => {
    if (!isApprover) return;
    setIsLoadingRequests(true);
    setRequestsError('');
    try {
      const res = await listRecoveryRequests();
      if (res && res.success) {
        setRecoveryRequests(res.requests || []);
      } else {
        setRequestsError(res?.message || 'Failed to load recovery requests.');
      }
    } catch (err: any) {
      setRequestsError(err.message || 'Error fetching recovery requests.');
    } finally {
      setIsLoadingRequests(false);
    }
  }, [isApprover]);

  useEffect(() => {
    if (!isApprover) return;
    let isCancelled = false;

    listRecoveryRequests()
      .then((res) => {
        if (!isCancelled && res && res.success) {
          setRecoveryRequests(res.requests || []);
        } else if (!isCancelled && res) {
          setRequestsError(res.message || 'Failed to load recovery requests.');
        }
      })
      .catch((err: any) => {
        if (!isCancelled) {
          setRequestsError(err.message || 'Error fetching recovery requests.');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingRequests(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isApprover]);

  const handleApprove = async (id: string, reqCampusId: string, reqName?: string) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await approveRecoveryRequest(id, approvalNotes.trim() || undefined);
      if (res && res.success) {
        setActionMessage({ type: 'success', text: res.message || 'Request approved successfully.' });
        setApprovingId(null);
        setApprovalNotes('');
        if (res.resetLink) {
          setGeneratedResetLink({
            url: res.resetLink,
            campusId: reqCampusId,
            name: reqName
          });
        }
        await loadRecoveryRequests();
      } else {
        setActionMessage({ type: 'error', text: res?.message || 'Failed to approve recovery request.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Error approving recovery request.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await rejectRecoveryRequest(id, rejectionReason.trim() || undefined);
      if (res && res.success) {
        setActionMessage({ type: 'success', text: res.message || 'Request rejected.' });
        setRejectingId(null);
        setRejectionReason('');
        await loadRecoveryRequests();
      } else {
        setActionMessage({ type: 'error', text: res?.message || 'Failed to reject recovery request.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Error rejecting recovery request.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedResetLink) {
      navigator.clipboard.writeText(generatedResetLink.url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const pendingCount = recoveryRequests.filter(r => r.status === 'pending_approval').length;
  const filteredRequests = recoveryRequests.filter(r => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  return (
    <div className="container max-w-5xl py-8 px-4 md:px-6 mx-auto space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full shrink-0"
            aria-label="Navigate back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your personal profile, institutional identity, and system preferences
            </p>
          </div>
        </div>
      </div>

      {/* Approver Role Tab Navigation */}
      {isApprover && (
        <div className="flex border-b border-border gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            Personal Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recovery')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'recovery'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Password Recovery Approvals
            {pendingCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-amber-950">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Generated In-App Reset Link Banner (when email is unconfigured) */}
      {generatedResetLink && (
        <Card className="border-2 border-primary bg-primary/5 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-base">
                <CheckCircle2 className="w-5 h-5" />
                <span>Reset Authorization Link Generated</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGeneratedResetLink(null)}
                className="text-xs h-7"
              >
                Dismiss
              </Button>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Direct outbound email is not configured on this server. Please deliver this secure, single-use reset link directly to the verified requester: <strong className="text-foreground">{generatedResetLink.name} ({generatedResetLink.campusId})</strong>. This link is valid for 15 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background border font-mono text-xs overflow-x-auto">
              <span className="truncate flex-1 select-all">{generatedResetLink.url}</span>
              <Button
                size="sm"
                variant={copiedLink ? "default" : "secondary"}
                onClick={handleCopyLink}
                className="shrink-0 text-xs h-8"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy Link
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 1: Personal Profile, Appearance & Security */}
      {activeTab === 'profile' && (
        <Wrapper
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-6 md:grid-cols-3"
        >
          {/* Left Column: Profile Card */}
          <motion.div variants={item} className="md:col-span-1 space-y-6">
            <Card className="border-2 shadow-sm overflow-hidden">
              <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-background border-b" />
              <CardContent className="pt-0 relative px-6 pb-6 text-center space-y-4">
                <div className="relative -mt-12 inline-block">
                  <img
                    src={user?.avatarUrl || `https://api.dicebear.com/9.x/toon-head/svg?seed=${encodeURIComponent(user?.name || 'User')}`}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover border-4 border-background shadow-md bg-muted"
                  />
                </div>

                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">{user?.name}</h2>
                  <div className="inline-flex items-center gap-1.5 mt-1">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {user?.campusId}
                    </span>
                    <span className="text-xs uppercase font-semibold tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-muted">
                      {user?.role}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t text-left text-xs space-y-2.5 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{user?.email}</span>
                  </div>
                  {user?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  {user?.studentProfile && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Roll No: {user.studentProfile.rollNumber}</span>
                    </div>
                  )}
                  {user?.facultyProfile && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Code: {user.facultyProfile.employeeCode}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Institutional Governance Notice */}
            <Card className="border-2 border-primary/20 bg-primary/5 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-primary">
                  <Shield className="w-4 h-4" />
                  <CardTitle className="text-sm font-semibold">Institutional Governance</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                <p>
                  Your account is provisioned and governed by CampusOne central administration. Core identifiers and role assignments cannot be modified by users.
                </p>
                <p className="font-medium text-foreground">
                  Canonical ID: <code className="font-mono text-primary font-bold">{user?.campusId}</code>
                </p>
              </CardContent>
            </Card>

            {/* Approver Quick Action Banner */}
            {isApprover && pendingCount > 0 && (
              <Card className="border-2 border-amber-500/30 bg-amber-500/10 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{pendingCount} Pending Recovery Request{pendingCount > 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Student or faculty password recovery requests require your superior authorization.
                  </p>
                  <Button
                    size="sm"
                    className="w-full text-xs font-semibold"
                    onClick={() => setActiveTab('recovery')}
                  >
                    Review Recovery Requests
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Right Columns: Settings Forms */}
          <div className="md:col-span-2 space-y-6">
            {/* Section 1: Profile Information */}
            <motion.div variants={item}>
              <Card className="border-2 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">Profile Information</CardTitle>
                      <CardDescription>Update your personal contact details</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="campusId" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Campus ID (Canonical)
                        </Label>
                        <div className="relative">
                          <Input
                            id="campusId"
                            value={user?.campusId || ''}
                            disabled
                            className="bg-muted font-mono font-bold text-foreground cursor-not-allowed pr-8"
                          />
                          <Lock className="w-4 h-4 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                        <p className="text-[11px] text-muted-foreground">Managed by system administration</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Official Email
                        </Label>
                        <div className="relative">
                          <Input
                            id="email"
                            value={user?.email || ''}
                            disabled
                            className="bg-muted text-foreground cursor-not-allowed pr-8"
                          />
                          <Lock className="w-4 h-4 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                        <p className="text-[11px] text-muted-foreground">Institutional communication record</p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider">
                          Full Name
                        </Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider">
                          Contact Phone
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                    </div>

                    {saveError && (
                      <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
                        {saveError}
                      </div>
                    )}

                    {saveSuccess && (
                      <div className="p-3 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium flex items-center gap-2">
                        <Check className="w-4 h-4 shrink-0" />
                        Profile details saved successfully.
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={isSaving} className="font-semibold">
                        {isSaving ? 'Saving Changes...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Section 2: Appearance & Theme */}
            <motion.div variants={item}>
              <Card className="border-2 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Laptop className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">Appearance & Theme</CardTitle>
                      <CardDescription>Customize interface visual presentation</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Light Mode Tile */}
                    <button
                      type="button"
                      onClick={() => handleThemeChange('light')}
                      className={`flex flex-col items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                        theme === 'light'
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-muted-foreground/30 bg-card'
                      }`}
                    >
                      <div className="w-full flex items-center justify-between mb-3">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                          <Sun className="w-5 h-5" />
                        </div>
                        {theme === 'light' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                        )}
                      </div>
                      <div className="w-full">
                        <p className="font-semibold text-sm">Light Mode</p>
                        <p className="text-xs text-muted-foreground mt-0.5">High contrast daylight theme</p>
                      </div>
                    </button>

                    {/* Dark Mode Tile */}
                    <button
                      type="button"
                      onClick={() => handleThemeChange('dark')}
                      className={`flex flex-col items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                        theme === 'dark'
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-muted-foreground/30 bg-card'
                      }`}
                    >
                      <div className="w-full flex items-center justify-between mb-3">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                          <Moon className="w-5 h-5" />
                        </div>
                        {theme === 'dark' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                        )}
                      </div>
                      <div className="w-full">
                        <p className="font-semibold text-sm">Dark Mode</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Sleek, low-light night theme</p>
                      </div>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Section 3: Credential & Security Policy */}
            <motion.div variants={item}>
              <Card className="border-2 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">Security & Sessions</CardTitle>
                      <CardDescription>Authentication and credential security policy</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl border bg-muted/30 text-xs space-y-2 text-muted-foreground">
                    <div className="flex items-center justify-between text-foreground font-semibold">
                      <span>Active Session Status</span>
                      <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Authenticated & Protected
                      </span>
                    </div>
                    <p>
                      Sessions are tracked with cryptographically signed tokens. In the event of password resets or credential modifications, active sessions across all devices are atomically invalidated to preserve account integrity.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
                    <span>Need to recover or reset your password?</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/forgot-password')}
                    >
                      Request Password Recovery
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </Wrapper>
      )}

      {/* TAB 2: Credential Recovery Approvals (HODs & Admins Only) */}
      {isApprover && activeTab === 'recovery' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
            <div>
              <h2 className="font-display text-xl font-bold">Credential Recovery Requests</h2>
              <p className="text-xs text-muted-foreground">
                Authorize or reject password recovery requests within your institutional jurisdiction
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadRecoveryRequests}
                disabled={isLoadingRequests}
                className="text-xs h-8"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingRequests ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Action Message Banner */}
          {actionMessage && (
            <div className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between ${
              actionMessage.type === 'success'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                : 'bg-destructive/10 text-destructive border border-destructive/20'
            }`}>
              <span>{actionMessage.text}</span>
              <button
                type="button"
                onClick={() => setActionMessage(null)}
                className="text-muted-foreground hover:text-foreground text-xs ml-2"
              >
                ×
              </button>
            </div>
          )}

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {['all', 'pending_approval', 'approved', 'reset_link_sent', 'rejected', 'expired'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-full font-semibold capitalize whitespace-nowrap transition-all ${
                  filterStatus === status
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {requestsError && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between">
              <span>{requestsError}</span>
              <Button size="sm" variant="outline" onClick={loadRecoveryRequests}>
                Retry
              </Button>
            </div>
          )}

          {isLoadingRequests ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2" />
              <p>Loading recovery requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card className="border-2 border-dashed p-10 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
              <h3 className="font-semibold text-base">No Requests Found</h3>
              <p className="text-xs text-muted-foreground">
                There are currently no recovery requests matching the &ldquo;{filterStatus.replace(/_/g, ' ')}&rdquo; filter.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => {
                const isPending = req.status === 'pending_approval';
                const isSelf = req.targetUserId === user?.id;

                return (
                  <Card key={req.id} className="border-2 shadow-sm overflow-hidden">
                    <CardContent className="p-5 space-y-4">
                      {/* Top Row: User identity & Status Badge */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-base">
                              {req.targetUser?.name || 'Academic User'}
                            </span>
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {req.campusId}
                            </span>
                            <span className="text-xs uppercase font-semibold text-muted-foreground px-2 py-0.5 rounded bg-muted">
                              {req.targetUser?.role || 'user'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{req.email}</p>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {req.status === 'pending_approval' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <Clock className="w-3.5 h-3.5" /> Pending Approval
                            </span>
                          )}
                          {(req.status === 'approved' || req.status === 'reset_link_sent') && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {req.status === 'reset_link_sent' ? 'Reset Link Dispatched' : 'Approved'}
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/30">
                              <XCircle className="w-3.5 h-3.5" /> Rejected
                            </span>
                          )}
                          {req.status === 'expired' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                              Expired
                            </span>
                          )}
                          {req.status === 'completed' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/30">
                              Password Reset Completed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Request Details */}
                      <div className="grid gap-3 sm:grid-cols-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Reason / Requester Note:</span>
                          <p className="font-medium text-foreground mt-0.5">
                            {req.reason || 'None provided'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Requested At:</span>
                          <p className="font-medium text-foreground mt-0.5">
                            {new Date(req.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Review details if reviewed */}
                      {req.reviewedAt && (
                        <div className="p-2.5 rounded-lg bg-muted/40 text-xs space-y-1 border">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Reviewed by: <strong>{req.approverUser?.name || 'Designated Superior'}</strong></span>
                            <span>{new Date(req.reviewedAt).toLocaleString()}</span>
                          </div>
                          {req.reviewNotes && (
                            <p className="text-foreground italic mt-0.5">&ldquo;{req.reviewNotes}&rdquo;</p>
                          )}
                        </div>
                      )}

                      {/* Approver Action Panel (for Pending Approval) */}
                      {isPending && (
                        <div className="pt-2 border-t space-y-3">
                          {isSelf ? (
                            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <span>Self-approval is strictly forbidden. Another administrator or institutional superior must review your request.</span>
                            </div>
                          ) : approvingId === req.id ? (
                            <div className="p-3 rounded-lg border bg-background space-y-3">
                              <Label className="text-xs font-semibold">
                                Approval Note (Optional)
                              </Label>
                              <Input
                                placeholder="e.g. Identity verified by department records"
                                value={approvalNotes}
                                onChange={(e) => setApprovalNotes(e.target.value)}
                                className="h-9 text-xs"
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setApprovingId(null);
                                    setApprovalNotes('');
                                  }}
                                  disabled={actionLoading}
                                  className="h-8 text-xs"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(req.id, req.campusId, req.targetUser?.name)}
                                  disabled={actionLoading}
                                  className="h-8 text-xs font-bold"
                                >
                                  {actionLoading ? 'Authorizing...' : 'Confirm Approval & Issue Reset Link'}
                                </Button>
                              </div>
                            </div>
                          ) : rejectingId === req.id ? (
                            <div className="p-3 rounded-lg border bg-background space-y-3">
                              <Label className="text-xs font-semibold text-destructive">
                                Rejection Reason <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                placeholder="e.g. Unverified requester, invalid identity"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="h-9 text-xs"
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setRejectingId(null);
                                    setRejectionReason('');
                                  }}
                                  disabled={actionLoading}
                                  className="h-8 text-xs"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(req.id)}
                                  disabled={actionLoading || !rejectionReason.trim()}
                                  className="h-8 text-xs font-bold"
                                >
                                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRejectingId(req.id);
                                  setApprovingId(null);
                                }}
                                className="text-xs h-8 text-destructive hover:bg-destructive/10"
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setApprovingId(req.id);
                                  setRejectingId(null);
                                }}
                                className="text-xs h-8 font-semibold"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Authorize & Issue Reset Link
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
