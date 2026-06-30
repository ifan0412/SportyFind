import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import AuthStatus from "@/components/AuthStatus"; 
import "./globals.css";
import Providers from "./providers"; // <--- 新增這行

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pro Sports Network | 專業體育社群網路",
  description: "全港首創、專為運動員與教練打造的專業 LinkedIn 社交平台。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-pro-slate-950 text-slate-100 min-h-screen font-sans flex flex-col antialiased">
        <header className="sticky top-0 z-40 w-full border-b border-pro-slate-800 bg-pro-slate-900/80 backdrop-blur-md shadow-sm">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <Link href="/" className="bg-pro-blue-600 text-white font-black text-lg px-2.5 py-1 rounded-md tracking-tighter shadow-md hover:bg-pro-blue-500 transition">Pro</Link>
              <div className="relative w-full hidden md:block">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 text-sm">🔍</span>
                <input type="text" placeholder="搜尋運動員、頂尖教練、公開賽事..." className="w-full bg-pro-slate-800 border border-pro-slate-700 rounded-md py-1.5 pl-9 pr-4 text-xs text-slate-200 focus:outline-none" />
              </div>
            </div>
            <nav className="flex items-center gap-1 md:gap-4">
              <Link href="/" className="flex flex-col items-center justify-center text-slate-400 hover:text-white transition py-1 px-2"><span className="text-base">🏠</span><span className="text-[10px] font-medium mt-0.5 hidden md:block">首頁牆</span></Link>
              <Link href="/network" className="flex flex-col items-center justify-center text-slate-400 hover:text-white transition py-1 px-2"><span className="text-base">👥</span><span className="text-[10px] font-medium mt-0.5 hidden md:block">人脈網路</span></Link>
              <Link href="/coaches" className="flex flex-col items-center justify-center text-slate-400 hover:text-white transition py-1 px-2"><span className="text-base">🏆</span><span className="text-[10px] font-medium mt-0.5 hidden md:block">教練榜</span></Link>
              <div className="w-px h-6 bg-pro-slate-800 mx-1 hidden md:block" />
              <AuthStatus />
            </nav>
          </div>
        </header>
        {/* 在此處加上 Providers 包覆 */}
        <main className="flex-1 bg-pro-slate-950 py-6">
            <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}