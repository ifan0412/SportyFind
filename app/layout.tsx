import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// 💡 移除舊的 Link 和 AuthStatus，因為我們全新的 Navbar 已經內建了這些功能
import { Navbar } from "@/components/Navbar"; 
import SupabaseProvider from "@/components/SupabaseProvider";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

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
          
        </SupabaseProvider>
      </body>
    </html>
  );
}