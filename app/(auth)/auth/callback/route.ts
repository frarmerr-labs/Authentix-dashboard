import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import {
  backendAuthRequest,
  setServerAuthCookies,
  ServerApiError,
} from "@/lib/api/server";

interface CodeExchangeResponse {
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  user: {
    id: string;
    email: string;
    email_verified: boolean;
    full_name: string | null;
  };
}

/**
 * Email verification callback handler
 * 
 * Handles the redirect from email verification link.
 * Exchanges the verification code for a session and sets HttpOnly cookies.
 * 
 * If Supabase is configured, this can be updated to use:
 *   import { createServerClient } from '@supabase/ssr'
 *   const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, { cookies })
 *   const { data, error } = await supabase.auth.exchangeCodeForSession(code)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") || "/dashboard";
    const error = searchParams.get("error");

    // Handle error from backend
    if (error) {
      console.error("[AuthCallback] Error parameter received:", error);
      return NextResponse.redirect(
        new URL(`/login?error=verification_failed&reason=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Code is required for verification
    if (!code) {
      console.warn("[AuthCallback] No code parameter in URL");
      // If no code but user might have verified elsewhere, redirect to login
      return NextResponse.redirect(
        new URL("/login?verified=1", request.url)
      );
    }

    // First, check if backend already set cookies (some backends set cookies directly)
    const { isServerAuthenticated } = await import("@/lib/api/server");
    const hasSession = await isServerAuthenticated();

    if (hasSession) {
      // Session exists (backend set cookies directly) - redirect to dashboard
      console.log("[AuthCallback] Session already exists, redirecting to dashboard");
      return NextResponse.redirect(new URL(next, request.url));
    }

    // If no session, try to exchange code for session
    try {
      // Exchange code for session via backend API
      // Backend endpoint options:
      //   - POST /auth/verify-email with body: { code }
      //   - GET /auth/verify?code=...
      //   - POST /auth/exchange-code with body: { code }
      // Adjust endpoint based on your backend's verification flow
      let result: CodeExchangeResponse;
      
      try {
        // Try POST with code in body first
        result = await backendAuthRequest<CodeExchangeResponse>(
          `/auth/verify-email`,
          {
            method: "POST",
            body: JSON.stringify({ code }),
          }
        );
      } catch (postError) {
        // If POST fails, try GET with code in query
        try {
          result = await backendAuthRequest<CodeExchangeResponse>(
            `/auth/verify-email?code=${encodeURIComponent(code)}`,
            {
              method: "GET",
            }
          );
        } catch (getError) {
          // If both fail, backend might not have this endpoint yet
          // Redirect to login - user can login manually
          console.warn("[AuthCallback] Backend doesn't have verify-email endpoint, redirecting to login");
          return NextResponse.redirect(
            new URL("/login?verified=1", request.url)
          );
        }
      }

      // Set HttpOnly cookies with session tokens
      await setServerAuthCookies(result.session);

      // Verify email_verified is true
      if (!result.user?.email_verified) {
        console.warn("[AuthCallback] Email verification returned but email_verified is false");
        return NextResponse.redirect(
          new URL("/verify-email?error=not_verified", request.url)
        );
      }

      // Success - redirect to dashboard (or next parameter)
      // The dashboard layout will handle bootstrap if needed
      return NextResponse.redirect(new URL(next, request.url));
    } catch (exchangeError) {
      console.error("[AuthCallback] Code exchange failed:", exchangeError);

      // Code exchange failed - redirect to login with verified flag
      // User can login manually since email is verified
      const errorMessage =
        exchangeError instanceof ServerApiError
          ? exchangeError.message
          : "Verification code exchange failed";
      
      console.error("[AuthCallback] Error details:", errorMessage);
      
      // Redirect to login with verified=1 so user knows to login
      return NextResponse.redirect(
        new URL("/login?verified=1", request.url)
      );
    }
  } catch (error) {
    console.error("[AuthCallback] Unexpected error:", error);
    // On any unexpected error, redirect to login
    return NextResponse.redirect(
      new URL("/login?error=verification_failed", request.url)
    );
  }
}
