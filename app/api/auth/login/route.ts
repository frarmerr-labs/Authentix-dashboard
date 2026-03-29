import { NextRequest, NextResponse } from "next/server";
import {
  backendAuthRequest,
  setServerAuthCookies,
  sanitizeErrorMessage,
  ServerApiError,
} from "@/lib/api/server";
import { LoginRequestSchema, LoginResponseSchema } from "@/lib/api/schemas/auth";

export async function POST(request: NextRequest) {
  try {
    const parsed = LoginRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await backendAuthRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });

    const validated = LoginResponseSchema.parse(result);
    await setServerAuthCookies(validated.session);

    return NextResponse.json({
      success: true,
      data: { user: validated.user },
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
