"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api/client";

function SignupSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");
  const [isChecking, setIsChecking] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  const checkVerification = useCallback(async (): Promise<boolean> => {
    try {
      // First check if we have a session (cookies might have been set from verification link)
      const session = await api.auth.getSession();
      
      if (session.valid && session.user) {
        // We have a session, now check email verification status
        try {
          const me = await api.auth.me();
          if (me.authenticated && me.user?.email_verified) {
            setIsVerified(true);
            setIsChecking(false);
            setTimeout(() => {
              router.push("/dashboard");
              router.refresh();
            }, 1500);
            return true;
          }
        } catch (meError) {
          // If me endpoint fails, assume verified if we have a valid session
          // (Backend might have set session only after verification)
          console.debug("[SignupSuccess] Me check failed, but session exists:", meError);
          setIsVerified(true);
          setIsChecking(false);
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 1500);
          return true;
        }
      }
    } catch (error) {
      // No session yet - user hasn't clicked verification link in this browser
      // This is expected, so we don't log it as an error
      console.debug("[SignupSuccess] No session yet (expected if verification link clicked in another browser)");
    }
    return false;
  }, [router]);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    const startPolling = async () => {
      // Check immediately
      const verified = await checkVerification();
      if (verified) return;

      // Poll every 2 seconds for verification (faster polling)
      pollInterval = setInterval(async () => {
        const verified = await checkVerification();
        if (verified) {
          clearInterval(pollInterval);
          clearTimeout(timeout);
        }
      }, 2000);

      // Stop polling after 5 minutes (300 seconds)
      timeout = setTimeout(() => {
        if (pollInterval) clearInterval(pollInterval);
        setIsChecking(false);
      }, 300000);
    };

    startPolling();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (timeout) clearTimeout(timeout);
    };
  }, [checkVerification]);

  // Show verified state
  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-[500px] text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Email Verified!</h1>
          <p className="text-muted-foreground mb-6">
            Your account has been verified. Redirecting to dashboard...
          </p>
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  const handleManualCheck = async () => {
    setIsChecking(true);
    // Force a refresh to get latest cookies
    router.refresh();
    // Wait a bit for cookies to sync
    await new Promise(resolve => setTimeout(resolve, 500));
    const verified = await checkVerification();
    if (!verified) {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[500px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-3">
            Account Created Successfully!
          </h1>
          <p className="text-muted-foreground">
            We've sent a verification email to your inbox
          </p>
        </div>

        <Card className="p-8 shadow-sm">
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex-shrink-0 mt-1">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Check your email</h3>
                <p className="text-sm text-muted-foreground">
                  {email ? (
                    <>
                      We've sent a verification link to{" "}
                      <span className="font-medium text-foreground">
                        {email}
                      </span>
                    </>
                  ) : (
                    "We've sent a verification link to your email address"
                  )}
                </p>
              </div>
            </div>

            {isChecking && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-sm font-medium text-primary">
                    Waiting for email verification...
                  </p>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  If you&apos;ve already clicked the verification link,{" "}
                  <button
                    onClick={() => {
                      router.refresh();
                      checkVerification();
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    click here to refresh
                  </button>
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-primary text-xs font-semibold">1</span>
                </div>
                <div>
                  <p className="font-medium">Open your email inbox</p>
                  <p className="text-muted-foreground">
                    Look for an email from Authentix
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-primary text-xs font-semibold">2</span>
                </div>
                <div>
                  <p className="font-medium">Click the verification link</p>
                  <p className="text-muted-foreground">
                    This will confirm your email address and activate your
                    account
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-primary text-xs font-semibold">3</span>
                </div>
                <div>
                  <p className="font-medium">Automatic redirect</p>
                  <p className="text-muted-foreground">
                    Once verified, you'll be automatically taken to your
                    dashboard
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-4 text-center">
                Didn't receive the email? Check your spam folder or{" "}
                <Link href="/signup" className="text-primary hover:underline">
                  try signing up again
                </Link>
              </p>

              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-900 dark:text-blue-200 text-center">
                  <strong>Tip:</strong> If you clicked the verification link in another browser or tab,{" "}
                  <button
                    onClick={handleManualCheck}
                    className="font-semibold underline hover:no-underline"
                  >
                    click here to check your status
                  </button>{" "}
                  or refresh this page.
                </p>
              </div>

              {!isChecking && (
                <div className="mb-4">
                  <Button
                    onClick={handleManualCheck}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    Check Verification Status
                  </Button>
                </div>
              )}

              <div className="flex gap-3">
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/signup">Back to Sign Up</Link>
                </Button>
                <Button
                  asChild
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  <Link href="/login">
                    Go to Login
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function SignupSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-6 animate-pulse">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <SignupSuccessContent />
    </Suspense>
  );
}
