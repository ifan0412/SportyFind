"use client";

import { Home, Pencil, Settings, Users, Shield, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROFILE_SETTINGS_TAB } from "@/lib/profile-settings";

export type ProfileHubTabId = "home" | "edit" | "friends" | "teams" | "events" | "settings";

export const PROFILE_HUB_TABS: {
  id: Exclude<ProfileHubTabId, "settings">;
  icon: typeof Home;
  label: string;
  /** Compact label for mobile icon row (≤4 chars where possible). */
  shortLabel: string;
}[] = [
  { id: "home", icon: Home, label: "主頁", shortLabel: "主頁" },
  { id: "edit", icon: Pencil, label: "編輯個人檔案", shortLabel: "個人檔案" },
  { id: "friends", icon: Users, label: "好友管理", shortLabel: "好友" },
  { id: "teams", icon: Shield, label: "我的團體", shortLabel: "我的團體" },
  { id: "events", icon: CalendarDays, label: "我的活動", shortLabel: "我的活動" },
];

interface ProfileHubTabNavProps {
  activeTab: ProfileHubTabId;
  onTab: (tab: ProfileHubTabId) => void;
}

export function ProfileHubTabNav({ activeTab, onTab }: ProfileHubTabNavProps) {
  const settingsActive = activeTab === "settings";
  const SettingsIcon = PROFILE_SETTINGS_TAB.icon;

  return (
    <div className="hidden lg:flex lg:sticky lg:top-20 z-40 flex-wrap items-center gap-2 py-2 mb-4 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/50 -mx-1 px-1">
      {PROFILE_HUB_TABS.map(({ id, icon: Icon, label }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border",
              active
                ? "bg-blue-600/15 border-blue-500/40 text-blue-400"
                : "bg-slate-950/70 border-slate-800 text-zinc-400 hover:text-white hover:border-slate-600"
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {label}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onTab("settings")}
        className={cn(
          "ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border",
          settingsActive
            ? "bg-blue-600/15 border-blue-500/40 text-blue-400"
            : "bg-slate-950/70 border-slate-800 text-zinc-400 hover:text-white hover:border-slate-600"
        )}
      >
        <SettingsIcon className="w-3.5 h-3.5 shrink-0" />
        {PROFILE_SETTINGS_TAB.label}
      </button>
    </div>
  );
}
