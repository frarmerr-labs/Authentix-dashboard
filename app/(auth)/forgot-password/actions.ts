"use server";

import { backendAuthRequest } from "@/lib/api/server";

export interface ForgotPasswordState {
  error: string | null;
  success: boolean;
}

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = formData.get("email");

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return { error: "Please enter a valid email address", success: false };
  }

  try {
    await backendAuthRequest("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return { error: null, success: true };
  } catch {
    // Always succeed to prevent email enumeration
    return { error: null, success: true };
  }
}
