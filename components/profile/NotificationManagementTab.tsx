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
  resubscribePushNotifications,
  sendTestPush,
  showLocalTestNotification,
  unsubscribeFromPush,
} from "@/lib/push/client";
import {
  getNotificationPermission,
  hasPushManager,
  isIOS,
  isPushBlocked,
  isStandalonePwa,
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
  const [serverSubscriptionCount, setServerSubscriptionCount] = useState(0);
  const [serverStatus, setServerStatus] = useState<{
    vapidPrivateConfigured: boolean;
    serviceRoleConfigured: boolean;
    migrationRequired: boolean;
    vapidConfigurationError?: string | null;
    dispatchConfigured?: boolean;
    dispatchMigrationRequired?: boolean;
    webhookSecretConfigured?: boolean;
  } | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const permission = useMemo(() => getNotificationPermission(), [subscribed, loading]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [prefsRes, statusRes] = await Promise.all([
        fetch("/api/push/preferences"),
        fetch("/api/push/status"),
      ]);
      if (prefsRes.ok) {
        const data = (await prefsRes.json()) as { preferences?: unknown; subscriptionCount?: number };
        setPrefs(mergePushPreferences(data.preferences));
        setServerSubscriptionCount(data.subscriptionCount ?? 0);
      }
      if (statusRes.ok) {
        const status = (await statusRes.json()) as {
          vapidPrivateConfigured?: boolean;
          serviceRoleConfigured?: boolean;
          migrationRequired?: boolean;
          vapidConfigurationError?: string | null;
          subscriptionCount?: number;
          dispatchConfigured?: boolean;
          dispatchMigrationRequired?: boolean;
          webhookSecretConfigured?: boolean;
        };
        setServerStatus({
          vapidPrivateConfigured: Boolean(status.vapidPrivateConfigured),
          serviceRoleConfigured: Boolean(status.serviceRoleConfigured),
          migrationRequired: Boolean(status.migrationRequired),
          vapidConfigurationError: status.vapidConfigurationError ?? null,
          dispatchConfigured: Boolean(status.dispatchConfigured),
          dispatchMigrationRequired: Boolean(status.dispatchMigrationRequired),
          webhookSecretConfigured: Boolean(status.webhookSecretConfigured),
        });
        if (typeof status.subscriptionCount === "number") {
          setServerSubscriptionCount(status.subscriptionCount);
        }
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
        await refresh();
        setTestMessage("推送通知已開啟");
        return;
      }
      if (result.reason === "denied") {
        openNotificationSettingsHint();
        setTestMessage("請在系統設定中允許通知權限");
      } else if (result.reason === "save_failed") {
        setTestMessage("無法儲存訂閱，請確認 Supabase migration 056 已執行");
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
      const local = await showLocalTestNotification();
      const result = await sendTestPush();
      if (result.ok) {
        setTestMessage(
          local.ok
            ? `本機與伺服器測試皆成功（${result.sent ?? 1} 個裝置）。測試通知直接發送；好友請求、訊息等需 Supabase push_dispatch_config 已設定才會自動推送。`
            : `伺服器推送已發送；本機：${local.error ?? "略過"}`
        );
      } else if (local.ok) {
        setTestMessage(
          `本機通知正常，但伺服器推送失敗：${result.error ?? "未知錯誤"}`
        );
      } else {
        setTestMessage(
          `本機：${local.error ?? "失敗"}；伺服器：${result.error ?? "失敗"}`
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleResubscribe = async () => {
    setBusy(true);
    setTestMessage(null);
    try {
      const result = await resubscribePushNotifications();
      if (result.ok) {
        await refresh();
        setTestMessage("已重新訂閱此裝置");
      } else {
        setTestMessage(result.error ?? "重新訂閱失敗");
      }
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
  const localSubscribed = subscribed && permission === "granted";
  const serverSynced = serverSubscriptionCount > 0;

  return (
    <div className="animate-fadeIn space-y-5 max-w-2xl">
      <div>
        <h2 className="text-lg md:text-xl font-black text-white">通知管理</h2>
        <p className="text-xs text-zinc-500 mt-1">
          管理推送通知權限與通知類別偏好。
        </p>
      </div>

      {serverStatus?.dispatchMigrationRequired && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-xs text-red-300 leading-relaxed">
            資料庫缺少 push_dispatch_config。請在 Supabase 執行 migration 057。
          </p>
        </div>
      )}

      {serverStatus &&
        !serverStatus.dispatchMigrationRequired &&
        !serverStatus.dispatchConfigured && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-xs text-amber-200 leading-relaxed">
              測試通知可成功，但好友請求、訊息等自動推送尚未啟用。請在 Supabase SQL Editor 設定
              push_dispatch_config（migration 057 底部說明），並確認 Vercel 已設定
              PUSH_WEBHOOK_SECRET 且與資料庫 webhook_secret 相同。
            </p>
          </div>
        )}

      {serverStatus &&
        serverStatus.dispatchConfigured &&
        !serverStatus.webhookSecretConfigured && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-xs text-amber-200 leading-relaxed">
              資料庫已設定推送 webhook，但 Vercel 未設定 PUSH_WEBHOOK_SECRET。
            </p>
          </div>
        )}

      {serverStatus?.migrationRequired && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-xs text-red-300 leading-relaxed">
            資料庫缺少 push_subscriptions 資料表。請在 Supabase 執行 migration 056。
          </p>
        </div>
      )}

      {serverStatus?.vapidConfigurationError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-xs text-red-300 leading-relaxed">{serverStatus.vapidConfigurationError}</p>
        </div>
      )}

      {serverStatus && !serverStatus.migrationRequired && !serverStatus.vapidPrivateConfigured && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-xs text-red-300 leading-relaxed">
            Vercel 未設定 VAPID_PRIVATE_KEY（私鑰）。請與 NEXT_PUBLIC_VAPID_PUBLIC_KEY 配對後重新部署。
          </p>
        </div>
      )}

      {serverStatus && !serverStatus.serviceRoleConfigured && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-xs text-red-300 leading-relaxed">
            Vercel 未設定 SUPABASE_SERVICE_ROLE_KEY，伺服器無法發送推送。
          </p>
        </div>
      )}

      {iosInstallNeeded && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-300">
            <Smartphone className="w-4 h-4" />
            <p className="text-sm font-black">iOS 需從主畫面圖示開啟</p>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Safari 分頁內無法接收推送。請刪除舊快捷方式 → Safari 分享 → 加入主畫面 → 從主畫面圖示開啟 → 再開啟推送。
          </p>
        </div>
      )}

      {isIOS() && isStandalonePwa() && !hasPushManager() && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-xs text-red-300 leading-relaxed">
            此主畫面快捷方式可能是在修正前建立。請刪除主畫面圖示、清除 Safari 網站資料後重新加入主畫面。
          </p>
        </div>
      )}

      {localSubscribed && !serverSynced && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-xs text-amber-200 leading-relaxed">
            此裝置已允許通知，但伺服器未記錄訂閱。請按「重新訂閱」。
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
                    : permission === "granted" && localSubscribed
                      ? serverSynced
                        ? `已開啟（${serverSubscriptionCount} 個裝置）`
                        : "本機已開啟，伺服器未同步"
                      : permission === "denied"
                        ? "已在系統設定中封鎖"
                        : "尚未開啟"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!localSubscribed ? (
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
                disabled={busy || permission !== "granted"}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-zinc-200 text-xs font-black transition disabled:opacity-50"
              >
                發送測試通知
              </button>
              <button
                type="button"
                onClick={handleResubscribe}
                disabled={busy || iosInstallNeeded}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-zinc-200 text-xs font-black transition"
              >
                重新訂閱
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
