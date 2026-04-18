"use server";

import { redirect } from "next/navigation";
import { backendAuthRequest, sanitizeErrorMessage } from "@/lib/api/server";

export interface ResetPasswordState {
  error: string | null;
  success: boolean;
}

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const code = formData.get("code");
  const password = formData.get("password");
  const confirm = formData.get("confirm");

  if (!code || typeof code !== "string") {
    return { error: "Invalid reset link. Please request a new one.", success: false };
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return { error: "Password must be at least 8 characters", success: false };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match", success: false };
  }

  try {
    await backendAuthRequest("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ code, password }),
    });
  } catch (error) {
    return { error: sanitizeErrorMessage(error), success: false };
  }

  redirect("/login?reset=1");
}
