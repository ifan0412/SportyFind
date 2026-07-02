// 1. 所有的 import 集中在最上方 (可以把 Metadata 和 Viewport 寫在一起)
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar"; 
import SupabaseProvider from "@/components/SupabaseProvider";
import "./globals.css";
import Providers from "./providers";
import { GlobalChat } from "@/components/GlobalChat";

// 2. 字體設定
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// 3. 視角設定 (防止手機端自動放大)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// 4. Metadata 設定
export const metadata: Metadata = {
  title: "Pro Sports Network | 專業體育社群網路",
  description: "全港首創、專為運動員與教練打造的專業 LinkedIn 社交平台。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans flex flex-col antialiased">
        <SupabaseProvider>
          
          {/* 💡 這裡才是重點！呼叫我們做好的強大 Navbar 元件 */}
          <Navbar />
          
          <main className="flex-1 bg-slate-950 py-6">
            <Providers>{children}</Providers>
          </main>
          
          {/* ✅ 將浮動聊天視窗放在 main 之外，確保它跨頁面常駐，不會被切換頁面干擾 */}
          <GlobalChat />
          
        </SupabaseProvider>
      </body>
    </html>
  );
}