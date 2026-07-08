"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { ProfileSettingsList } from "@/components/profile/ProfileSettingsList";
import { AccountManagementTab } from "@/components/profile/AccountManagementTab";

type SettingsView = "list" | "account";

interface MobileSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  user: User;
}

export function MobileSettingsSheet({ open, onClose, user }: MobileSettingsSheetProps) {
  const [view, setView] = useState<SettingsView>("list");

  useEffect(() => {
    if (!open) setView("list");
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] md:hidden flex flex-col bg-slate-950">
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
        {view === "list" ? (
          <h1 className="text-sm font-black text-white">設定</h1>
        ) : (
          <button
            type="button"
            onClick={() => setView("list")}
            className="flex items-center gap-1.5 text-sm font-bold text-zinc-400 hover:text-white transition"
          >
            <ChevronLeft className="size-4" />
            設定
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉設定"
          className="flex items-center justify-center w-9 h-9 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {view === "list" ? (
          <ProfileSettingsList
            showHeader={false}
            onItemSelect={(id) => {
              if (id === "account") setView("account");
            }}
          />
        ) : (
          <AccountManagementTab userEmail={user.email} identities={user.identities} />
        )}
      </div>
    </div>
  );
}
