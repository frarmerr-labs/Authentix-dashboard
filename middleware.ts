import { NextRequest, NextResponse } from 'next/server';

// Redirect verify links on the dashboard subdomain to the root domain so
// recipients see a clean URL: digicertificates.in/verify/TOKEN instead of
// dashboard.digicertificates.in/verify/TOKEN.
const DASHBOARD_HOST = 'dashboard.digicertificates.in';
const PUBLIC_HOST = 'digicertificates.in';

export function middleware(request: NextRequest) {
  const { pathname, search, host } = new URL(request.url);

  // Only redirect verify paths on the dashboard subdomain
  if (host === DASHBOARD_HOST && pathname.startsWith('/verify/')) {
    return NextResponse.redirect(
      `https://${PUBLIC_HOST}${pathname}${search}`,
      { status: 301 },
    );
  }

  return NextResponse.next();
}

export const config = {
  // Only run on verify paths — keeps auth/API routes unaffected
  matcher: ['/verify/:path*'],
};
