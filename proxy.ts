import { NextResponse, type NextRequest } from 'next/server';

const SITE_PASSWORD = 'sporty123';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow these paths through without any check
  if (
    pathname.startsWith('/gate') ||
    pathname.startsWith('/api/gate') ||
    pathname.startsWith('/_next') ||
    pathname.includes('favicon')
  ) {
    return NextResponse.next();
  }

  const siteAccess = request.cookies.get('site_access')?.value;

  if (siteAccess !== SITE_PASSWORD) {
    return NextResponse.redirect(new URL('/gate', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};