import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/profile'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (error) {
              console.error("Cookie Error:", error)
            }
          },
        },
      }
    )
    
    // 💡 伺服器將 Google 密碼兌換成死死的 Cookie
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      // 如果兌換失敗，踢回登入頁並在網址列顯示錯誤
      return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`)
    }
  }

  // 兌換成功，推回目標頁面
  return NextResponse.redirect(`${origin}${next}`)
}