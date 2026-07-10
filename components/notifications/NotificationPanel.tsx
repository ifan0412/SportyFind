"use client";

import { X } from "lucide-react";
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
    <div className={`overflow-y-auto divide-y divide-slate-800/60 ${className}`}>
      {notifications.length === 0 ? (
        <div className="py-10 text-center text-zinc-500 text-sm font-bold">暫無通知</div>
      ) : (
        notifications.map((notif) => (
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
                  {notif.type === "friend_request" && (
                    <>
                      <span className="text-white">{notif.sender?.full_name ?? "某人"}</span>{" "}
                      想與你成為好友
                    </>
                  )}
                  {notif.type === "friend_accepted" && (
                    <>
                      <span className="text-white">{notif.sender?.full_name ?? "某人"}</span>{" "}
                      接受了你的好友請求 🎉
                    </>
                  )}
                  {notif.type === "team_join_request" && (
                    <>
                      <span className="text-white">{notif.sender?.full_name ?? "某人"}</span>{" "}
                      申請加入您的球隊
                    </>
                  )}
                  {notif.type === "team_request_accepted" && (
                    <>
                      <span className="text-white">系統通知</span>：您的加入申請已被接受 🎉
                    </>
                  )}
                  {notif.type === "team_request_rejected" && (
                    <>
                      <span className="text-white">系統通知</span>：您的加入申請已被拒絕
                    </>
                  )}
                  {notif.type === "event_registration" && (
                    <>
                      <span className="text-white">{notif.sender?.full_name ?? "某人"}</span>{" "}
                      報名了您主辦的活動
                    </>
                  )}
                  {notif.type === "event_waitlist_signup" && (
                    <>
                      <span className="text-white">{notif.sender?.full_name ?? "某人"}</span>{" "}
                      加入了您主辦活動的候補名單
                    </>
                  )}
                  {notif.type === "event_waitlist_promoted" && (
                    <>
                      <span className="text-white">系統通知</span>：您已從候補名單升級，成功加入活動 🎉
                    </>
                  )}
                  {notif.type === "event_kicked" && (
                    <>
                      <span className="text-white">系統通知</span>：您已被主辦方移除出某活動的參賽名單
                    </>
                  )}
                  {notif.type === "event_accepted" && (
                    <>
                      <span className="text-white">系統通知</span>：您的主辦活動參賽申請已獲批准 🎉
                    </>
                  )}
                  {notif.type === "event_joined" && (
                    <>
                      <span className="text-white">系統通知</span>：您已成功加入活動 🎉
                    </>
                  )}
                  {notif.type === "coach_enquiry" && (
                    <>
                      <span className="text-white">{notif.sender?.full_name ?? "某學員"}</span>{" "}
                      向您發送了一份課程諮詢單 📬
                    </>
                  )}
                  {notif.type === "coach_review" && (
                    <>
                      <span className="text-white">{notif.sender?.full_name ?? "某學員"}</span>{" "}
                      為您的課程留下了一則評價 ⭐
                    </>
                  )}
                  {notif.type === "physio_enquiry" && (
                    <>
                      <span className="text-white">{notif.sender?.full_name ?? "某運動員"}</span>{" "}
                      向您發送了一份診療諮詢單 📬
                    </>
                  )}
                  {notif.type === "physio_review" && (
                    <>
                      <span className="text-white">{notif.sender?.full_name ?? "某運動員"}</span>{" "}
                      為您的診療項目留下了一則評價 ⭐
                    </>
                  )}
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
        ))
      )}
    </div>
  );
}
