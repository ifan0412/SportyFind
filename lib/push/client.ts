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

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!supportsWebPush()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing) return existing;
    return await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
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

  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!supportsWebPush()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) return null;
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
  return { ok: saved, permission };
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

export async function sendTestPush(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/push/test", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: res.ok, error: data.error };
  } catch {
    return { ok: false, error: "network" };
  }
}
