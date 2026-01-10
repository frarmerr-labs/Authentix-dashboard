import { NextRequest, NextResponse } from "next/server";
import {
  backendAuthRequest,
  setServerAuthCookies,
  sanitizeErrorMessage,
  ServerApiError,
} from "@/lib/api/server";

interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
  company_name: string;
}

interface SignupResponse {
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignupRequest;

    // Validate input
    if (!body.email || !body.password || !body.full_name || !body.company_name) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    // Forward to backend
    const result = await backendAuthRequest<SignupResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        full_name: body.full_name,
        company_name: body.company_name,
      }),
    });

    // Set HttpOnly cookies
    await setServerAuthCookies(result.session);

    // Return user info (without tokens)
    return NextResponse.json({
      success: true,
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    console.error("[API] Signup error:", error);

    const status = error instanceof ServerApiError ? error.status : 500;
    const message = sanitizeErrorMessage(error);

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
