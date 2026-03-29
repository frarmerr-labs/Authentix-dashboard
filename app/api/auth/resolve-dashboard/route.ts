import { NextResponse } from "next/server";
import { serverApiRequest, isServerAuthenticated } from "@/lib/api/server";

interface ResolveDashboardResponse {
  redirect_to: string | null;
  setup_state: "ready" | "needs_bootstrap";
  organization: { id: string; name: string; slug: string } | null;
  membership: { id: string; organization_id: string; role_id: string } | null;
}

export async function POST() {
  try {
    const hasValidToken = await isServerAuthenticated();

    if (!hasValidToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const result = await serverApiRequest<ResolveDashboardResponse>("/auth/resolve-dashboard", {
      method: "POST",
    });

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[API] resolve-dashboard error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to resolve dashboard" },
      { status: 500 },
    );
  }
}
