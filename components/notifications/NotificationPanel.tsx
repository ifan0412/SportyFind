"use client";

import { X } from "lucide-react";
import { getNotificationDisplayMessage } from "@/lib/notifications/display-copy";
import type { Notification } from "./notification-types";

interface NotificationPanelProps {
  notifications: Notification[];
  onNotifClick: (notif: Notification) => void;
  onAccept: (notif: Notification) => Promise<void>;
  onReject: (notif: Notification) => Promise<void>;
  onDismiss: (e: React.MouseEvent, notifId: string) => Promise<void>;
  isProcessing: (id: string) => boolean;
  className?: string;
}

export function NotificationPanel({
  notifications,
  onNotifClick,
  onAccept,
  onReject,
  onDismiss,
  isProcessing,
  className = "",
}: NotificationPanelProps) {
  return (
    <div className={`overflow-y-auto overscroll-contain divide-y divide-slate-800/60 ${className}`}>
      {notifications.length === 0 ? (
        <div className="py-10 text-center text-zinc-500 text-sm font-bold">暫無通知</div>
      ) : (
        notifications.map((notif) => {
          const copy = getNotificationDisplayMessage(notif);
          const message = copy.message?.trim() || "您有一則新通知";

          return (
            <div
              key={notif.id}
              onClick={() => onNotifClick(notif)}
              className={`relative p-4 transition-colors cursor-pointer hover:bg-slate-800/50 ${!notif.is_read ? "bg-blue-500/5" : ""}`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(e, notif.id);
                }}
                className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-white hover:bg-slate-700 rounded-full transition-colors z-10"
                title="移除通知"
              >
                <X className="size-3" />
              </button>

              <div className="flex items-center gap-3 mb-3 pr-4">
                <div
                  className="w-9 h-9 rounded-full bg-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{
                    backgroundImage: notif.sender?.avatar_url
                      ? `url(${notif.sender.avatar_url})`
                      : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {!notif.sender?.avatar_url && (
                    <span className="text-xs font-black text-zinc-500">
                      {notif.sender?.full_name?.[0] ?? "?"}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-200 font-bold leading-snug">
                    {copy.highlight ? (
                      <span className="text-white">{copy.highlight}</span>
                    ) : null}
                    {message}
                  </p>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(notif.created_at).toLocaleString("zh-HK", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {!notif.is_read && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                )}
              </div>

              {notif.type === "friend_request" && notif.friendship_id && (
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAccept(notif);
                    }}
                    disabled={isProcessing(notif.id)}
                    className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black transition z-10 relative"
                  >
                    {isProcessing(notif.id) ? "處理中..." : "✓ 接受"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject(notif);
                    }}
                    disabled={isProcessing(notif.id)}
                    className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 hover:text-red-400 text-xs font-black transition z-10 relative"
                  >
                    {isProcessing(notif.id) ? "處理中..." : "✕ 拒絕"}
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
