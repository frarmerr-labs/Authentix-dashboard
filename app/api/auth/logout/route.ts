import { NextResponse } from "next/server";
import {
  clearServerAuthCookies,
  getServerAccessToken,
  serverApiRequest,
} from "@/lib/api/server";

export async function POST() {
  try {
    // Try to call backend logout (optional - may fail if token expired)
    const token = await getServerAccessToken();
    if (token) {
      try {
        await serverApiRequest("/auth/logout", {
          method: "POST",
        });
      } catch {
        // Ignore backend logout errors - we'll clear cookies anyway
      }
    }

    // Clear auth cookies
    await clearServerAuthCookies();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Logout error:", error);

    // Still clear cookies even if there's an error
    await clearServerAuthCookies();

    return NextResponse.json({ success: true });
  }
}
