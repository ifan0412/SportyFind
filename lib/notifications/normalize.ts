import type { Notification } from "@/components/notifications/notification-types";

export type NotificationLike = Pick<
  Notification,
  "type" | "sender" | "friendship_id" | "team_id" | "event_id"
>;

function normalizeSender(
  sender: NotificationLike["sender"]
): NotificationLike["sender"] {
  if (!sender) return null;
  if (Array.isArray(sender)) {
    const first = sender[0];
    return first && typeof first === "object" ? first : null;
  }
  return sender;
}

export function normalizeNotificationType(type: unknown): string {
  return typeof type === "string" ? type.trim().toLowerCase() : "";
}

export function inferNotificationType(notif: NotificationLike): string {
  const explicit = normalizeNotificationType(notif.type);
  if (explicit) return explicit;

  if (
    notif.sender &&
    !notif.friendship_id &&
    !notif.team_id &&
    !notif.event_id
  ) {
    return "direct_message";
  }

  return "";
}

export function normalizeNotificationLike(raw: NotificationLike): NotificationLike {
  return {
    ...raw,
    type: (inferNotificationType(raw) || raw.type) as Notification["type"],
    sender: normalizeSender(raw.sender),
  };
}

export function mapNotificationRow(raw: unknown): Notification | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const id = row.id;
  if (typeof id !== "string") return null;

  const createdAt = row.created_at;
  const isRead = row.is_read;

  const normalized = normalizeNotificationLike({
    type: (row.type as Notification["type"]) ?? ("" as Notification["type"]),
    sender: (row.sender as NotificationLike["sender"]) ?? null,
    friendship_id: (row.friendship_id as string | null) ?? null,
    team_id: (row.team_id as string | null) ?? null,
    event_id: (row.event_id as string | null) ?? null,
  });

  return {
    id,
    type: (normalizeNotificationType(normalized.type) ||
      inferNotificationType(normalized) ||
      normalized.type) as Notification["type"],
    is_read: typeof isRead === "boolean" ? isRead : false,
    created_at: typeof createdAt === "string" ? createdAt : new Date().toISOString(),
    push_eligible:
      typeof row.push_eligible === "boolean" ? row.push_eligible : undefined,
    friendship_id: normalized.friendship_id,
    team_id: normalized.team_id,
    event_id: normalized.event_id,
    sender: normalized.sender,
  };
}
