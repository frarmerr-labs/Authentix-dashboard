import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "auth_access_token";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/signup/success", "/forgot-password", "/verify"];
const API_ROUTES = ["/api/"];
const STATIC_ROUTES = ["/_next/", "/favicon.ico", "/images/", "/fonts/"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip for static/API routes
  if (STATIC_ROUTES.some((r) => pathname.startsWith(r)) || API_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  const hasAuthCookie = request.cookies.has(AUTH_COOKIE);

  // Public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    if (hasAuthCookie && (pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protected routes need auth
  if (!hasAuthCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /dashboard exact - let page handle org resolution
  if (pathname === "/dashboard") {
    return NextResponse.next();
  }

  // Legacy /dashboard/* routes without org - redirect to resolver
  if (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/org/")) {
    const response = NextResponse.next();
    response.cookies.set("redirect_path", pathname, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60,
    });
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
