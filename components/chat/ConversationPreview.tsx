"use client";

import {
  formatMessagePreview,
  formatMessageTime,
  type ConversationSummary,
} from "@/lib/chat-summaries";

interface ConversationPreviewProps {
  name: string;
  avatarUrl: string | null;
  summary?: ConversationSummary | null;
  subtitle?: React.ReactNode;
  isActive?: boolean;
  onClick: () => void;
  avatarSize?: "sm" | "md";
}

export function ConversationPreview({
  name,
  avatarUrl,
  summary,
  subtitle,
  isActive,
  onClick,
  avatarSize = "md",
}: ConversationPreviewProps) {
  const unread = summary?.unreadCount ?? 0;
  const preview = formatMessagePreview(
    summary?.lastMessage ?? null,
    summary?.lastMessageFromMe ?? false
  );
  const time = formatMessageTime(summary?.lastMessageAt ?? null);
  const avatarCls = avatarSize === "sm" ? "w-10 h-10" : "w-12 h-12";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left ${
        isActive ? "bg-blue-600/20 border border-blue-500/30" : "hover:bg-slate-800 border border-transparent"
      }`}
    >
      <div className={`relative ${avatarCls} shrink-0`}>
        <div
          className={`${avatarCls} rounded-full bg-slate-700 bg-cover bg-center border border-slate-600 overflow-hidden`}
          style={{ backgroundImage: avatarUrl ? `url(${avatarUrl})` : "none" }}
        >
          {!avatarUrl && (
            <span className={`w-full h-full flex items-center justify-center font-black text-zinc-500 ${avatarSize === "sm" ? "text-sm" : "text-base"}`}>
              {name?.[0] || "?"}
            </span>
          )}
        </div>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-slate-950 shadow">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-bold truncate ${isActive ? "text-blue-400" : unread > 0 ? "text-white" : "text-white"}`}>
            {name}
          </p>
          {time && (
            <span className={`text-[10px] shrink-0 tabular-nums ${unread > 0 ? "text-blue-400 font-bold" : "text-slate-500"}`}>
              {time}
            </span>
          )}
        </div>
        {subtitle ?? (
          <p className={`text-[11px] truncate mt-0.5 ${unread > 0 ? "text-zinc-200 font-semibold" : "text-slate-500"}`}>
            {preview}
          </p>
        )}
      </div>
    </button>
  );
}
