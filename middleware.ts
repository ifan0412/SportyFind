import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  // 1. Basic Auth 密碼鎖
  const basicAuth = req.headers.get('authorization');
  let isAuthenticated = false;

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');
    if (user === 'sporty' && pwd === '2026') {
      isAuthenticated = true;
    }
  }

  if (!isAuthenticated) {
    return new NextResponse('需要輸入通關密碼才能進入 SportyFind', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    });
  }

  // 2. Supabase SSR 身分同步
  // ✅ FIX: response must be initialised with the request BEFORE supabase touches it
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
          // ✅ FIX: first write cookies back onto the request object
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          // ✅ FIX: then create a fresh response that carries the mutated request
          response = NextResponse.next({ request: req });
          // ✅ FIX: finally stamp the same cookies onto the outgoing response
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Forces Supabase to validate + refresh the session cookie if needed
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};