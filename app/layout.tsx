// 1. 所有的 import 集中在最上方
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar"; 
import { Footer } from "@/components/Footer";
import SupabaseProvider from "@/components/SupabaseProvider";
import "./globals.css";
import Providers from "./providers";
import { GlobalChat } from "@/components/GlobalChat";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";

// 2. 字體設定
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// 3. 視角設定 (合併了 PWA 主題深色背灰 #020617 與防止 iOS 表單輸入時自動縮放畫面)
export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// 4. Metadata 設定 (整合 SportyFind 品牌與完整 PWA 支援參數)
export const metadata: Metadata = {
  title: "SportyFind | 一站式全能運動約戰與社群網絡",
  description: "一站式運動社群約戰、配對與專業服務平台。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SportyFind",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans flex flex-col antialiased">
        <SupabaseProvider>
          
          {/* 💡 這裡才是重點！呼叫我們做好的強大 Navbar 元件 */}
          <Navbar />
          
          <main className="flex-1 bg-slate-950 py-2 pb-20 md:py-6 md:pb-6">
            <Providers>{children}</Providers>
          </main>

          <Footer />

          <MobileBottomNav />
          <GlobalChat />
          
        </SupabaseProvider>
      </body>
    </html>
  );
}