import "server-only";

import webpush from "web-push";
import { SITE } from "@/lib/site";
import { getPushPayloadForNotification } from "@/lib/push/notification-copy";
import {
  mergePushPreferences,
  shouldSendPushForNotification,
} from "@/lib/push/preferences";
import { createServiceRoleClient, hasServiceRoleClient } from "@/lib/supabase/service";
import type { Notification } from "@/components/notifications/notification-types";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? `mailto:${SITE.supportEmail}`;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url: string; tag: string }
): Promise<{ sent: number; failed: number }> {
  if (!ensureVapidConfigured() || !hasServiceRoleClient()) {
    return { sent: 0, failed: 0 };
  }

  const supabase = createServiceRoleClient();
  const { data: rows, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !rows?.length) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const body = JSON.stringify(payload);

  for (const row of rows as PushSubscriptionRow[]) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        body
      );
      sent += 1;
    } catch (err: unknown) {
      failed += 1;
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", row.id);
      }
      console.error("Push send failed:", err);
    }
  }

  return { sent, failed };
}

export async function dispatchPushForNotificationRecord(record: {
  id: string;
  user_id: string;
  type: Notification["type"];
  push_eligible?: boolean | null;
  sender?: { full_name?: string | null } | null;
  team_id?: string | null;
  event_id?: string | null;
  friendship_id?: string | null;
}): Promise<{ sent: number; skipped: boolean }> {
  if (!ensureVapidConfigured() || !hasServiceRoleClient()) {
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

  const payload = getPushPayloadForNotification({
    id: record.id,
    type: record.type,
    sender: record.sender ? { full_name: record.sender.full_name ?? null, id: "", avatar_url: null } : null,
    team_id: record.team_id ?? null,
    event_id: record.event_id ?? null,
    friendship_id: record.friendship_id ?? null,
  });

  const { sent } = await sendPushToUser(record.user_id, payload);
  return { sent, skipped: false };
}

export async function sendTestPushToUser(userId: string) {
  return sendPushToUser(userId, {
    title: "SportyFind 測試通知",
    body: "推送通知已成功設定！您將在此收到重要更新。",
    url: "/profile/settings/notifications",
    tag: "push-test",
  });
}
