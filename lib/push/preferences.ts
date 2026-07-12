import type { Notification } from "@/components/notifications/notification-types";
import {
  PUSH_ELIGIBLE_NOTIFICATION_TYPES,
  PUSH_INELIGIBLE_NOTIFICATION_TYPES,
} from "@/lib/notifications/push-eligibility";

export type PushCategory =
  | "friends"
  | "teams"
  | "events"
  | "coach"
  | "physio"
  | "system";

export interface PushPreferences {
  enabled: boolean;
  categories: Record<PushCategory, boolean>;
}

export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {
  enabled: true,
  categories: {
    friends: true,
    teams: true,
    events: true,
    coach: true,
    physio: true,
    system: true,
  },
};

const TYPE_TO_CATEGORY: Record<string, PushCategory> = {
  friend_request: "friends",
  friend_accepted: "friends",
  team_join_request: "teams",
  team_request_accepted: "teams",
  team_request_rejected: "teams",
  team_member_left: "teams",
  event_registration: "events",
  event_waitlist_signup: "events",
  event_waitlist_promoted: "events",
  event_kicked: "events",
  event_leave: "events",
  event_cancelled: "events",
  event_accepted: "events",
  event_joined: "events",
  coach_enquiry: "coach",
  coach_enquiry_withdrawn: "coach",
  coach_review: "coach",
  physio_enquiry: "physio",
  physio_enquiry_withdrawn: "physio",
  physio_review: "physio",
  account_reactivated: "system",
  admin_team_removed: "system",
  admin_event_removed: "system",
};

export const PUSH_CATEGORY_LABELS: Record<
  PushCategory,
  { label: string; description: string }
> = {
  friends: { label: "好友", description: "好友請求與接受通知" },
  teams: { label: "球隊", description: "加入申請、審批與成員變動" },
  events: { label: "活動", description: "報名、候補、取消與審批" },
  coach: { label: "教練", description: "課程諮詢與評價" },
  physio: { label: "物理治療", description: "診療諮詢與評價" },
  system: { label: "系統", description: "帳戶恢復與管理員訊息" },
};

export function getPushCategoryForType(type: Notification["type"]): PushCategory | null {
  return TYPE_TO_CATEGORY[type] ?? null;
}

export function mergePushPreferences(raw: unknown): PushPreferences {
  const base = structuredClone(DEFAULT_PUSH_PREFERENCES);
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Partial<PushPreferences>;
  if (typeof obj.enabled === "boolean") base.enabled = obj.enabled;
  if (obj.categories && typeof obj.categories === "object") {
    for (const key of Object.keys(base.categories) as PushCategory[]) {
      const val = (obj.categories as Record<string, unknown>)[key];
      if (typeof val === "boolean") base.categories[key] = val;
    }
  }
  return base;
}

export function shouldSendPushForNotification(
  type: Notification["type"],
  pushEligible: boolean | null | undefined,
  preferences: PushPreferences
): boolean {
  if (!preferences.enabled) return false;
  if (pushEligible === false) return false;
  if ((PUSH_INELIGIBLE_NOTIFICATION_TYPES as readonly string[]).includes(type)) {
    return false;
  }
  if (!(PUSH_ELIGIBLE_NOTIFICATION_TYPES as readonly string[]).includes(type)) {
    return false;
  }
  const category = getPushCategoryForType(type);
  if (!category) return false;
  return preferences.categories[category] !== false;
}

export function serializePushPreferences(prefs: PushPreferences): Record<string, unknown> {
  return {
    enabled: prefs.enabled,
    categories: { ...prefs.categories },
  };
}
