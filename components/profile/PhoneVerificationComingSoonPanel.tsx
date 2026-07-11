"use client";

import { Phone } from "lucide-react";
import { ComingSoonOverlay } from "@/components/ui/ComingSoonOverlay";

export function PhoneVerificationComingSoonPanel() {
  return (
    <div id="phone-verify" className="space-y-3">
      <div>
        <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
          <Phone className="w-4 h-4" />
          手機號碼驗證
        </h3>
        <p className="text-[10px] md:text-xs text-zinc-500 mt-1">
          驗證手機後可於公開名片顯示「已驗證」標記，提升信任度。
        </p>
      </div>

      <ComingSoonOverlay
        title="即將推出"
        description="SMS 手機驗證功能正在準備中。目前請使用電郵驗證以保障帳戶真實性。"
      >
        <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/50 p-4 space-y-3">
          <div className="flex gap-2">
            <span className="inline-flex items-center px-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-zinc-400 font-bold">
              +852
            </span>
            <div className="flex-1 rounded-xl bg-slate-950/50 border border-slate-800 p-3 text-sm text-zinc-500">
              9123 4567
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/50 border border-slate-800 p-3 text-sm text-zinc-500 tracking-widest">
            輸入 6 位驗證碼
          </div>
          <div className="flex gap-2">
            <div className="flex-1 py-2.5 rounded-xl bg-emerald-600/40 text-emerald-200/60 text-xs font-black text-center">
              發送驗證碼
            </div>
          </div>
        </div>
      </ComingSoonOverlay>
    </div>
  );
}
