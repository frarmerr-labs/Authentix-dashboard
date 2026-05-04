import { NextRequest, NextResponse } from 'next/server';

const VERIFY_HOSTNAME = 'verify.digicertificates.in';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? '';

  if (!hostname.startsWith(VERIFY_HOSTNAME)) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Already routed to /verify/... — let Next.js serve it normally (backward compat)
  if (pathname.startsWith('/verify/')) return NextResponse.next();

  // New format: /{orgSlug}/{token} — rewrite internally to /verify/{token}
  // The orgSlug is decorative in the URL; the token is sufficient for lookup.
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 2) {
    const url = request.nextUrl.clone();
    url.pathname = `/verify/${parts[1]}`;
    return NextResponse.rewrite(url);
  }

  // Root or unrecognised path on verify domain — redirect to dashboard
  if (parts.length === 0) {
    return NextResponse.redirect('https://dashboard.digicertificates.in');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|monitoring).*)'],
};
