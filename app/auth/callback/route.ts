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
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 成功！跳轉到目的頁面
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 如果驗證失敗或是沒有收到 code，把用戶踢回登入頁
  return NextResponse.redirect(`${origin}/auth`)
}