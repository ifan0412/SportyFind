import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link"; // 👑 引入 Next.js 核心導覽組件，杜絕網頁刷新
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pro Sports Network | 專業體育社群網路",
  description: "全港首創、專為運動員與教練打造的專業 LinkedIn 社交平台。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-black text-neutral-100 min-h-screen font-sans flex flex-col antialiased">
        
        {/* ==========================================
            全域 Sticky 頂部導覽列 (LinkedIn UI 風格)
           ========================================== */}
        <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
            
            {/* 左側：Logo 與搜尋框 */}
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <Link href="/" className="bg-blue-600 text-white font-black text-lg px-2.5 py-1 rounded-md tracking-tighter shadow-md hover:bg-blue-500 transition">
                Pro
              </Link>
              <div className="relative w-full hidden md:block">
                <span className="absolute inset-y-0 left-3 flex items-center text-neutral-500 text-sm">🔍</span>
                <input 
                  type="text" 
                  placeholder="搜尋運動員、頂尖教練、公開賽事..." 
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-md py-1.5 pl-9 pr-4 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-neutral-500"
                />
              </div>
            </div>

            {/* 右側：核心社交導覽 (全面升級為 Link 組件) */}
            <nav className="flex items-center gap-1 md:gap-4">
              {/* 修正：首頁牆導向 / */}
              <Link href="/" className="flex flex-col items-center justify-center text-neutral-400 hover:text-white transition group py-1 px-2">
                <span className="text-base">🏠</span>
                <span className="text-[10px] font-medium tracking-wide mt-0.5 hidden md:block text-neutral-400 group-hover:text-white">首頁牆</span>
              </Link>
              
              {/* 修正：人脈網路導向 /network */}
              <Link href="/network" className="flex flex-col items-center justify-center text-neutral-400 hover:text-white transition group py-1 px-2">
                <span className="text-base">👥</span>
                <span className="text-[10px] font-medium tracking-wide mt-0.5 hidden md:block text-neutral-400 group-hover:text-white">人脈網路</span>
              </Link>
              
              <Link href="/coaches" className="flex flex-col items-center justify-center text-neutral-400 hover:text-white transition group py-1 px-2">
                <span className="text-base">🏆</span>
                <span className="text-[10px] font-medium tracking-wide mt-0.5 hidden md:block text-neutral-400 group-hover:text-white">教練榜</span>
              </Link>
              
              <Link href="/events" className="flex flex-col items-center justify-center text-neutral-400 hover:text-white transition group py-1 px-2">
                <span className="text-base">📅</span>
                <span className="text-[10px] font-medium tracking-wide mt-0.5 hidden md:block text-neutral-400 group-hover:text-white">賽事活動</span>
              </Link>
              
              {/* 分隔線 */}
              <div className="w-px h-6 bg-neutral-800 mx-1 hidden md:block" />

              {/* 個人頭像 */}
              <Link href="/profile" className="flex flex-col items-center justify-center text-neutral-400 hover:text-white transition py-1 px-2">
                <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-bold text-blue-400 ring-1 ring-blue-500/30">
                  ME
                </div>
                <span className="text-[10px] font-medium tracking-wide mt-0.5 hidden md:block text-neutral-300">個人檔案 ▼</span>
              </Link>
            </nav>

          </div>
        </header>

        {/* 頁面內容投放區 */}
        <main className="flex-1 bg-black py-6">
          {children}
        </main>

      </body>
    </html>
  );
}