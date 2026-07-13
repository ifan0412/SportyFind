"use client";

import { RichBody } from "@/components/content/RichBody";

interface AthleteBioCardProps {
  html: string | null | undefined;
  emptyText?: string;
}

export function AthleteBioCard({
  html,
  emptyText = "目前尚未填寫運動員簡介。",
}: AthleteBioCardProps) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
      <h3 className="text-sm font-black text-blue-400 uppercase tracking-wider flex items-center gap-2 mb-2">
        <span>👤</span> 運動員 Bio
      </h3>
      <RichBody html={html} emptyText={emptyText} className="text-sm leading-relaxed" />
    </div>
  );
}
