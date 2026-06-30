import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // 設定登入成功後的預設導向頁面，預設為 /profile
  const next = searchParams.get('next') ?? '/profile';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (error) {
              // 處理 Cookie 寫入錯誤
            }
          },
        },
      }
    );
    
    // 讓伺服器端直接用 Code 換取 Session，並寫入死死的 HttpOnly Cookie 中
    await supabase.auth.exchangeCodeForSession(code);
  }

  // 驗證完成，導向目標頁面
  return NextResponse.redirect(`${origin}${next}`);
}