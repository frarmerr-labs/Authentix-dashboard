import { NextRequest, NextResponse } from 'next/server';

const VERIFY_HOSTNAME = 'verify.digicertificates.in';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? '';
  const isVerifyDomain = hostname === VERIFY_HOSTNAME || hostname.startsWith(`${VERIFY_HOSTNAME}:`);

  if (!isVerifyDomain) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const url = request.nextUrl.clone();

  // Root → verify landing page (never hit the dashboard login redirect)
  if (pathname === '/') {
    url.pathname = '/verify';
    return NextResponse.rewrite(url);
  }

  // Already under /verify/... — serve normally (backward compat with old QR codes)
  if (pathname.startsWith('/verify')) return NextResponse.next();

  // New format: /{orgSlug}/{token} → rewrite to /verify/{token}
  // orgSlug is contextual in the URL; the token alone identifies the certificate.
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 2) {
    url.pathname = `/verify/${parts[1]}`;
    return NextResponse.rewrite(url);
  }

  // Any other path on the verify domain — show the verify landing page
  url.pathname = '/verify';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|monitoring).*)'],
};
