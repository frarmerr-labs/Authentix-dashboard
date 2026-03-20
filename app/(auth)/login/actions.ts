"use server";

import { redirect } from "next/navigation";
import {
  backendAuthRequest,
  setServerAuthCookies,
  sanitizeErrorMessage,
  serverApiRequest,
} from "@/lib/api/server";

/**
 * Login form state type
 */
export interface LoginState {
  error: string | null;
  success: boolean;
}

/**
 * Login response from backend
 */
interface LoginResponse {
  user: {
    id: string;
    email: string;
    full_name: string | null;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

/**
 * Server Action for user login
 * Uses React 19 Server Actions pattern
 */
export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  // Validate input
  if (!email || !password) {
    return {
      error: "Email and password are required",
      success: false,
    };
  }

  if (typeof email !== "string" || typeof password !== "string") {
    return {
      error: "Invalid input",
      success: false,
    };
  }

  try {
    // Call backend auth endpoint
    const result = await backendAuthRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    // Set HttpOnly cookies
    await setServerAuthCookies(result.session);

    // After successful login, bootstrap organization (required by backend)
    try {
      console.log("[Login] Calling bootstrap endpoint...");
      const bootstrapResult = await serverApiRequest<{
        organization: { id: string; slug?: string };
      }>("/auth/bootstrap", {
        method: "POST",
      });

      // Log full bootstrap response
      console.log("[Login] Bootstrap response:", JSON.stringify({
        success: bootstrapResult.success,
        hasData: !!bootstrapResult.data,
        organization: bootstrapResult.data?.organization,
        fullResponse: bootstrapResult,
      }, null, 2));

      // Use slug for URL if available, fall back to id
      const orgSlug = bootstrapResult.data?.organization?.slug ?? bootstrapResult.data?.organization?.id;

      // Only redirect after bootstrap succeeds
      if (orgSlug) {
        redirect(`/dashboard/org/${orgSlug}`);
      } else {
        // Fallback to dashboard if org id is missing (should not happen)
        redirect("/dashboard");
      }
    } catch (bootstrapError) {
      // NEXT_REDIRECT is not an error - it's how Next.js handles redirects
      // Check if this is a redirect error and re-throw it immediately
      if (bootstrapError && typeof bootstrapError === 'object') {
        const error = bootstrapError as any;
        // Check for NEXT_REDIRECT by message or digest
        if (
          error.message === "NEXT_REDIRECT" ||
          error.digest?.startsWith("NEXT_REDIRECT")
        ) {
          // Re-throw redirect errors so Next.js can handle them
          throw bootstrapError;
        }
      }
      
      // Only log actual errors, not redirects
      console.error("[Login] Bootstrap error:", bootstrapError);
      
      // Log detailed error information for debugging
      if (bootstrapError instanceof Error) {
        console.error("[Login] Bootstrap error details:", {
          message: bootstrapError.message,
          name: bootstrapError.name,
          stack: bootstrapError.stack,
        });
      }
      
      // If it's a ServerApiError, log the code and details
      if (bootstrapError && typeof bootstrapError === 'object' && 'code' in bootstrapError) {
        console.error("[Login] Bootstrap API error:", {
          code: (bootstrapError as any).code,
          message: (bootstrapError as any).message,
          status: (bootstrapError as any).status,
          details: (bootstrapError as any).details,
        });
      }
      
      // Extract error message and step label for better UX
      let errorMessage = "Failed to set up organization. Please try again.";
      let stepLabel = "";

      if (bootstrapError && typeof bootstrapError === 'object') {
        const errorObj = bootstrapError as any;
        
        // Try to get step label from error details
        if (errorObj.details?.step) {
          stepLabel = ` (Step: ${errorObj.details.step})`;
        }
        
        // Get error message
        if (errorObj.message) {
          errorMessage = errorObj.message;
        } else if (errorObj.details?.message) {
          errorMessage = errorObj.details.message;
        } else {
          errorMessage = sanitizeErrorMessage(bootstrapError);
        }
      } else {
        errorMessage = sanitizeErrorMessage(bootstrapError) || errorMessage;
      }

      return {
        error: `${errorMessage}${stepLabel}`,
        success: false,
      };
    }
  } catch (error) {
    // NEXT_REDIRECT is not an error - re-throw it so Next.js can handle it
    if (error && typeof error === 'object') {
      const nextError = error as any;
      if (
        nextError.message === "NEXT_REDIRECT" ||
        nextError.digest?.startsWith("NEXT_REDIRECT")
      ) {
        throw error; // Re-throw redirect errors
      }
    }
    
    // Check if error is about email not verified
    const errorMessage = sanitizeErrorMessage(error);
    if (
      errorMessage.toLowerCase().includes("email") &&
      errorMessage.toLowerCase().includes("verif")
    ) {
      // Redirect to verify email page
      redirect("/verify-email");
    }

    // Return sanitized error message
    return {
      error: errorMessage,
      success: false,
    };
  }

  // Redirect handled above after bootstrap
}
