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
import { MobileLoadingProvider } from "@/components/mobile/MobileLoadingProvider";
import { PushNotificationProvider } from "@/components/push/PushNotificationProvider";
import { mobileViewport } from "@/lib/viewport";

// 2. 字體設定
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// 3. Viewport — full mobile scale site-wide; homepage blocks scale via CSS only.
export async function generateViewport(): Promise<Viewport> {
  return mobileViewport(1);
}

// 4. Metadata 設定 (整合 SportyFind 品牌與完整 PWA 支援參數)
export const metadata: Metadata = {
  title: "SportyFind | 一站式運動約戰與社群網絡",
  description: "一站式運動社群約戰、配對與專業服務平台。",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SportyFind",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans flex flex-col antialiased">
        <SupabaseProvider>
          <MobileLoadingProvider>
            <Navbar />

            <main className="flex-1 bg-slate-950 py-2 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:py-6 md:pb-6">
              <Providers>{children}</Providers>
            </main>

            <Footer />

            <MobileBottomNav />
            <PushNotificationProvider />
            <GlobalChat />
          </MobileLoadingProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}