"use client";

import {
  canPromptForPush,
  getNotificationPermission,
  supportsWebPush,
} from "@/lib/push/platform";

const SW_PATH = "/sw.js";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function bufferSourceEqual(a: BufferSource, b: Uint8Array): boolean {
  const viewA = a instanceof ArrayBuffer ? new Uint8Array(a) : new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  if (viewA.length !== b.length) return false;
  for (let i = 0; i < viewA.length; i += 1) {
    if (viewA[i] !== b[i]) return false;
  }
  return true;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!supportsWebPush()) return null;
  try {
    let registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) {
      registration = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
    }
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error("Service worker registration failed:", err);
    return null;
  }
}

export async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/vapid-public-key");
    if (!res.ok) return null;
    const data = (await res.json()) as { publicKey?: string };
    return data.publicKey ?? null;
  } catch {
    return null;
  }
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!canPromptForPush()) return null;

  const registration = await registerServiceWorker();
  if (!registration) return null;

  let permission = getNotificationPermission();
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return null;

  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) return null;

  const applicationServerKey = urlBase64ToUint8Array(publicKey) as BufferSource;
  const existing = await registration.pushManager.getSubscription();

  if (existing) {
    const existingKey = existing.options?.applicationServerKey;
    if (existingKey && bufferSourceEqual(existingKey, applicationServerKey as Uint8Array)) {
      return existing;
    }
    try {
      await existing.unsubscribe();
    } catch {
      /* continue with fresh subscription */
    }
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!supportsWebPush()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) return null;
  await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const sub = await getCurrentPushSubscription();
  if (!sub) return true;
  try {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    return await sub.unsubscribe();
  } catch (err) {
    console.error("Unsubscribe failed:", err);
    return false;
  }
}

export function serializePushSubscription(sub: PushSubscription) {
  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
  };
}

export async function persistPushSubscription(sub: PushSubscription): Promise<boolean> {
  try {
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...serializePushSubscription(sub),
        userAgent: navigator.userAgent,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      console.error("Persist subscription failed:", data.error ?? res.status);
    }
    return res.ok;
  } catch (err) {
    console.error("Persist subscription failed:", err);
    return false;
  }
}

export async function enablePushNotifications(): Promise<{
  ok: boolean;
  permission: NotificationPermission | "unsupported";
  reason?: string;
}> {
  if (!supportsWebPush()) {
    return { ok: false, permission: "unsupported", reason: "unsupported" };
  }

  const sub = await subscribeToPush();
  const permission = getNotificationPermission();
  if (!sub || permission !== "granted") {
    return { ok: false, permission, reason: permission === "denied" ? "denied" : "failed" };
  }

  const saved = await persistPushSubscription(sub);
  return { ok: saved, permission, reason: saved ? undefined : "save_failed" };
}

export async function dismissPushReminder(): Promise<void> {
  const { writeLocalPushReminderDismissed } = await import("@/lib/push/storage");
  writeLocalPushReminderDismissed();
  try {
    await fetch("/api/push/dismiss-reminder", { method: "POST" });
  } catch {
    /* local dismiss still applies */
  }
}

export async function sendTestPush(): Promise<{
  ok: boolean;
  error?: string;
  sent?: number;
  failed?: number;
}> {
  try {
    const res = await fetch("/api/push/test", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      sent?: number;
      failed?: number;
    };
    return {
      ok: res.ok,
      error: data.error,
      sent: data.sent,
      failed: data.failed,
    };
  } catch {
    return { ok: false, error: "network" };
  }
}

export async function resubscribePushNotifications(): Promise<{
  ok: boolean;
  error?: string;
}> {
  await unsubscribeFromPush();
  const result = await enablePushNotifications();
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "save_failed"
          ? "無法儲存訂閱，請確認資料庫 migration 056 已執行"
          : result.reason === "denied"
            ? "通知權限已被封鎖"
            : "重新訂閱失敗",
    };
  }
  return { ok: true };
}
