import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { BookOpen, Users, GraduationCap, Shield, ArrowRight, Eye, EyeOff, DollarSign, Library, BarChart3, Briefcase } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardPath } from '@/lib/dashboardRoutes';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your identifier and password');
      return;
    }

    setIsLoading(true);
    
    try {
      const loggedInUser = await login({ identifier, password });
      
      const from = (location.state as Record<string, string> | null)?.from;
      if (from && from !== '/') {
        navigate(from, { replace: true });
      } else {
        const userRole = loggedInUser?.role || 'student';
        navigate(getDashboardPath(userRole), { replace: true });
      }
    } catch {
      setError('Invalid credentials. Please try again.');
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

            <motion.div variants={item} className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { name: 'Student', icon: <GraduationCap className="w-5 h-5" />, color: 'bg-emerald-500' },
                  { name: 'Faculty', icon: <Users className="w-5 h-5" />, color: 'bg-blue-500' },
                  { name: 'Admin', icon: <Shield className="w-5 h-5" />, color: 'bg-violet-500' },
                  { name: 'Finance', icon: <DollarSign className="w-5 h-5" />, color: 'bg-amber-500' },
                  { name: 'Library', icon: <Library className="w-5 h-5" />, color: 'bg-rose-500' },
                  { name: 'Analytics', icon: <BarChart3 className="w-5 h-5" />, color: 'bg-cyan-500' },
                  { name: 'HOD', icon: <Briefcase className="w-5 h-5" />, color: 'bg-fuchsia-500' },
                ].map((dept) => (
                  <div
                    key={dept.name}
                    className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border border-border/60 bg-background/40 backdrop-blur-sm"
                  >
                    <div className={`w-8 h-8 rounded-lg ${dept.color} flex items-center justify-center shrink-0 text-white`}>
                      {dept.icon}
                    </div>
                    <span className="text-[10px] font-medium text-foreground/80 leading-tight text-center">{dept.name}</span>
                  </div>
                ))}
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
              <CardTitle className="text-2xl font-display">Welcome Back</CardTitle>
              <CardDescription>Enter your credentials to access your dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="identifier" className="text-sm font-semibold">
                    Email Address
                  </Label>
                  <Input
                    id="identifier"
                    type="email"
                    placeholder="e.g., student@campus.edu"
                    value={identifier}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIdentifier(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium"
                  >
                    {error}
                  </motion.div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-bold uppercase tracking-wide"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign In <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                <div className="text-center">
                  <a href="/forgot-password" className="text-sm text-primary hover:underline font-medium">
                    Forgot your password?
                  </a>
                </div>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Student and staff accounts are provisioned directly by your Department HOD or Administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
