import { NextRequest, NextResponse } from "next/server";
import { backendAuthRequest, sanitizeErrorMessage, ServerApiError } from "@/lib/api/server";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    await backendAuthRequest("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const status = error instanceof ServerApiError ? error.status : 500;
    const message = sanitizeErrorMessage(error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
