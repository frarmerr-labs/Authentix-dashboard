"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, CheckCircle2, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VerificationStatusResponse {
  verified: boolean;
  email?: string;
  user_id?: string;
}

function SignupSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");
  const [isChecking, setIsChecking] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCheckingRef = useRef(false);

  /**
   * Check verification status via backend endpoint (cookie-independent)
   * This works even if verification happened in another browser/device
   */
  const checkVerification = useCallback(async (): Promise<boolean> => {
    if (!email) {
      console.warn("[SignupSuccess] No email provided for verification check");
      return false;
    }

    // Prevent concurrent checks
    if (isCheckingRef.current) {
      return false;
    }

    isCheckingRef.current = true;

    try {
      // Call verification-status endpoint (does NOT require cookies)
      const response = await fetch(
        `/api/auth/verification-status?email=${encodeURIComponent(email)}`,
        {
          method: "GET",
          credentials: "include", // Include cookies if available, but not required
        }
      );

      if (!response.ok) {
        throw new Error(`Verification check failed: ${response.status}`);
      }

      const result = (await response.json()) as {
        success: boolean;
        data?: VerificationStatusResponse;
        error?: { message: string };
      };

      if (!result.success || !result.data) {
        console.debug("[SignupSuccess] Verification check returned no data");
        isCheckingRef.current = false;
        return false;
      }

      if (result.data.verified) {
        // Email is verified - show success and guide to login
        setIsVerified(true);
        setIsChecking(false);
        isCheckingRef.current = false;
        return true;
      }

      isCheckingRef.current = false;
      return false;
    } catch (error) {
      console.error("[SignupSuccess] Verification check error:", error);
      // Don't set error state - just return false to continue polling
      isCheckingRef.current = false;
      return false;
    }
  }, [email]);

  const handleManualCheck = useCallback(async () => {
    // Keep the waiting box visible; just trigger a fresh check
    setError(null);
    await checkVerification();
  }, [checkVerification]);

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

    // Add window focus listener to refresh check when user returns to tab
    const handleFocus = () => {
      if (!isVerified) {
        checkVerification();
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (timeout) clearTimeout(timeout);
      window.removeEventListener("focus", handleFocus);
      isCheckingRef.current = false;
    };
  }, [checkVerification, isVerified]);

  // NOTE: Do not auto-redirect after verification.
  // Keep the confirmed screen visible and let the user proceed manually.

  // Show verified state - guide user to login
  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-[420px]">
          <Card className="p-6 shadow-sm">
            <div className="text-center space-y-5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-1">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Email verified</h1>
              <p className="text-muted-foreground">
                Your email has been verified successfully. Click below to sign in and continue to your dashboard.
              </p>
              <div className="pt-2">
                <Button
                  onClick={() => {
                    // Prefill email + show verified banner on login
                    const loginUrl = email
                      ? `/login?verified=1&email=${encodeURIComponent(email)}`
                      : "/login";
                    router.push(loginUrl);
                  }}
                  className="w-full bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  Sign in to dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Show fallback UI if email is missing
  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-[420px]">
          <Card className="p-8 shadow-sm">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <h1 className="text-2xl font-bold">Missing email context</h1>
              <p className="text-muted-foreground">
                We couldn't determine which email to check. Please sign in to continue.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Go to Login</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            Account Created Successfully!
          </h1>
          <p className="text-sm text-muted-foreground">
            We've sent a verification email to your inbox
          </p>
        </div>

        <Card className="p-6 shadow-sm">
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm mb-1">Check your email</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    We've sent a verification link to{" "}
                    <span className="font-medium text-foreground break-all">{email}</span>
                  </p>
                </div>
              </div>
            </div>

            {isChecking && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-sm font-medium text-primary">
                    Waiting for email verification...
                  </p>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  If you&apos;ve already clicked the verification link,{" "}
                  <button
                    onClick={handleManualCheck}
                    className="text-primary hover:underline font-medium"
                  >
                    click here to refresh
                  </button>
                </p>
              </div>
            )}

            <div className="pt-5 border-t space-y-4">
              <p className="text-xs text-muted-foreground text-center">
                Didn't receive the email? Check your spam folder or{" "}
                <Link href="/signup" className="text-primary hover:underline font-medium">
                  try signing up again
                </Link>
              </p>

              <div className="p-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-xs text-gray-900 dark:text-gray-100 text-center">
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">Tip:</strong> If you clicked the verification link in another browser or device,{" "}
                  <button
                    onClick={handleManualCheck}
                    className="font-semibold underline hover:no-underline text-primary dark:text-primary"
                  >
                    click here to check your status
                  </button>
                  . The page will also check automatically when you return to this tab.
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
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6 animate-pulse">
              <CheckCircle2 className="h-10 w-10 text-primary" />
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
