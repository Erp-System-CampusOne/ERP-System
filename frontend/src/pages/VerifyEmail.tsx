import { useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { BookOpen, ArrowLeft, ShieldCheck, KeyRound, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function VerifyEmail() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
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
                Institutional Academic Command Center
              </p>
            </motion.div>

            <motion.div variants={item} className="space-y-3">
              <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Managed Institutional Provisioning</span>
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
            </motion.div>
          </Wrapper>
        </div>
      </div>

      {/* Right form panel */}
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
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl font-display">Account Provisioning Notice</CardTitle>
              <CardDescription>
                Direct email self-verification is not required
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Wrapper
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-6"
              >
                <motion.div
                  variants={item}
                  className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-sm leading-relaxed text-foreground/90 space-y-2">
                      <p>
                        In accordance with CampusOne institutional security policy, student and staff accounts are
                        <strong> directly provisioned and verified</strong> by your department HOD or campus administrator.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Public self-registration and unauthenticated OTP verification are disabled. If you have been issued a Campus ID (e.g. <span className="font-mono font-semibold">COID1001</span>), you can sign in directly or recover your password if forgotten.
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={item} className="space-y-3">
                  <Button
                    type="button"
                    className="w-full h-11 text-base font-medium"
                    onClick={() => navigate('/login')}
                  >
                    Go to Sign In
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => navigate('/forgot-password')}
                  >
                    <KeyRound className="w-4 h-4 mr-2" />
                    Forgot Password / Reset
                  </Button>
                </motion.div>

                <motion.div variants={item} className="pt-2 border-t text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground font-medium"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Link>
                </motion.div>
              </Wrapper>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Need an account or help with your credentials? Contact your Department Office or Systems Administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
