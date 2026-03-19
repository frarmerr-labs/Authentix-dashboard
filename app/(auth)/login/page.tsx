"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginState } from "./actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";

/**
 * Submit button with loading state using React 19's useFormStatus
 */
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full h-10 bg-primary hover:bg-primary/90"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing in...
        </>
      ) : (
        "Sign in"
      )}
    </Button>
  );
}

/**
 * Initial form state
 */
const initialState: LoginState = {
  error: null,
  success: false,
};

/**
 * Login page content component (needs Suspense for useSearchParams)
 */
function LoginPageContent() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const isVerified = searchParams.get("verified") === "1";
  const prefilledEmail = searchParams.get("email");
  const isBootstrapError = state.error && (
    state.error.toLowerCase().includes("bootstrap") ||
    state.error.toLowerCase().includes("organization") ||
    state.error.toLowerCase().includes("set up")
  );

  const handleRetryBootstrap = async () => {
    // Retry login which will retry bootstrap
    const form = document.querySelector('form') as HTMLFormElement;
    if (form) {
      form.requestSubmit();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-4">
            <Image
              src="/brand/authentix-24-24.svg"
              width={48}
              height={48}
              alt="Authentix"
              priority
            />
          </div>
          {!isVerified && (
            <>
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Sign in to your Authentix account
              </p>
            </>
          )}
        </div>

        {/* Verified Success Message */}
        {isVerified && (
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              <p className="text-sm font-medium text-primary">
                Email verified. Please sign in to continue.
              </p>
            </div>
          </div>
        )}

        {/* Login Card */}
        <Card className="p-8 shadow-sm">
          <form action={formAction} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@company.com"
                required
                autoComplete="email"
                className="h-10"
                defaultValue={prefilledEmail || undefined}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary hover:text-primary/80"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {state.error && (
              <div className="space-y-3">
                <div
                  className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm"
                  role="alert"
                >
                  {state.error}
                </div>
                {isBootstrapError && (
                  <Button
                    type="button"
                    onClick={handleRetryBootstrap}
                    variant="outline"
                    className="w-full"
                  >
                    Retry Setup
                  </Button>
                )}
              </div>
            )}

            <SubmitButton />
          </form>
        </Card>

        {/* Sign up link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary hover:text-primary/80"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * Login page using React 19 Server Actions
 * Wrapped in Suspense for useSearchParams support
 */
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="w-full max-w-[380px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Loading login page...</p>
            </div>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
