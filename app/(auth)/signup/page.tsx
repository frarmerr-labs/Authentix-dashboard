"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Award, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { signupAction, type SignupState } from "./actions";

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
          Creating account...
        </>
      ) : (
        "Create account"
      )}
    </Button>
  );
}

/**
 * Form field with error display
 */
function FormField({
  id,
  label,
  type = "text",
  placeholder,
  error,
  required = false,
  hint,
  children,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children ?? (
        <Input
          id={id}
          name={id}
          type={type}
          placeholder={placeholder}
          required={required}
          className={`h-10 ${error ? "border-destructive" : ""}`}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      )}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Initial form state
 */
const initialState: SignupState = {
  error: null,
  fieldErrors: {},
  success: false,
};

/**
 * Signup page using React 19 Server Actions
 */
export default function SignupPage() {
  const [state, formAction] = useActionState(signupAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary mb-4">
            <Award className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Get started with your certificate management
          </p>
        </div>

        <Card className="p-8 shadow-sm">
          <form action={formAction} className="space-y-4">
            <FormField
              id="full_name"
              label="Full name"
              placeholder="John Doe"
              required
              error={state.fieldErrors.full_name}
            />

            <FormField
              id="company_name"
              label="Company name"
              placeholder="Acme Corporation"
              required
              error={state.fieldErrors.company_name}
            />

            <FormField
              id="email"
              label="Email"
              type="email"
              placeholder="name@company.com"
              required
              error={state.fieldErrors.email}
              hint="Personal email domains (gmail, yahoo, etc.) are not allowed"
            />

            <FormField
              id="password"
              label="Password"
              required
              error={state.fieldErrors.password}
            >
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min. 8 characters)"
                  required
                  autoComplete="new-password"
                  className={`h-10 pr-10 ${state.fieldErrors.password ? "border-destructive" : ""}`}
                  aria-invalid={state.fieldErrors.password ? "true" : undefined}
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
            </FormField>

            {state.error && (
              <div
                className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm"
                role="alert"
              >
                {state.error}
              </div>
            )}

            <SubmitButton />

            <p className="text-xs text-center text-muted-foreground pt-2">
              By signing up, you agree to our{" "}
              <Link href="/terms" className="text-primary hover:text-primary/80">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:text-primary/80">
                Privacy Policy
              </Link>
            </p>
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:text-primary/80"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
