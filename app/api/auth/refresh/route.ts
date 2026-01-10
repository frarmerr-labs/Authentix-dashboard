import { NextResponse } from "next/server";
import {
  getServerRefreshToken,
  setServerAuthCookies,
  clearServerAuthCookies,
  sanitizeErrorMessage,
  ServerApiError,
} from "@/lib/api/server";

const API_BASE_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3000/api/v1";

interface RefreshResponse {
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

export async function POST() {
  try {
    const refreshToken = await getServerRefreshToken();

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: "No refresh token" },
        { status: 401 }
      );
    }

    // Call backend refresh endpoint
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      // Clear invalid cookies
      await clearServerAuthCookies();

      return NextResponse.json(
        { success: false, error: "Session expired" },
        { status: 401 }
      );
    }

    const result = data.data as RefreshResponse;

    // Update cookies with new tokens
    await setServerAuthCookies(result.session);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Token refresh error:", error);

    // Clear cookies on refresh failure
    await clearServerAuthCookies();

    const message = sanitizeErrorMessage(error);

    return NextResponse.json(
      { success: false, error: message },
      { status: 401 }
    );
  }
}
