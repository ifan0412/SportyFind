"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Share, Smartphone, X } from "lucide-react";
import { useAuth } from "@/components/SupabaseProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  dismissPushReminder,
  enablePushNotifications,
  getCurrentPushSubscription,
  registerServiceWorker,
} from "@/lib/push/client";
import {
  getNotificationPermission,
  isIOS,
  isPushBlocked,
  needsIosHomeScreenFirst,
  openNotificationSettingsHint,
  supportsWebPush,
} from "@/lib/push/platform";
import { readLocalPushReminderDismissed } from "@/lib/push/storage";

type ReminderStep = "ios_install" | "enable_push" | "hidden";

function usePushReminderState() {
  const { user, isLoading } = useAuth();
  const [step, setStep] = useState<ReminderStep>("hidden");
  const [busy, setBusy] = useState(false);
  const [deferredInstall, setDeferredInstall] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredInstall(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const evaluate = useCallback(async () => {
    if (isLoading || !user) {
      setStep("hidden");
      return;
    }

    if (readLocalPushReminderDismissed()) {
      setStep("hidden");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("push_reminder_dismissed_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.push_reminder_dismissed_at) {
      setStep("hidden");
      return;
    }

    if (needsIosHomeScreenFirst()) {
      setStep("ios_install");
      return;
    }

    if (!supportsWebPush()) {
      setStep("hidden");
      return;
    }

    await registerServiceWorker();
    const permission = getNotificationPermission();
    const sub = await getCurrentPushSubscription();

    if (permission === "granted" && sub) {
      setStep("hidden");
      await dismissPushReminder();
      return;
    }

    setStep("enable_push");
  }, [isLoading, user]);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  useEffect(() => {
    const onStandalone = () => evaluate();
    window.addEventListener("focus", onStandalone);
    document.addEventListener("visibilitychange", onStandalone);
    return () => {
      window.removeEventListener("focus", onStandalone);
      document.removeEventListener("visibilitychange", onStandalone);
    };
  }, [evaluate]);

  return { step, setStep, busy, setBusy, deferredInstall, evaluate, user };
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PushNotificationReminder() {
  const { step, setStep, busy, setBusy, deferredInstall, evaluate } = usePushReminderState();

  if (step === "hidden") return null;

  const handleDismissOk = async () => {
    setBusy(true);
    await dismissPushReminder();
    setStep("hidden");
    setBusy(false);
  };

  const handleIosShareShortcut = async () => {
    if (!navigator.share) return;
    setBusy(true);
    try {
      await navigator.share({
        title: "SportyFind",
        text: "加入主畫面快捷方式",
        url: window.location.origin,
      });
    } catch {
      /* user cancelled */
    } finally {
      setBusy(false);
    }
  };

  const handleAndroidInstall = async () => {
    if (!deferredInstall) return;
    setBusy(true);
    try {
      await deferredInstall.prompt();
      const choice = await deferredInstall.userChoice;
      if (choice.outcome === "accepted") {
        await evaluate();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleEnablePush = async () => {
    setBusy(true);
    try {
      const result = await enablePushNotifications();
      if (result.ok) {
        await dismissPushReminder();
        setStep("hidden");
        return;
      }
      if (result.reason === "denied" && isPushBlocked()) {
        openNotificationSettingsHint();
      }
    } finally {
      setBusy(false);
    }
  };

  const shellClass =
    "fixed inset-x-0 top-0 z-[88] px-3 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-4 md:inset-x-auto md:top-20 md:right-4 md:left-auto md:px-0 md:pt-0 md:pb-0 md:w-[min(100vw-2rem,22rem)]";

  const cardClass =
    "rounded-2xl border border-blue-500/30 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 md:bg-slate-900/95 md:backdrop-blur-md shadow-2xl shadow-blue-950/40 md:shadow-xl p-5 md:p-4 min-h-[min(72vh,520px)] md:min-h-0 flex flex-col";

  return (
    <div className={shellClass} role="dialog" aria-labelledby="push-reminder-title">
      <div className={cardClass}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              {step === "ios_install" ? (
                <Smartphone className="w-4 h-4 text-blue-400" />
              ) : (
                <Bell className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <div>
              <h2 id="push-reminder-title" className="text-sm font-black text-white">
                {step === "ios_install" ? "加入主畫面快捷方式" : "開啟推送通知"}
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">SportyFind</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismissOk}
            disabled={busy}
            aria-label="關閉提醒"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === "ios_install" ? (
          <>
            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              在 iPhone / iPad 上，請先將 SportyFind 加入主畫面，才能接收推送通知。
            </p>
            <ol className="space-y-3 text-xs text-zinc-300 mb-5">
              <li className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-black shrink-0">
                  1
                </span>
                <span>
                  點選 Safari 底欄的 <Share className="inline w-3.5 h-3.5 mx-0.5" />{" "}
                  <strong className="text-white">分享</strong>
                </span>
              </li>
              <li className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-black shrink-0">
                  2
                </span>
                <span>
                  選擇 <strong className="text-white">加入主畫面</strong>
                </span>
              </li>
              <li className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-black shrink-0">
                  3
                </span>
                <span>
                  從主畫面開啟 SportyFind 後，再按 <strong className="text-white">開啟通知</strong>
                </span>
              </li>
            </ol>
            <div className="mt-auto space-y-2">
              {isIOS() && typeof navigator !== "undefined" && "share" in navigator && (
                <button
                  type="button"
                  onClick={handleIosShareShortcut}
                  disabled={busy}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-black transition inline-flex items-center justify-center gap-2"
                >
                  <Share className="w-3.5 h-3.5" />
                  快速加入主畫面
                </button>
              )}
              {!isIOS() && deferredInstall && (
                <button
                  type="button"
                  onClick={handleAndroidInstall}
                  disabled={busy}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-black transition"
                >
                  一鍵加入主畫面
                </button>
              )}
              <button
                type="button"
                onClick={handleDismissOk}
                disabled={busy}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-zinc-200 text-xs font-black transition"
              >
                確定
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              開啟推送通知，即時接收好友請求、活動更新、球隊訊息等重要提醒。
            </p>
            {isPushBlocked() && (
              <p className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-4">
                通知權限已被封鎖。請到系統設定中允許 SportyFind 發送通知。
              </p>
            )}
            <div className="space-y-2 mt-auto md:mt-0">
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={busy}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-black transition"
              >
                {busy ? "處理中…" : "開啟推送通知"}
              </button>
              <button
                type="button"
                onClick={handleDismissOk}
                disabled={busy}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-zinc-200 text-xs font-black transition"
              >
                確定
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
