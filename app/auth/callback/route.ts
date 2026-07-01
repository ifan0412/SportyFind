// 檔案位置: app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // 驗證成功後預設將用戶導向 profile 頁面
  const next = searchParams.get('next') ?? '/profile' 

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    // 將 Google 給的 Code 交換成你的網站專屬 Session Cookie
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 成功！跳轉到目的頁面
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 如果驗證失敗或是沒有收到 code，把用戶踢回登入頁
  return NextResponse.redirect(`${origin}/auth`)
}