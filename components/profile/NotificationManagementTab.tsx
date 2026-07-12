"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BellOff,
  ChevronRight,
  ExternalLink,
  Loader2,
  Smartphone,
} from "lucide-react";
import {
  DEFAULT_PUSH_PREFERENCES,
  mergePushPreferences,
  PUSH_CATEGORY_LABELS,
  serializePushPreferences,
  type PushCategory,
  type PushPreferences,
} from "@/lib/push/preferences";
import {
  enablePushNotifications,
  getCurrentPushSubscription,
  sendTestPush,
  unsubscribeFromPush,
} from "@/lib/push/client";
import {
  getNotificationPermission,
  isIOS,
  isPushBlocked,
  needsIosHomeScreenFirst,
  openNotificationSettingsHint,
  supportsWebPush,
} from "@/lib/push/platform";
import { clearLocalPushReminderDismissed } from "@/lib/push/storage";

export function NotificationManagementTab() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<PushPreferences>(DEFAULT_PUSH_PREFERENCES);
  const [subscribed, setSubscribed] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const permission = useMemo(() => getNotificationPermission(), [subscribed, loading]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/push/preferences");
      if (res.ok) {
        const data = (await res.json()) as { preferences?: unknown };
        setPrefs(mergePushPreferences(data.preferences));
      }
      const sub = await getCurrentPushSubscription();
      setSubscribed(Boolean(sub));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const savePreferences = async (next: PushPreferences) => {
    setPrefs(next);
    setBusy(true);
    try {
      await fetch("/api/push/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serializePushPreferences(next)),
      });
    } finally {
      setBusy(false);
    }
  };

  const handleEnable = async () => {
    setBusy(true);
    setTestMessage(null);
    try {
      clearLocalPushReminderDismissed();
      const result = await enablePushNotifications();
      if (result.ok) {
        setSubscribed(true);
        setTestMessage("推送通知已開啟");
        return;
      }
      if (result.reason === "denied") {
        openNotificationSettingsHint();
        setTestMessage("請在系統設定中允許通知權限");
      } else if (needsIosHomeScreenFirst()) {
        setTestMessage("請先從主畫面快捷方式開啟 SportyFind");
      } else {
        setTestMessage("無法開啟推送，請稍後再試");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    setTestMessage(null);
    try {
      await unsubscribeFromPush();
      setSubscribed(false);
      setTestMessage("已關閉此裝置的推送訂閱");
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    setTestMessage(null);
    try {
      const result = await sendTestPush();
      setTestMessage(result.ok ? "測試通知已發送" : result.error ?? "發送失敗");
    } finally {
      setBusy(false);
    }
  };

  const handleResetReminder = async () => {
    clearLocalPushReminderDismissed();
    await fetch("/api/push/dismiss-reminder", { method: "DELETE" });
    setTestMessage("已重設提醒橫幅（重新整理後可能再次顯示）");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const iosInstallNeeded = needsIosHomeScreenFirst();

  return (
    <div className="animate-fadeIn space-y-5 max-w-2xl">
      <div>
        <h2 className="text-lg md:text-xl font-black text-white">通知管理</h2>
        <p className="text-xs text-zinc-500 mt-1">
          管理推送通知權限與通知類別偏好。
        </p>
      </div>

      {iosInstallNeeded && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-300">
            <Smartphone className="w-4 h-4" />
            <p className="text-sm font-black">iOS 需先加入主畫面</p>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            在 Safari 中點選分享 → 加入主畫面，再從主畫面圖示開啟 SportyFind，即可開啟推送通知。
          </p>
        </div>
      )}

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              {subscribed && permission === "granted" ? (
                <Bell className="w-4 h-4 text-blue-400" />
              ) : (
                <BellOff className="w-4 h-4 text-zinc-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-black text-white">推送通知狀態</p>
              <p className="text-xs text-zinc-500">
                {!supportsWebPush()
                  ? "此瀏覽器不支援推送"
                  : iosInstallNeeded
                    ? "請先加入主畫面快捷方式"
                    : permission === "granted" && subscribed
                      ? "已開啟"
                      : permission === "denied"
                        ? "已在系統設定中封鎖"
                        : "尚未開啟"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!subscribed || permission !== "granted" ? (
            <button
              type="button"
              onClick={handleEnable}
              disabled={busy || !supportsWebPush() || iosInstallNeeded}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black transition"
            >
              開啟推送
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleTest}
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-zinc-200 text-xs font-black transition"
              >
                發送測試通知
              </button>
              <button
                type="button"
                onClick={handleDisable}
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 text-zinc-400 hover:text-red-400 text-xs font-black transition"
              >
                關閉此裝置推送
              </button>
            </>
          )}
          {isPushBlocked() && (
            <button
              type="button"
              onClick={openNotificationSettingsHint}
              className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-zinc-300 text-xs font-black inline-flex items-center gap-1.5"
            >
              開啟系統設定
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {testMessage && (
          <p className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
            {testMessage}
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-white">通知類別</p>
            <p className="text-xs text-zinc-500">選擇要接收的推送類型（站內通知不受影響）</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.enabled}
              disabled={busy}
              onChange={(e) => savePreferences({ ...prefs, enabled: e.target.checked })}
              className="rounded border-slate-600"
            />
            總開關
          </label>
        </div>

        <div className="divide-y divide-slate-800/80">
          {(Object.keys(PUSH_CATEGORY_LABELS) as PushCategory[]).map((key) => {
            const meta = PUSH_CATEGORY_LABELS[key];
            return (
              <label
                key={key}
                className="flex items-center justify-between gap-3 py-3 cursor-pointer"
              >
                <div>
                  <p className="text-sm font-bold text-zinc-200">{meta.label}</p>
                  <p className="text-[11px] text-zinc-500">{meta.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.categories[key]}
                  disabled={busy || !prefs.enabled}
                  onChange={(e) =>
                    savePreferences({
                      ...prefs,
                      categories: { ...prefs.categories, [key]: e.target.checked },
                    })
                  }
                  className="rounded border-slate-600 shrink-0"
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-4">
        <p className="text-xs text-zinc-500 mb-2">站內通知中心</p>
        <Link
          href="/profile?tab=friends"
          className="flex items-center justify-between text-sm font-bold text-blue-400 hover:text-blue-300"
        >
          查看站內通知紀錄
          <ChevronRight className="w-4 h-4" />
        </Link>
        <button
          type="button"
          onClick={handleResetReminder}
          className="mt-3 text-[11px] text-zinc-600 hover:text-zinc-400 underline"
        >
          重設推送提醒橫幅
        </button>
      </div>
    </div>
  );
}
