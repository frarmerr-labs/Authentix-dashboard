"use server";

import { redirect } from "next/navigation";
import {
  backendAuthRequest,
  setServerAuthCookies,
  sanitizeErrorMessage,
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
  } catch (error) {
    // Check if error is about email not verified
    const errorMessage = sanitizeErrorMessage(error);
    if (
      errorMessage.toLowerCase().includes("email") &&
      errorMessage.toLowerCase().includes("verif")
    ) {
      // Redirect to verify email page
      redirect("/auth/verify-email");
    }

    // Return sanitized error message
    return {
      error: errorMessage,
      success: false,
    };
  }

  // Check email verification status before redirecting to dashboard
  // If backend returns email_verified in login response, we could check here
  // For now, the dashboard layout will handle the redirect
  redirect("/dashboard");
}
