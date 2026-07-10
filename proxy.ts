import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// 💡 修正：在 Next.js 16+ 中，這裡必須明確命名為 proxy
export async function proxy(req: NextRequest) {
  
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let user = null;
  try {
    ({ data: { user } } = await supabase.auth.getUser());
  } catch {
    // Transient network errors during login should not hard-fail navigation.
  }

  // 只在存取 /profile 時檢查登入，其他頁面(包含 /network)放行
  if (req.nextUrl.pathname.startsWith('/profile') && !user) {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - auth/callback (Crucial for Google Login!)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!auth/callback|_next/static|_next/image|favicon.ico).*)',
  ],
}