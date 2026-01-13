import { NextResponse } from "next/server";
import { serverApiRequest, isServerAuthenticated } from "@/lib/api/server";

interface MeResponse {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
    email_verified: boolean;
    full_name: string | null;
  } | null;
  organization?: {
    id: string;
    name: string;
  } | null;
}

export async function GET() {
  try {
    // Check if we have a valid token
    const hasValidToken = await isServerAuthenticated();

    if (!hasValidToken) {
      return NextResponse.json({
        success: true,
        data: {
          authenticated: false,
          user: null,
        },
      });
    }

    // Get user info from backend
    // Try /auth/me first, fallback to /users/me if needed
    try {
      const result = await serverApiRequest<MeResponse>("/auth/me");
      return NextResponse.json({
        success: true,
        data: result.data,
      });
    } catch {
      // Fallback: use /users/me and /auth/session
      const [sessionResult, profileResult] = await Promise.all([
        serverApiRequest<{
          user: {
            id: string;
            email: string;
            full_name: string | null;
          } | null;
          valid: boolean;
        }>("/auth/session").catch(() => ({ data: { user: null, valid: false } })),
        serverApiRequest<{
          id: string;
          email: string;
          full_name: string | null;
          organization_id: string;
          organization: {
            name: string;
            logo: string | null;
          } | null;
        }>("/users/me").catch(() => null),
      ]);

      const session = sessionResult.data;
      const profile = profileResult.data;

      if (!session?.valid || !session.user) {
        return NextResponse.json({
          success: true,
          data: {
            authenticated: false,
            user: null,
          },
        });
      }

      // Note: If backend doesn't return email_verified, we assume false for safety
      // Backend Step-1 should return this field
      return NextResponse.json({
        success: true,
        data: {
          authenticated: true,
          user: {
            id: session.user.id,
            email: session.user.email,
            email_verified: false, // TODO: Backend should return this from /auth/me
            full_name: session.user.full_name,
          },
          organization: profile?.organization
            ? {
                id: profile.organization_id,
                name: profile.organization.name,
              }
            : null,
        },
      });
    }
  } catch (error) {
    console.error("[API] Me check error:", error);

    // Return unauthenticated rather than error
    return NextResponse.json({
      success: true,
      data: {
        authenticated: false,
        user: null,
      },
    });
  }
}
