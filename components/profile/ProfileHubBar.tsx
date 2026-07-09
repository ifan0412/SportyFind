"use client";

import Link from "next/link";
import { Eye, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROFILE_HUB_TABS, type ProfileHubTabId } from "@/components/profile/ProfileHubTabNav";

interface ProfileHubBarProps {
  activeTab: ProfileHubTabId;
  userId?: string;
  onTab: (tab: ProfileHubTabId) => void;
  onShare: () => void;
}

function hubIconBtn(active: boolean, flat = false) {
  const base = flat ? "rounded-lg" : "rounded-xl";
  return cn(
    "flex flex-col items-center justify-center min-w-0 transition border",
    base,
    active
      ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_12px_rgba(37,99,235,0.35)]"
      : "bg-slate-950/70 border-slate-800 text-zinc-400 hover:text-white hover:border-slate-600"
  );
}

function topIconBtn() {
  return "w-9 h-9 rounded-xl flex items-center justify-center bg-slate-950/80 border border-slate-700/80 text-zinc-400 hover:text-white hover:border-slate-500 transition shrink-0";
}

export function ProfileHubTopActions({ userId, onShare }: Pick<ProfileHubBarProps, "userId" | "onShare">) {
  return (
    <div className="flex items-center justify-between mb-4">
      {userId ? (
        <Link href={`/p/${userId}`} className={topIconBtn()} title="預覽公開名片" aria-label="預覽公開名片">
          <Eye className="w-4 h-4" />
        </Link>
      ) : (
        <span className={topIconBtn()} aria-hidden>
          <Eye className="w-4 h-4 opacity-30" />
        </span>
      )}
      <button type="button" onClick={onShare} className={topIconBtn()} title="分享連結" aria-label="分享連結">
        <Share2 className="w-4 h-4" />
      </button>
    </div>
  );
}

/** Flat sticky row — mobile / tablet only (render inside ProfileHubMobileBar) */
export function ProfileHubIconRow({ activeTab, onTab }: Pick<ProfileHubBarProps, "activeTab" | "onTab">) {
  return (
    <div className="grid grid-cols-5 gap-0.5 sm:gap-1 w-full min-w-0">
      {PROFILE_HUB_TABS.map(({ id, icon: Icon, label, shortLabel }) => (
        <button
          key={id}
          type="button"
          onClick={() => onTab(id)}
          className={cn(hubIconBtn(activeTab === id, true), "h-11 sm:h-12 w-full py-1 gap-0.5")}
          title={label}
          aria-label={label}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
          <span className="text-[8px] sm:text-[9px] font-bold leading-none truncate max-w-full px-0.5">
            {shortLabel}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Sticky hub bar below navbar — outside profile card */
export function ProfileHubMobileBar({ activeTab, onTab }: Pick<ProfileHubBarProps, "activeTab" | "onTab">) {
  return (
    <div className="lg:hidden sticky top-14 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-1.5 bg-slate-950/95 backdrop-blur-md shadow-sm">
      <ProfileHubIconRow activeTab={activeTab} onTab={onTab} />
    </div>
  );
}

export function ProfileHubBar(props: ProfileHubBarProps) {
  return (
    <div className="space-y-4">
      <ProfileHubTopActions userId={props.userId} onShare={props.onShare} />
      <ProfileHubMobileBar activeTab={props.activeTab} onTab={props.onTab} />
    </div>
  );
}

export type { ProfileHubTabId };
