import { NextRequest, NextResponse } from 'next/server';

// Redirect verify links on the dashboard subdomain to the root domain so
// recipients see a clean URL: digicertificates.in/verify/TOKEN instead of
// dashboard.digicertificates.in/verify/TOKEN.
const DASHBOARD_HOST = 'dashboard.digicertificates.in';
const PUBLIC_HOST = 'digicertificates.in';

export function middleware(request: NextRequest) {
  const { pathname, search, host } = new URL(request.url);

  // Redirect verify and short-link paths on the dashboard subdomain to the clean public domain
  if (host === DASHBOARD_HOST && (pathname.startsWith('/verify/') || pathname.startsWith('/c/'))) {
    return NextResponse.redirect(
      `https://${PUBLIC_HOST}${pathname}${search}`,
      { status: 301 },
    );
  }

  return NextResponse.next();
}

export const config = {
  // Run on verify and short-link paths only
  matcher: ['/verify/:path*', '/c/:path*'],
};
