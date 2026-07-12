import "server-only";

import webpush from "web-push";
import { getPushPayloadForNotification } from "@/lib/push/notification-copy";
import {
  mergePushPreferences,
  shouldSendPushForNotification,
} from "@/lib/push/preferences";
import { createServiceRoleClient, hasServiceRoleClient } from "@/lib/supabase/service";
import type { Notification } from "@/components/notifications/notification-types";
import {
  formatPushDeliveryError,
  getVapidPrivateKeyFromEnv,
  getVapidPublicKeyFromEnv,
  getVapidSubjectFromEnv,
  shouldInvalidateSubscription,
} from "@/lib/push/vapid-config";

let vapidConfigured = false;
let vapidConfigError: string | null = null;

function ensureVapidConfigured(): { ok: true } | { ok: false; error: string } {
  if (vapidConfigured) return { ok: true };
  if (vapidConfigError) return { ok: false, error: vapidConfigError };

  const publicKey = getVapidPublicKeyFromEnv();
  const privateKey = getVapidPrivateKeyFromEnv();
  const subject = getVapidSubjectFromEnv();

  if (!publicKey || !privateKey) {
    vapidConfigError = !privateKey ? "VAPID_PRIVATE_KEY 未設定" : "NEXT_PUBLIC_VAPID_PUBLIC_KEY 未設定";
    return { ok: false, error: vapidConfigError };
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return { ok: true };
  } catch (err) {
    vapidConfigError =
      err instanceof Error
        ? `VAPID 金鑰格式錯誤：${err.message}`
        : "VAPID 金鑰格式錯誤";
    return { ok: false, error: vapidConfigError };
  }
}

export function getVapidPublicKey(): string | null {
  const key = getVapidPublicKeyFromEnv();
  return key || null;
}

export function isVapidPrivateKeyConfigured(): boolean {
  return Boolean(getVapidPrivateKeyFromEnv());
}

export function getVapidConfigurationError(): string | null {
  const result = ensureVapidConfigured();
  return result.ok ? null : result.error;
}

export function isPushServerConfigured(): boolean {
  return (
    ensureVapidConfigured().ok &&
    hasServiceRoleClient() &&
    Boolean(getVapidPublicKey())
  );
}

export type PushSendResult = { sent: number; failed: number; lastError?: string };

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url: string; tag: string }
): Promise<PushSendResult> {
  const vapid = ensureVapidConfigured();
  if (!vapid.ok) {
    return { sent: 0, failed: 0, lastError: vapid.error };
  }
  if (!hasServiceRoleClient()) {
    return { sent: 0, failed: 0, lastError: "SUPABASE_SERVICE_ROLE_KEY 未設定" };
  }

  const supabase = createServiceRoleClient();
  const { data: rows, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) {
    return { sent: 0, failed: 0, lastError: `讀取訂閱失敗：${error.message}` };
  }
  if (!rows?.length) return { sent: 0, failed: 0, lastError: "找不到推送訂閱紀錄" };

  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;
  const body = JSON.stringify(payload);

  for (const row of rows as PushSubscriptionRow[]) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        body,
        { TTL: 86400, urgency: "high" }
      );
      sent += 1;
    } catch (err: unknown) {
      failed += 1;
      const pushErr = err as { statusCode?: number; body?: string; message?: string };
      lastError = formatPushDeliveryError(pushErr);
      if (shouldInvalidateSubscription(pushErr.statusCode, pushErr.body)) {
        await supabase.from("push_subscriptions").delete().eq("id", row.id);
        lastError = `${lastError}（已清除失效訂閱，請重新訂閱）`;
      }
      console.error("Push send failed:", pushErr.statusCode, pushErr.body ?? pushErr.message);
    }
  }

  return { sent, failed, lastError };
}

export async function dispatchPushForNotificationRecord(record: {
  id: string;
  user_id: string;
  type: Notification["type"];
  push_eligible?: boolean | null;
  sender_id?: string | null;
  sender?: { full_name?: string | null } | null;
  team_id?: string | null;
  event_id?: string | null;
  friendship_id?: string | null;
}): Promise<{ sent: number; skipped: boolean }> {
  if (!ensureVapidConfigured().ok || !hasServiceRoleClient()) {
    return { sent: 0, skipped: true };
  }

  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("push_preferences")
    .eq("id", record.user_id)
    .maybeSingle();

  const prefs = mergePushPreferences(profile?.push_preferences);
  if (!shouldSendPushForNotification(record.type, record.push_eligible, prefs)) {
    return { sent: 0, skipped: true };
  }

  let sender = record.sender ?? null;
  if (!sender?.full_name && record.sender_id) {
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", record.sender_id)
      .maybeSingle();
    sender = { full_name: senderProfile?.full_name ?? null };
  }

  const payload = getPushPayloadForNotification({
    id: record.id,
    type: record.type,
    sender: sender
      ? { full_name: sender.full_name ?? null, id: record.sender_id ?? "", avatar_url: null }
      : null,
    team_id: record.team_id ?? null,
    event_id: record.event_id ?? null,
    friendship_id: record.friendship_id ?? null,
  });

  const { sent } = await sendPushToUser(record.user_id, payload);
  return { sent, skipped: false };
}

export async function getPushDispatchStatus(): Promise<{
  configured: boolean;
  migrationRequired: boolean;
  webhookSecretConfigured: boolean;
}> {
  if (!hasServiceRoleClient()) {
    return {
      configured: false,
      migrationRequired: false,
      webhookSecretConfigured: Boolean(process.env.PUSH_WEBHOOK_SECRET),
    };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("push_dispatch_config")
    .select("dispatch_url, webhook_secret")
    .eq("id", true)
    .maybeSingle();

  if (error?.code === "42P01") {
    return {
      configured: false,
      migrationRequired: true,
      webhookSecretConfigured: Boolean(process.env.PUSH_WEBHOOK_SECRET),
    };
  }

  const dispatchUrl = typeof data?.dispatch_url === "string" ? data.dispatch_url.trim() : "";
  const webhookSecret = typeof data?.webhook_secret === "string" ? data.webhook_secret.trim() : "";

  return {
    configured: dispatchUrl.length > 0 && webhookSecret.length > 0,
    migrationRequired: false,
    webhookSecretConfigured: Boolean(process.env.PUSH_WEBHOOK_SECRET),
  };
}

export async function sendTestPushToUser(userId: string) {
  return sendPushToUser(userId, {
    title: "SportyFind 測試通知",
    body: "推送通知已成功設定！您將在此收到重要更新。",
    url: "/profile/settings/notifications",
    tag: "push-test",
  });
}

export async function deleteAllPushSubscriptionsForUser(userId: string): Promise<void> {
  if (!hasServiceRoleClient()) return;
  const supabase = createServiceRoleClient();
  await supabase.from("push_subscriptions").delete().eq("user_id", userId);
}
