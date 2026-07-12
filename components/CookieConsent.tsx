"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { SITE } from "@/lib/site";

const CONSENT_KEY = "sportyfind-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ essential: true, acknowledgedAt: new Date().toISOString() }));
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie 通知"
      className="fixed inset-x-0 z-[200] p-4 sm:p-6 pointer-events-none bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:bottom-0"
    >
      <div className="max-w-4xl mx-auto pointer-events-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Cookie className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-white mb-1">我們使用 Cookie</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {SITE.name} 使用必要的 Cookie 以維持登入狀態與網站安全。詳情請參閱{" "}
              <Link href="/cookies" className="text-blue-400 hover:underline font-bold">
                Cookie 政策
              </Link>
              {" "}及{" "}
              <Link href="/privacy" className="text-blue-400 hover:underline font-bold">
                私隱政策
              </Link>
              。
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 sm:self-center">
          <Link
            href="/cookies"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-300 text-xs font-bold transition text-center"
          >
            了解更多
          </Link>
          <button
            type="button"
            onClick={accept}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition"
          >
            接受並繼續
          </button>
        </div>
      </div>
    </div>
  );
}
