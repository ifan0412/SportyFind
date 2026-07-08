"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PROFILE_SETTINGS_ITEMS } from "@/lib/profile-settings";

interface ProfileSettingsListProps {
  onNavigate?: (href: string) => void;
  onItemSelect?: (id: string) => void;
  showHeader?: boolean;
}

export function ProfileSettingsList({
  onNavigate,
  onItemSelect,
  showHeader = true,
}: ProfileSettingsListProps) {
  return (
    <div className="animate-fadeIn space-y-3 max-w-2xl">
      {showHeader && (
        <div className="mb-2 px-0.5">
          <h2 className="text-lg md:text-xl font-black text-white">設定</h2>
          <p className="text-xs text-zinc-500 mt-1">管理帳戶與個人偏好。</p>
        </div>
      )}

      <div className="space-y-2">
        {PROFILE_SETTINGS_ITEMS.map(({ id, label, description, href, icon: Icon }) => {
          const inner = (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-blue-400" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-black text-white">{label}</p>
                  <p className="text-xs text-zinc-500 truncate">{description}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
            </>
          );

          if (onItemSelect) {
            return (
              <button
                key={id}
                type="button"
                onClick={() => onItemSelect(id)}
                className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-600 hover:bg-slate-900 transition text-left cursor-pointer"
              >
                {inner}
              </button>
            );
          }

          if (onNavigate) {
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(href)}
                className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-600 hover:bg-slate-900 transition text-left cursor-pointer"
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={id}
              href={href}
              className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-600 hover:bg-slate-900 transition"
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
