import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { BookOpen, ArrowLeft, Lock, Eye, EyeOff, CheckCircle, ArrowRight, ShieldAlert, Loader2 } from 'lucide-react';

import { verifyResetToken, resetPasswordWithToken } from '@/api/apiCall';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const token = searchParams.get('token');
  const [isValidatingToken, setIsValidatingToken] = useState(!!token);
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    if (!token) return;

    let mounted = true;
    (async () => {
      try {
        const res = await verifyResetToken({ token });
        if (!res.valid && mounted) {
          setTokenError(res.message || 'This password reset link is invalid or has expired.');
        }
      } catch (err: any) {
        if (!mounted) return;
        const msg = err.message || '';
        let userMsg = 'This password reset link is invalid or has expired.';
        try {
          const jsonMatch = msg.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.message) userMsg = parsed.message;
          }
        } catch {
          // Fallback to generic message if parsing failed
        }
        setTokenError(userMsg);
      } finally {
        if (mounted) setIsValidatingToken(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Missing recovery token. Please request a new link.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter a new password');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!confirmPassword.trim()) {
      setError('Please confirm your password');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPasswordWithToken({ token, password });
      if (res && res.success) {
        setIsSuccess(true);
      } else {
        setError(res?.message || 'Password reset could not be completed.');
      }
    } catch (err: any) {
      const msg = err.message || '';
      let userMsg = 'Password reset failed. The link may have expired or already been used.';
      try {
        const jsonMatch = msg.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.message) userMsg = parsed.message;
        } else if (msg) {
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

  if (!token || tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border-2 shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-1">
              <ShieldAlert className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-display text-destructive">Invalid or Expired Link</CardTitle>
            <CardDescription className="leading-relaxed">
              {tokenError || 'This password reset link is invalid, malformed, or has already expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => navigate('/forgot-password')}>
              Request New Reset Link
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
              Return to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isValidatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border-2 shadow-lg py-8 text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">Verifying reset token securely...</p>
        </Card>
      </div>
    );
  }

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
                <Lock className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Reset Your Password</span>
                <Lock className="w-4 h-4 text-primary" />
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
                {isSuccess ? 'Password Reset!' : 'Reset Password'}
              </CardTitle>
              <CardDescription>
                {isSuccess
                  ? 'Your password has been successfully reset'
                  : 'Enter a new password for your account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSuccess ? (
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
                  <p className="text-sm text-muted-foreground">
                    You can now sign in with your new password
                  </p>
                  <Button
                    className="w-full mt-4"
                    onClick={() => navigate('/login')}
                  >
                    Sign In Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <Wrapper
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="space-y-5"
                  >
                    <motion.div variants={item} className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-semibold">
                        New Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter new password"
                          value={password}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                          className="h-11 pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
                    </motion.div>

                    <motion.div variants={item} className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-semibold">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                          className="h-11 pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </motion.div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium"
                      >
                        {error}
                      </motion.div>
                    )}

                    <motion.div variants={item} className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-12"
                        onClick={() => navigate('/login')}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 h-12 text-base font-bold"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Resetting...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Reset Password <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </motion.div>
                  </Wrapper>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
