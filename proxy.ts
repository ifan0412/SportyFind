import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// 💡 關鍵修正：將函數名稱改為 `default` 導出或命名為 `proxy`，以符合 Next.js 16+ 的標準
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 確保更新 Token 後，確實把 Cookie 寫回給瀏覽器
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 這行會自動重新整理過期的 Session 並寫入 Cookie
  await supabase.auth.getUser()

  return response
}

// proxy.ts 的最下方
export const config = {
  matcher: [
    // 💡 關鍵修正：在排除名單中加入 auth/callback，讓 Google 驗證碼能安全通過！
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}