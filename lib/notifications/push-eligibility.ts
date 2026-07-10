import type { Notification } from "@/components/notifications/notification-types";

/** In-app only — excluded from future push notifications. */
export const PUSH_INELIGIBLE_NOTIFICATION_TYPES = [
  "discussion_new_post",
  "discussion_post_like",
  "discussion_post_comment",
  "discussion_comment_like",
] as const;

/** Included in future push notifications. */
export const PUSH_ELIGIBLE_NOTIFICATION_TYPES = [
  "friend_request",
  "friend_accepted",
  "team_join_request",
  "team_request_accepted",
  "team_request_rejected",
  "event_registration",
  "event_waitlist_signup",
  "event_waitlist_promoted",
  "event_kicked",
  "event_leave",
  "event_cancelled",
  "event_accepted",
  "event_joined",
  "coach_enquiry",
  "coach_enquiry_withdrawn",
  "coach_review",
  "physio_enquiry",
  "physio_enquiry_withdrawn",
  "physio_review",
  "account_reactivated",
  "admin_team_removed",
  "admin_event_removed",
] as const;

export function isPushEligibleNotification(
  type: Notification["type"],
  pushEligible?: boolean | null
): boolean {
  if (typeof pushEligible === "boolean") return pushEligible;
  return !(PUSH_INELIGIBLE_NOTIFICATION_TYPES as readonly string[]).includes(type);
}
