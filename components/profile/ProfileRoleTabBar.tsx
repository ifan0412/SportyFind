"use client";

import { AppChromeSticky } from "@/components/layout/AppChromeSticky";
import type { ProfileRole } from "@/components/profile/ProfileRolePreview";

const ROLE_TAB_TEXT =
  "text-xs sm:text-sm font-black leading-tight whitespace-nowrap text-center";

function roleButtonClass(active: boolean, variant: "athlete" | "coach" | "physio") {
  const base =
    "relative flex-1 flex items-center justify-center min-w-0 py-3 px-2 rounded-xl transition-all duration-300 cursor-pointer";

  if (!active) {
    if (variant === "coach") return `${base} text-zinc-500 hover:text-orange-400 hover:bg-slate-800/50`;
    if (variant === "physio") return `${base} text-zinc-500 hover:text-green-400 hover:bg-slate-800/50`;
    return `${base} text-zinc-500 hover:text-blue-400 hover:bg-slate-800/50`;
  }

  if (variant === "coach") return `${base} bg-orange-500 text-black shadow-lg scale-[1.02]`;
  if (variant === "physio") return `${base} bg-green-500 text-black shadow-lg scale-[1.02]`;
  return `${base} bg-blue-600 text-white shadow-lg scale-[1.02]`;
}

interface ProfileRoleTabBarProps {
  activeRole: ProfileRole;
  onRoleChange: (role: ProfileRole) => void;
  showPlayer: boolean;
  showCoach: boolean;
  showPhysio: boolean;
  hasUncontactedCoachEnquiries?: boolean;
  hasUncontactedPhysioEnquiries?: boolean;
  sticky?: boolean;
  className?: string;
}

export function ProfileRoleTabBar({
  activeRole,
  onRoleChange,
  showPlayer,
  showCoach,
  showPhysio,
  hasUncontactedCoachEnquiries = false,
  hasUncontactedPhysioEnquiries = false,
  sticky = true,
  className,
}: ProfileRoleTabBarProps) {
  const bar = (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-1 rounded-2xl flex w-full shadow-sm overflow-x-auto [&::-webkit-scrollbar]:hidden">
      {showPlayer && (
        <button
          type="button"
          onClick={() => onRoleChange("athlete")}
          className={roleButtonClass(activeRole === "athlete", "athlete")}
        >
          <span className={ROLE_TAB_TEXT}>運動員簡歷</span>
        </button>
      )}
      {showCoach && (
        <button
          type="button"
          onClick={() => onRoleChange("coach")}
          className={roleButtonClass(activeRole === "coach", "coach")}
        >
          {hasUncontactedCoachEnquiries && (
            <span
              className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-slate-900 pointer-events-none"
              aria-hidden
            />
          )}
          <span className={ROLE_TAB_TEXT}>教練簡介</span>
        </button>
      )}
      {showPhysio && (
        <button
          type="button"
          onClick={() => onRoleChange("physio")}
          className={roleButtonClass(activeRole === "physio", "physio")}
        >
          {hasUncontactedPhysioEnquiries && (
            <span
              className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-slate-900 pointer-events-none"
              aria-hidden
            />
          )}
          <span className={ROLE_TAB_TEXT}>運動/物理治療</span>
        </button>
      )}
    </div>
  );

  if (!sticky) return bar;

  return (
    <AppChromeSticky className={className ?? "mb-4 lg:static lg:z-auto"} desktopTopClass="lg:top-auto">
      {bar}
    </AppChromeSticky>
  );
}
