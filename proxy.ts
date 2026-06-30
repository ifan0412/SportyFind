import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  // 1. 處理 Basic Auth 密碼鎖 (維持不變)
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

  // 2. 處理 Supabase 身分驗證
  let response = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 3. 邏輯調整：只有 /profile 需要強迫登入
  const isProfilePage = req.nextUrl.pathname.startsWith('/profile');
  
  if (isProfilePage && !user) {
    // 未登入且想去 profile，強制轉跳到 auth
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};