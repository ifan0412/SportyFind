"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { SharePayload } from "@/lib/share-payload";
import { shareEntityLabel } from "@/lib/share-payload";

const ACCENT: Record<SharePayload["type"], string> = {
  profile: "border-blue-500/30 bg-blue-950/20",
  team: "border-purple-500/30 bg-purple-950/20",
  event: "border-blue-500/30 bg-blue-950/20",
  coach_service: "border-orange-500/30 bg-orange-950/20",
  physio_service: "border-emerald-500/30 bg-emerald-950/20",
  content: "border-violet-500/30 bg-violet-950/20",
};

const BADGE: Record<SharePayload["type"], string> = {
  profile: "text-blue-400",
  team: "text-purple-400",
  event: "text-blue-400",
  coach_service: "text-orange-400",
  physio_service: "text-emerald-400",
  content: "text-violet-400",
};

export function SharePreviewCard({
  payload,
  intro,
}: {
  payload: SharePayload;
  intro?: string;
}) {
  return (
    <div className="space-y-2 max-w-xs">
      {intro ? <p className="text-sm whitespace-pre-wrap">{intro}</p> : null}
      <div className={`rounded-2xl border p-3 ${ACCENT[payload.type]}`}>
        <p className={`text-[10px] font-black uppercase tracking-wider mb-2 ${BADGE[payload.type]}`}>
          {shareEntityLabel(payload.type)}
        </p>
        <div className="flex gap-3 items-start">
          {payload.imageUrl ? (
            <div
              className="w-12 h-12 rounded-xl bg-slate-800 bg-cover bg-center shrink-0 border border-slate-700/80"
              style={{ backgroundImage: `url(${payload.imageUrl})` }}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white leading-snug line-clamp-2">{payload.title}</p>
            {payload.subtitle ? (
              <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{payload.subtitle}</p>
            ) : null}
          </div>
        </div>
        <Link
          href={payload.url}
          className="mt-3 inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-black text-white transition"
        >
          查看
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
