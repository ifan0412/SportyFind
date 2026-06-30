import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    // 解析 Base64
    const [user, pwd] = atob(authValue).split(':');

    // 這裡設定你的專屬帳號與密碼
    if (user === 'sporty' && pwd === '2026') {
      return NextResponse.next();
    }
  }

  // 如果沒輸入密碼或密碼錯誤，彈出瀏覽器內建的密碼輸入框
  return new NextResponse('需要輸入通關密碼才能進入 SportyFind', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

// 設定哪些路徑需要保護
export const config = {
  // 保護所有頁面，但排除 Next.js 靜態資源與圖片，避免網頁破圖
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};