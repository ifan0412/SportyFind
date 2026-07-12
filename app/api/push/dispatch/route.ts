import { NextResponse } from "next/server";
import { dispatchPushForNotificationRecord } from "@/lib/push/server";
import type { Notification } from "@/components/notifications/notification-types";

function verifyWebhookSecret(request: Request): boolean {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret) return false;
  return request.headers.get("x-push-webhook-secret") === secret;
}

/** Supabase Database Webhook payload (INSERT on notifications). */
function parseWebhookBody(body: unknown): {
  user_id: string;
  id: string;
  type: Notification["type"];
  push_eligible?: boolean | null;
  team_id?: string | null;
  event_id?: string | null;
  friendship_id?: string | null;
} | null {
  if (!body || typeof body !== "object") return null;
  const obj = body as Record<string, unknown>;

  const record =
    (obj.record as Record<string, unknown> | undefined) ??
    (obj.new as Record<string, unknown> | undefined) ??
    obj;

  if (!record || typeof record !== "object") return null;

  const userId = record.user_id;
  const id = record.id;
  const type = record.type;

  if (typeof userId !== "string" || typeof id !== "string" || typeof type !== "string") {
    return null;
  }

  return {
    user_id: userId,
    id,
    type: type as Notification["type"],
    push_eligible: record.push_eligible as boolean | null | undefined,
    team_id: (record.team_id as string | null) ?? null,
    event_id: (record.event_id as string | null) ?? null,
    friendship_id: (record.friendship_id as string | null) ?? null,
  };
}

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const record = parseWebhookBody(body);

  if (!record) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await dispatchPushForNotificationRecord(record);
  return NextResponse.json({ ok: true, ...result });
}
