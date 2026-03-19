import { NextRequest, NextResponse } from "next/server";
import {
  backendAuthRequest,
  setServerAuthCookies,
  sanitizeErrorMessage,
  ServerApiError,
} from "@/lib/api/server";

interface LoginRequest {
  email: string;
  password: string;
}

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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequest;

    // Validate input
    if (!body.email || !body.password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Forward to backend
    const result = await backendAuthRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: body.email,
        password: body.password,
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
    console.error("[API] Login error:", error);

    const status = error instanceof ServerApiError ? error.status : 500;
    const message = sanitizeErrorMessage(error);

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
