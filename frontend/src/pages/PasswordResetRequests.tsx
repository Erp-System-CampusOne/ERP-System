import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import {
  KeyRound,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Mail,
  User as UserIcon,
  Building2,
  Calendar,
  Lock,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { listRecoveryRequests, approveRecoveryRequest, rejectRecoveryRequest } from '@/api/apiCall';
import type { PasswordRecoveryRequestRecord } from '@/api/apiInterface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function formatDateSafe(dateVal: any, pattern: string, fallback = '—'): string {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return format(d, pattern);
  } catch {
    return fallback;
  }
}

export default function PasswordResetRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userRole = (user?.role || '').toLowerCase();
  const userRoles = (user?.roles || []).map((r: string) => r.toLowerCase());
  const isAuthorized =
    ['admin', 'hod', 'management', 'director', 'principal', 'super_admin'].includes(userRole) ||
    userRoles.some((r: string) => ['admin', 'hod', 'management', 'director', 'principal', 'super_admin'].includes(r));

  // Filters & Search
  const [filterStatus, setFilterStatus] = useState<string>('pending_approval');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Confirmation Modals
  const [selectedRequestForApprove, setSelectedRequestForApprove] = useState<PasswordRecoveryRequestRecord | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  const [selectedRequestForReject, setSelectedRequestForReject] = useState<PasswordRecoveryRequestRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fallback generated reset link for test environments with unconfigured SMTP
  const [generatedResetLink, setGeneratedResetLink] = useState<{
    url: string;
    campusId: string;
    name?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch recovery requests
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['password-reset-requests', filterStatus, debouncedSearch],
    queryFn: async () => {
      return await listRecoveryRequests({
        status: filterStatus,
        search: debouncedSearch
      });
    },
    enabled: isAuthorized,
    staleTime: 10000,
    refetchInterval: 15000
  });

  const requests: PasswordRecoveryRequestRecord[] = data?.requests || [];

  // Count summaries
  const pendingCount = requests.filter(r => r.status === 'pending_approval').length;
  const approvedCount = requests.filter(r => r.status === 'approved' || r.status === 'reset_link_sent' || r.status === 'completed').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;
  const totalCount = requests.length;

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      return await approveRecoveryRequest(id, notes);
    },
    onSuccess: (res, variables) => {
      // Invalidate queries to refresh counts and list
      queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
      queryClient.invalidateQueries({ queryKey: ['layout', 'pending-recovery-count'] });
      queryClient.invalidateQueries({ queryKey: ['layout', 'pending-recovery-requests'] });
      queryClient.invalidateQueries({ queryKey: ['layout', 'pending-recovery-requests'] });

      // Handle unconfigured SMTP link fallback for development / test verification
      if (res.resetLink && selectedRequestForApprove) {
        setGeneratedResetLink({
          url: res.resetLink,
          campusId: selectedRequestForApprove.campusId,
          name: selectedRequestForApprove.targetUser?.name
        });
      }

      setSelectedRequestForApprove(null);
      setApprovalNotes('');
    }
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      return await rejectRecoveryRequest(id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
      queryClient.invalidateQueries({ queryKey: ['layout', 'pending-recovery-count'] });
      queryClient.invalidateQueries({ queryKey: ['layout', 'pending-recovery-requests'] });
      setSelectedRequestForReject(null);
      setRejectionReason('');
    }
  });

  const handleCopyLink = () => {
    if (!generatedResetLink?.url) return;
    navigator.clipboard.writeText(generatedResetLink.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  if (!isAuthorized) {
    return (
      <div className="container max-w-4xl py-12 px-4">
        <Card className="border-destructive/30 bg-destructive/5 text-center p-8">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-destructive mb-2">Access Restricted</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            You are not authorized to view or review password recovery requests. This portal is restricted to Department Heads, Management, and System Administrators.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8 px-4 sm:px-6 space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <KeyRound className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Password Reset Requests
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Review, approve, or reject institutional password recovery requests according to organizational hierarchy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs h-9"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Generated In-App Reset Link Callout (When Outbound SMTP is Unconfigured in Dev) */}
      {generatedResetLink && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Single-Use Reset Link Generated (SMTP Not Configured)
              </h4>
              <p className="text-xs text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                Outbound SMTP is not configured in this environment. As an administrator, you may securely copy this time-limited (15-min) link and provide it to{' '}
                <span className="font-semibold">{generatedResetLink.name || generatedResetLink.campusId}</span>:
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  readOnly
                  value={generatedResetLink.url}
                  className="font-mono text-xs bg-background/80 h-8"
                />
                <Button
                  size="sm"
                  onClick={handleCopyLink}
                  className="h-8 shrink-0 gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Copied' : 'Copy Link'}
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setGeneratedResetLink(null)}
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          className={cn(
            "cursor-pointer transition-all hover:border-primary/50",
            filterStatus === 'pending_approval' && "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20"
          )}
          onClick={() => setFilterStatus('pending_approval')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {pendingCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:border-primary/50",
            filterStatus === 'approved' && "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20"
          )}
          onClick={() => setFilterStatus('approved')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {approvedCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:border-primary/50",
            filterStatus === 'rejected' && "border-rose-500 bg-rose-500/5 ring-1 ring-rose-500/20"
          )}
          onClick={() => setFilterStatus('rejected')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {rejectedCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <XCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:border-primary/50",
            filterStatus === 'all' && "border-primary bg-primary/5 ring-1 ring-primary/20"
          )}
          onClick={() => setFilterStatus('all')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">
                {totalCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <KeyRound className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border/60 overflow-x-auto">
          {[
            { id: 'pending_approval', label: 'Pending' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'all', label: 'All Requests' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                filterStatus === tab.id
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name or COID..."
            className="pl-9 text-xs h-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Request List / Table */}
      <Card className="border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading recovery requests...</p>
          </div>
        ) : isError ? (
          <div className="py-16 px-4 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
            <p className="text-sm font-medium text-destructive">Failed to load recovery requests.</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {(error as any)?.message || 'An unexpected error occurred communicating with the server.'}
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs">
              Try Again
            </Button>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-20 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground/60">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No Requests Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {debouncedSearch
                ? `No requests matching "${debouncedSearch}".`
                : filterStatus === 'pending_approval'
                ? 'All pending password reset requests have been reviewed.'
                : 'No password recovery records found for the selected status.'}
            </p>
            {debouncedSearch && (
              <Button size="sm" variant="ghost" onClick={() => setSearchQuery('')} className="text-xs">
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Desktop Table Header */}
            <div className="hidden lg:grid grid-cols-12 px-6 py-3 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-3">Requester</div>
              <div className="col-span-2">Department</div>
              <div className="col-span-2">Masked Email</div>
              <div className="col-span-2">Submitted Date</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Request Rows */}
            {requests.map((reqItem) => {
              const isPending = reqItem.status === 'pending_approval';
              const isSelf = user?.id === reqItem.targetUserId;

              return (
                <div
                  key={reqItem.id}
                  className={cn(
                    "p-4 sm:p-6 transition-colors hover:bg-muted/30 flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-0 lg:items-center",
                    isPending && "bg-amber-500/[0.02]"
                  )}
                >
                  {/* Column 1: Requester */}
                  <div className="lg:col-span-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {reqItem.targetUser?.name || 'Unknown User'}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Your Request
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                        {reqItem.targetUser?.campusId || reqItem.campusId}
                      </span>
                      <span className="text-[11px] capitalize px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        {reqItem.targetUser?.role || 'User'}
                      </span>
                    </div>
                  </div>

                  {/* Column 2: Department */}
                  <div className="lg:col-span-2 text-xs text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                    <span className="truncate">
                      {reqItem.department || reqItem.targetUser?.department || 'Institution-Wide'}
                    </span>
                  </div>

                  {/* Column 3: Masked Email */}
                  <div className="lg:col-span-2 text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                    <span>{reqItem.maskedEmail || reqItem.targetUser?.maskedEmail || '******'}</span>
                  </div>

                  {/* Column 4: Submission Date */}
                  <div className="lg:col-span-2 text-xs text-muted-foreground space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                      <span>{formatDateSafe(reqItem.createdAt, 'MMM d, yyyy')}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground/70 pl-5">
                      {formatDateSafe(reqItem.createdAt, 'h:mm a')}
                    </div>
                  </div>

                  {/* Column 5: Status Badge */}
                  <div className="lg:col-span-1 flex lg:justify-center">
                    {reqItem.status === 'pending_approval' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                    {(reqItem.status === 'approved' || reqItem.status === 'reset_link_sent') && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Approved
                      </span>
                    )}
                    {reqItem.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        <Check className="w-3 h-3" /> Completed
                      </span>
                    )}
                    {reqItem.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                        <XCircle className="w-3 h-3" /> Rejected
                      </span>
                    )}
                    {reqItem.status === 'expired' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
                        Expired
                      </span>
                    )}
                  </div>

                  {/* Column 6: Actions */}
                  <div className="lg:col-span-2 flex items-center lg:justify-end gap-2 pt-2 lg:pt-0 border-t border-border/60 lg:border-t-0">
                    {isPending ? (
                      isSelf ? (
                        <span className="text-xs text-muted-foreground italic">
                          Self-approval prohibited
                        </span>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-600 font-medium"
                            onClick={() => setSelectedRequestForApprove(reqItem)}
                          >
                            <Check className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive font-medium"
                            onClick={() => setSelectedRequestForReject(reqItem)}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )
                    ) : (
                      <div className="text-right">
                        <p className="text-[11px] text-muted-foreground">
                          {reqItem.reviewedAt ? `Reviewed ${formatDateSafe(reqItem.reviewedAt, 'MMM d, h:mm a')}` : 'Reviewed'}
                        </p>
                        {reqItem.approverUser?.name && (
                          <p className="text-[10px] text-muted-foreground/70 font-mono">
                            by {reqItem.approverUser.name}
                          </p>
                        )}
                        {reqItem.reviewNotes && (
                          <p className="text-[10px] text-muted-foreground italic truncate max-w-[180px]">
                            "{reqItem.reviewNotes}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Confirmation Modal: Approve Request */}
      {selectedRequestForApprove && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-base text-foreground">
                  Confirm Approval
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setSelectedRequestForApprove(null)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-lg bg-muted/40 p-3.5 border border-border/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requester:</span>
                  <span className="font-semibold text-foreground">
                    {selectedRequestForApprove.targetUser?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Campus ID:</span>
                  <span className="font-mono font-semibold">{selectedRequestForApprove.campusId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department:</span>
                  <span>{selectedRequestForApprove.department || selectedRequestForApprove.targetUser?.department || 'Institution-Wide'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registered Email:</span>
                  <span className="font-mono">{selectedRequestForApprove.maskedEmail}</span>
                </div>
                {selectedRequestForApprove.reason && (
                  <div className="pt-1 border-t border-border/60">
                    <span className="text-muted-foreground block mb-0.5">Stated Reason:</span>
                    <span className="italic text-foreground">"{selectedRequestForApprove.reason}"</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  Approving this request generates a secure, single-use, 15-minute recovery token and dispatches the reset link directly to the requester's registered email address.
                </p>
                <p className="font-medium text-foreground">
                  The reset link is never sent to the approver.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="approveNotes" className="text-xs font-semibold">
                  Approval Notes (Optional)
                </Label>
                <Input
                  id="approveNotes"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="e.g., Verified identity with department records"
                  className="text-xs h-9"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRequestForApprove(null)}
                  disabled={approveMutation.isPending}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    approveMutation.mutate({
                      id: selectedRequestForApprove.id,
                      notes: approvalNotes
                    })
                  }
                  disabled={approveMutation.isPending}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {approveMutation.isPending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    'Confirm & Send Reset Link'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal: Reject Request */}
      {selectedRequestForReject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border bg-destructive/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-base text-destructive">
                  Reject Recovery Request
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setSelectedRequestForReject(null)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground">
                You are about to reject the password recovery request for{' '}
                <span className="font-semibold text-foreground">
                  {selectedRequestForReject.targetUser?.name} ({selectedRequestForReject.campusId})
                </span>.
                The user will receive an institutional notification informing them that their recovery request was rejected.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="rejectReason" className="text-xs font-semibold">
                  Rejection Reason (Recorded in Audit Log)
                </Label>
                <Input
                  id="rejectReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Identity could not be verified by department head"
                  className="text-xs h-9"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRequestForReject(null)}
                  disabled={rejectMutation.isPending}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    rejectMutation.mutate({
                      id: selectedRequestForReject.id,
                      reason: rejectionReason
                    })
                  }
                  disabled={rejectMutation.isPending}
                  className="text-xs font-semibold"
                >
                  {rejectMutation.isPending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    'Confirm Rejection'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

