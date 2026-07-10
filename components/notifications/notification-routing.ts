import type { Notification } from "./notification-types";

export function getNotificationHref(notif: Notification): string {
  if (notif.type === "coach_enquiry") return "/dashboard/coach?subtab=inbox";
  if (notif.type === "physio_enquiry") return "/dashboard/physio?subtab=inbox";
  if (notif.type === "coach_review") return "/dashboard/coach?subtab=services";
  if (notif.type === "physio_review") return "/dashboard/physio?subtab=services";
  if (notif.type === "team_join_request" && notif.team_id) return `/team/${notif.team_id}/admin`;
  if (
    (notif.type === "team_request_accepted" || notif.type === "team_request_rejected") &&
    notif.team_id
  ) {
    return `/team/${notif.team_id}`;
  }
  if (
    (notif.type === "event_registration" ||
      notif.type === "event_waitlist_signup" ||
      notif.type === "event_waitlist_promoted" ||
      notif.type === "event_kicked" ||
      notif.type === "event_accepted" ||
      notif.type === "event_joined") &&
    notif.event_id
  ) {
    return `/events/${notif.event_id}`;
  }
  return "/profile?tab=friends";
}
