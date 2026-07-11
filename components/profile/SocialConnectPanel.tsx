"use client";

import { Link2 } from "lucide-react";
import type { SocialContext } from "@/lib/verification";
import { ComingSoonOverlay } from "@/components/ui/ComingSoonOverlay";

const PLACEHOLDER_PLATFORMS = [
  { icon: "📷", label: "Instagram", ring: "border-pink-500/30" },
  { icon: "📘", label: "Facebook", ring: "border-blue-500/30" },
  { icon: "🧵", label: "Threads", ring: "border-zinc-500/30" },
] as const;

interface SocialConnectPanelProps {
  userId?: string;
  context?: SocialContext;
  accent?: "blue" | "orange" | "emerald";
  className?: string;
  onConnectionChange?: () => void;
}

export function SocialConnectPanel({
  accent = "blue",
  className = "",
}: SocialConnectPanelProps) {
  const accentTitle =
    accent === "emerald" ? "text-emerald-400" : accent === "orange" ? "text-orange-400" : "text-blue-400";

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <h3 className={`text-sm font-black ${accentTitle} flex items-center gap-2`}>
          <Link2 className="w-4 h-4" />
          社群媒體連結
        </h3>
        <p className="text-[10px] md:text-xs text-zinc-500 mt-1">
          一鍵連結 Instagram / Facebook / Threads，驗證帳戶所有權並顯示於公開名片。
        </p>
      </div>

      <ComingSoonOverlay
        title="即將推出"
        description="Meta 帳戶連結功能正在準備中。目前請使用電郵及手機驗證以保障帳戶真實性。"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-1">
          {PLACEHOLDER_PLATFORMS.map((platform) => (
            <div
              key={platform.label}
              className={`rounded-2xl border bg-slate-950/50 p-4 ${platform.ring}`}
            >
              <span className="text-2xl block mb-2">{platform.icon}</span>
              <p className="text-sm font-black text-white">連結 {platform.label}</p>
              <p className="text-[10px] text-zinc-500 mt-1">以 Meta 帳戶驗證</p>
            </div>
          ))}
        </div>
      </ComingSoonOverlay>
    </div>
  );
}
