import { NextResponse } from "next/server";
import {
  getServerRefreshToken,
  setServerAuthCookies,
  clearServerAuthCookies,
  sanitizeErrorMessage,
} from "@/lib/api/server";

function getBackendUrl(): string {
  const url = process.env.BACKEND_API_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000/api/v1";
  }
  return "";
}

interface RefreshResponse {
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

export async function POST() {
  const backendUrl = getBackendUrl();

  if (!backendUrl) {
    return NextResponse.json(
      { success: false, error: "Service unavailable" },
      { status: 503 }
    );
  }

  try {
    const refreshToken = await getServerRefreshToken();

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: "No refresh token" },
        { status: 401 }
      );
    }

    const response = await fetch(`${backendUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      await clearServerAuthCookies();
      return NextResponse.json(
        { success: false, error: "Session expired" },
        { status: 401 }
      );
    }

    const result = data.data as RefreshResponse;
    await setServerAuthCookies(result.session);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Token refresh error:", error);
    await clearServerAuthCookies();

    return NextResponse.json(
      { success: false, error: sanitizeErrorMessage(error) },
      { status: 401 }
    );
  }
}
