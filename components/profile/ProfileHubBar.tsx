"use client";

import Link from "next/link";
import { useRef } from "react";
import { Eye, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { profileLink } from "@/lib/profile-links";
import { PROFILE_HUB_TABS, type ProfileHubTabId } from "@/components/profile/ProfileHubTabNav";
import { useAppChromeStickyTop } from "@/lib/use-app-chrome-sticky-top";

interface ProfileHubBarProps {
  activeTab: ProfileHubTabId;
  userId?: string;
  userHandle?: string | null;
  onTab: (tab: ProfileHubTabId) => void;
  onShare: () => void;
}

function topIconBtn() {
  return "w-9 h-9 rounded-xl flex items-center justify-center bg-slate-950/80 border border-slate-700/80 text-zinc-400 hover:text-white hover:border-slate-500 transition shrink-0";
}

export function ProfileHubTopActions({
  userId,
  userHandle,
  onShare,
}: Pick<ProfileHubBarProps, "userId" | "userHandle" | "onShare">) {
  return (
    <div className="flex items-center justify-between mb-4">
      {userId ? (
        <Link href={profileLink({ id: userId, handle: userHandle })} className={topIconBtn()} title="預覽公開名片" aria-label="預覽公開名片">
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

/** Text-only underline tabs — mobile / tablet */
export function ProfileHubTextTabRow({ activeTab, onTab }: Pick<ProfileHubBarProps, "activeTab" | "onTab">) {
  return (
    <div className="flex w-full min-w-0 border-b border-slate-800">
      {PROFILE_HUB_TABS.map(({ id, label, shortLabel }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            title={label}
            aria-label={label}
            className={cn(
              "flex-1 min-w-0 px-0.5 py-3 text-center font-bold leading-tight transition-colors border-b-2 -mb-px whitespace-nowrap text-xs sm:text-sm",
              active
                ? "text-white border-blue-500"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            )}
          >
            {shortLabel}
          </button>
        );
      })}
    </div>
  );
}

/** Sticky hub bar below navbar — outside profile card */
export function ProfileHubMobileBar({ activeTab, onTab }: Pick<ProfileHubBarProps, "activeTab" | "onTab">) {
  const ref = useRef<HTMLDivElement>(null);
  useAppChromeStickyTop(ref);

  return (
    <div
      ref={ref}
      className="lg:hidden sticky z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-1 bg-slate-950/95 backdrop-blur-md shadow-sm"
    >
      <ProfileHubTextTabRow activeTab={activeTab} onTab={onTab} />
    </div>
  );
}

export function ProfileHubBar(props: ProfileHubBarProps) {
  return (
    <div className="space-y-4">
      <ProfileHubTopActions userId={props.userId} userHandle={props.userHandle} onShare={props.onShare} />
      <ProfileHubMobileBar activeTab={props.activeTab} onTab={props.onTab} />
    </div>
  );
}

export type { ProfileHubTabId };
