import { NextRequest, NextResponse } from "next/server";
import { serverApiRequest } from "@/lib/api/server";

interface VerificationStatusResponse {
  verified: boolean;
  email?: string;
  user_id?: string;
}

/**
 * Check email verification status by email address
 * This endpoint does NOT require authentication cookies,
 * making it suitable for cross-device verification checks.
 * 
 * Backend endpoint: GET /auth/verification-status?email={email}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_EMAIL",
            message: "Email parameter is required",
          },
        },
        { status: 400 }
      );
    }

    // Call backend to check verification status
    // This endpoint should work without authentication
    try {
      const result = await serverApiRequest<VerificationStatusResponse>(
        `/auth/verification-status?email=${encodeURIComponent(email)}`,
        {
          skipAuth: true, // Don't require authentication for this check
        }
      );

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      console.error("[API] Verification status check failed:", error);

      // If backend doesn't have this endpoint yet, fallback to /auth/me with email
      try {
        const meResult = await serverApiRequest<{
          authenticated: boolean;
          user: {
            id: string;
            email: string;
            email_verified: boolean;
          } | null;
        }>(
          `/auth/me?email=${encodeURIComponent(email)}`,
          {
            skipAuth: true,
          }
        );

        // Return verification status based on /auth/me response
        return NextResponse.json({
          success: true,
          data: {
            verified: meResult.data?.user?.email_verified ?? false,
            email: meResult.data?.user?.email ?? email,
            user_id: meResult.data?.user?.id,
          },
        });
      } catch (fallbackError) {
        console.error("[API] Fallback verification check also failed:", fallbackError);
        
        // Return unverified as safe default
        return NextResponse.json({
          success: true,
          data: {
            verified: false,
            email: email,
          },
        });
      }
    }
  } catch (error) {
    console.error("[API] Verification status error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to check verification status",
        },
      },
      { status: 500 }
    );
  }
}
