"use client";

import Link from "next/link";
import { Eye, Pencil, Settings, Users, Shield, CalendarDays, ArrowUpRight } from "lucide-react";
import type { ProfileHubTabId } from "@/components/profile/ProfileHubBar";

const HUB_ITEMS: {
  id: Exclude<ProfileHubTabId, "home">;
  icon: typeof Pencil;
  label: string;
  desc: string;
  accent: string;
}[] = [
  {
    id: "edit",
    icon: Pencil,
    label: "編輯個人檔案",
    desc: "更新基本資料、身分與公開狀態",
    accent: "hover:border-blue-500/40 hover:bg-blue-500/5 group-hover:text-blue-400",
  },
  {
    id: "settings",
    icon: Settings,
    label: "設定",
    desc: "帳戶、密碼與登入方式",
    accent: "hover:border-slate-500/40 hover:bg-slate-500/5 group-hover:text-zinc-200",
  },
  {
    id: "friends",
    icon: Users,
    label: "好友管理",
    desc: "好友請求、名單與聯絡",
    accent: "hover:border-blue-500/40 hover:bg-blue-500/5 group-hover:text-blue-400",
  },
  {
    id: "teams",
    icon: Shield,
    label: "我的團隊",
    desc: "建立或管理你加入的隊伍",
    accent: "hover:border-amber-500/40 hover:bg-amber-500/5 group-hover:text-amber-400",
  },
  {
    id: "events",
    icon: CalendarDays,
    label: "我的賽事",
    desc: "參加與主辦的活動行程",
    accent: "hover:border-red-500/40 hover:bg-red-500/5 group-hover:text-red-400",
  },
];

interface ProfileHubWelcomeProps {
  userId?: string;
  compact?: boolean;
  onTab: (tab: ProfileHubTabId) => void;
}

export function ProfileHubWelcome({ userId, compact = false, onTab }: ProfileHubWelcomeProps) {
  if (compact) {
    return (
      <div className="animate-fadeIn">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {userId && (
            <Link
              href={`/p/${userId}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 text-xs font-black hover:bg-blue-600 hover:text-white transition"
            >
              <Eye className="w-3.5 h-3.5" />
              預覽公開名片
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
          {HUB_ITEMS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTab(id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-zinc-400 text-xs font-bold hover:text-white hover:border-slate-600 transition"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 md:p-8">
        <h2 className="text-xl md:text-2xl font-black text-white mb-2">個人檔案總覽</h2>
        <p className="text-sm text-zinc-500 mb-6">
          使用左側圖示或下方快速入口，管理你的檔案、好友、團隊與賽事。
        </p>

        {userId && (
          <Link
            href={`/p/${userId}`}
            className="inline-flex items-center gap-2 mb-8 px-5 py-3 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 text-sm font-black hover:bg-blue-600 hover:text-white transition"
          >
            <Eye className="w-4 h-4" />
            預覽公開名片
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {HUB_ITEMS.map(({ id, icon: Icon, label, desc, accent }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTab(id)}
              className={`group flex items-start gap-4 text-left p-4 rounded-2xl bg-slate-950/50 border border-slate-800 transition ${accent}`}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 border border-slate-700 text-zinc-400 group-hover:border-current transition">
                <Icon className="w-5 h-5" />
              </span>
              <span className="min-w-0 pt-0.5">
                <span className="block text-sm font-black text-white group-hover:inherit transition">{label}</span>
                <span className="block text-xs text-zinc-500 mt-0.5 leading-relaxed">{desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
