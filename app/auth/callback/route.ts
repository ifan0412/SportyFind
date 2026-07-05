import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // 驗證成功後預設導向 profile，你也可以根據專案需求更改
  const next = searchParams.get('next') ?? '/profile' 

  if (code) {
    // 💡 關鍵修正：在這裡加上 await，等待 Cookie 解析完成
    const cookieStore = await cookies() 
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // 在 Server Component 內部呼叫時可能會發生的預期內錯誤，安全忽略
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // 在 Server Component 內部呼叫時可能會發生的預期內錯誤，安全忽略
            }
          },
        },
      }
    )
    
    // 交換 Session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session?.user) {
      // 🔥 新增：檢查該使用者是否已經確認過角色身分（Player / Coach / Physio）。
      // 透過我們自己的表單註冊的使用者，在建立 profiles 時已經標記 roles_confirmed = true；
      // 透過 Google OAuth 首次登入的使用者則會是 false，需要導向角色選擇畫面補齊資訊。
      const { data: profile } = await supabase
        .from('profiles')
        .select('roles_confirmed')
        .eq('id', data.session.user.id)
        .single()

      if (profile && profile.roles_confirmed === false) {
        return NextResponse.redirect(`${origin}/onboarding/roles?next=${encodeURIComponent(next)}`)
      }

      // 成功！跳轉到目的頁面
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 如果驗證失敗或是沒有收到 code，把用戶踢回登入頁
  return NextResponse.redirect(`${origin}/auth`)
}