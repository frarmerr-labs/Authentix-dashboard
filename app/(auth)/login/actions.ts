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
    // Return sanitized error message
    return {
      error: sanitizeErrorMessage(error),
      success: false,
    };
  }

  // Redirect on success (must be outside try-catch)
  redirect("/dashboard");
}
