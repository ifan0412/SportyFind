import type { Notification } from "./notification-types";

export function getNotificationHref(notif: Notification): string {
  if (notif.type === "coach_enquiry" || notif.type === "coach_enquiry_withdrawn") {
    return "/dashboard/coach?subtab=inbox";
  }
  if (notif.type === "physio_enquiry" || notif.type === "physio_enquiry_withdrawn") {
    return "/dashboard/physio?subtab=inbox";
  }
  if (notif.type === "coach_review") return "/dashboard/coach?subtab=services";
  if (notif.type === "physio_review") return "/dashboard/physio?subtab=services";
  if (notif.type === "account_reactivated") return "/auth";
  if (notif.type === "admin_team_removed") return "/profile?tab=teams";
  if (notif.type === "admin_event_removed") return "/events/my";
  if (notif.type === "direct_message" && notif.sender?.id) {
    return `/inbox?to=${notif.sender.id}`;
  }
  if (notif.type === "team_join_request" && notif.team_id) return `/team/${notif.team_id}/admin`;
  if (notif.type === "team_member_left" && notif.team_id) return `/team/${notif.team_id}/admin`;
  if (
    (notif.type === "team_request_accepted" || notif.type === "team_request_rejected") &&
    notif.team_id
  ) {
    return `/team/${notif.team_id}`;
  }
  if (notif.team_id && notif.type.startsWith("discussion_")) {
    return `/team/${notif.team_id}#discussion`;
  }
  if (
    (notif.type === "event_registration" ||
      notif.type === "event_waitlist_signup" ||
      notif.type === "event_waitlist_joined" ||
      notif.type === "event_waitlist_promoted" ||
      notif.type === "event_waitlist_promoted_host" ||
      notif.type === "event_kicked" ||
      notif.type === "event_leave" ||
      notif.type === "event_cancelled" ||
      notif.type === "event_accepted" ||
      notif.type === "event_joined" ||
      notif.type.startsWith("discussion_")) &&
    notif.event_id
  ) {
    return notif.type.startsWith("discussion_")
      ? `/events/${notif.event_id}#discussion`
      : `/events/${notif.event_id}`;
  }
  return "/profile?tab=friends";
}
