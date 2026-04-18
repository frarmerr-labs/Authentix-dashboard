import { NextRequest, NextResponse } from "next/server";
import { backendAuthRequest, sanitizeErrorMessage } from "@/lib/api/server";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid email address" }, { status: 400 });
    }

    await backendAuthRequest("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });

    return NextResponse.json({ success: true });
  } catch {
    // Always return 200 to prevent email enumeration
    return NextResponse.json({ success: true });
  }
}
