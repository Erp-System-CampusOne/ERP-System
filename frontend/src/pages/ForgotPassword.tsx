import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { BookOpen, ArrowLeft, Mail, ArrowRight, CheckCircle, ShieldAlert } from 'lucide-react';

import { requestPasswordRecovery } from '@/api/apiCall';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function ForgotPassword() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;

  const [campusId, setCampusId] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [submittedCampusId, setSubmittedCampusId] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [unconfiguredEmail, setUnconfiguredEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUnconfiguredEmail(false);

    const trimmedCampusId = campusId.trim();
    const trimmedEmail = email.trim();

    if (!trimmedCampusId) {
      setError('Please enter your official Campus ID (e.g. COID1001)');
      return;
    }

    if (!trimmedEmail) {
      setError('Please enter your registered institutional email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const res = await requestPasswordRecovery({
        campusId: trimmedCampusId,
        email: trimmedEmail,
        reason: reason.trim() || undefined
      });
      if (res && res.success) {
        setSubmittedCampusId(trimmedCampusId);
        setSubmittedEmail(trimmedEmail);
        setIsSubmitted(true);
      } else {
        setError(res?.message || 'Password recovery request could not be completed.');
      }
    } catch (err: any) {
      const msg = err.message || '';
      let userMsg = 'Password recovery could not be processed. Please try again.';
      try {
        const jsonMatch = msg.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.code === 'EMAIL_SERVICE_NOT_CONFIGURED' || parsed.message?.includes('not configured')) {
            setUnconfiguredEmail(true);
          }
          if (parsed.message) userMsg = parsed.message;
        } else if (msg) {
          if (msg.includes('EMAIL_SERVICE_NOT_CONFIGURED') || msg.includes('not configured')) {
            setUnconfiguredEmail(true);
          }
          userMsg = msg;
        }
      } catch {
        if (msg) userMsg = msg;
      }
      setError(userMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/15 rounded-full blur-3xl" />
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/8 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <Wrapper
            variants={container}
            initial="hidden"
            animate="show"
            className="max-w-md text-center space-y-8"
          >
            <motion.div variants={item} className="inline-flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <div className="relative bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg">
                  <BookOpen className="w-12 h-12" />
                </div>
              </div>
            </motion.div>

            <motion.div variants={item}>
              <h1 className="font-display text-5xl font-bold tracking-tight">
                Campus<span className="text-primary">One</span>
              </h1>
              <p className="mt-4 text-lg text-muted-foreground font-body">
                Your complete academic command center
              </p>
            </motion.div>

            <motion.div variants={item} className="space-y-3">
              <div className="flex items-center justify-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Institutional Credential Recovery</span>
                <Mail className="w-4 h-4 text-primary" />
              </div>
            </motion.div>
          </Wrapper>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center justify-center">
              <div className="bg-primary text-primary-foreground p-3 rounded-xl shadow-md">
                <BookOpen className="w-8 h-8" />
              </div>
            </div>
          </div>

          <Card className="border-2 shadow-lg">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl font-display">
                {isSubmitted ? 'Recovery Request Submitted' : 'Password Recovery'}
              </CardTitle>
              <CardDescription>
                {isSubmitted
                  ? 'Your request is pending institutional superior approval'
                  : 'Verify your Campus ID and registered institutional email'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6 space-y-4"
                >
                  <div className="inline-flex items-center justify-center">
                    <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
                      <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      If your Campus ID and registered email match an active account, your recovery request has been forwarded to your institutional superior (such as your Department HOD or Administrator) for review:
                    </p>
                    <div className="p-3 rounded-lg bg-muted/60 text-xs font-mono space-y-1 text-left border">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Campus ID:</span>
                        <span className="font-bold text-foreground">{submittedCampusId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-bold text-foreground">{submittedEmail}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Workflow:</span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">Pending Superior Approval</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                      In accordance with CampusOne security governance, password reset links are issued only after authorization by your designated superior. Once approved, single-use reset instructions will be released.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setIsSubmitted(false);
                        setCampusId('');
                        setEmail('');
                        setReason('');
                      }}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Submit Another Request
                    </Button>
                    <Button
                      className="w-full"
                      onClick={() => navigate('/login')}
                    >
                      Back to Sign In
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Wrapper
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="space-y-4"
                  >
                    <motion.div variants={item} className="space-y-1.5">
                      <Label htmlFor="campusId" className="text-xs font-semibold uppercase tracking-wider">
                        Campus ID (COID) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="campusId"
                        type="text"
                        placeholder="e.g. COID1001"
                        value={campusId}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCampusId(e.target.value)}
                        className="h-10 font-mono"
                        autoComplete="username"
                        required
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Your canonical CampusOne identity (e.g. COID1001, COID3001)
                      </p>
                    </motion.div>

                    <motion.div variants={item} className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider">
                        Registered Institutional Email <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="name@campus.edu"
                          value={email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                          className="h-10 pl-9"
                          autoComplete="email"
                          required
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Must match the official email associated with this Campus ID
                      </p>
                    </motion.div>

                    <motion.div variants={item} className="space-y-1.5">
                      <Label htmlFor="reason" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Reason for Recovery (Optional)
                      </Label>
                      <Input
                        id="reason"
                        type="text"
                        placeholder="e.g. Forgotten password, locked account"
                        value={reason}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
                        className="h-10 text-xs"
                      />
                    </motion.div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-3 rounded-lg text-xs font-medium flex items-start gap-2.5 leading-relaxed",
                          unconfiguredEmail
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                            : "bg-destructive/10 text-destructive border border-destructive/20"
                        )}
                        role="alert"
                      >
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <span>{error}</span>
                          {unconfiguredEmail && (
                            <p className="mt-1 text-[11px] opacity-90">
                              Direct outbound email is not configured. Your institutional superior will approve your request and provide reset authorization directly in-app.
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}

                    <motion.div variants={item} className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-11"
                        onClick={() => navigate('/login')}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 h-11 text-sm font-bold"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Submitting...
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            Submit Request <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </motion.div>
                  </Wrapper>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link to="/login" className="text-primary hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
