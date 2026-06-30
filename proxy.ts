import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const GATE_PASSWORD = "sporty2026";
const GATE_COOKIE = "site_access";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow these paths through without any checks
  const isPublicPath =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/gate' ||
    pathname.startsWith('/api/gate');

  if (!isPublicPath) {
    // Check gate cookie
    const gateToken = req.cookies.get(GATE_COOKIE)?.value;
    if (gateToken !== GATE_PASSWORD) {
      return NextResponse.redirect(new URL('/gate', req.url));
    }
  }

  // Supabase session refresh
  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};