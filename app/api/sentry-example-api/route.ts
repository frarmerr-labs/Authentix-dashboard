import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// A test route that intentionally throws a server-side error so you can
// verify Sentry is capturing server errors correctly.
export async function GET() {
  throw new Error("Sentry Example API Route Error");
  // eslint-disable-next-line no-unreachable
  return NextResponse.json({ message: "ok" });
}
