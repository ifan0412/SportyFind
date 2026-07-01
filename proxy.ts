import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(req: NextRequest) {
  // --- 在這裡加入 ---
  console.log("Checking environment variables:");
  console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Exists" : "MISSING");
  console.log("KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Exists" : "MISSING");
  // ------------------
  // 1. 處理 Basic Auth 密碼鎖
  const basicAuth = req.headers.get('authorization');
  let isAuthenticated = false;
  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');
    if (user === 'sporty' && pwd === '2026') isAuthenticated = true;
  }
  if (!isAuthenticated) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }

  // 2. 處理 Supabase 身分驗證 (先宣告 response，讓它根據 supabase 的改變進行更新)
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

  const { data: { user } } = await supabase.auth.getUser();

  // 3. 邏輯：只在存取 /profile 時檢查登入，其他頁面(包含 /network)放行
  if (req.nextUrl.pathname.startsWith('/profile') && !user) {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  return response;
}

// Example of how to bypass the auth callback in your middleware
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