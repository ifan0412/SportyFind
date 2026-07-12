export interface Notification {
  id: string;
  type:
    | "friend_request"
    | "friend_accepted"
    | "team_join_request"
    | "team_request_accepted"
    | "team_request_rejected"
    | "team_member_left"
    | "event_registration"
    | "event_waitlist_signup"
    | "event_waitlist_promoted"
    | "event_waitlist_promoted_host"
    | "event_kicked"
    | "event_leave"
    | "event_cancelled"
    | "event_accepted"
    | "event_joined"
    | "coach_enquiry"
    | "coach_enquiry_withdrawn"
    | "coach_review"
    | "physio_enquiry"
    | "physio_enquiry_withdrawn"
    | "physio_review"
    | "discussion_new_post"
    | "discussion_post_like"
    | "discussion_post_comment"
    | "discussion_comment_like"
    | "account_reactivated"
    | "admin_team_removed"
    | "admin_event_removed"
    | "direct_message";
  is_read: boolean;
  created_at: string;
  push_eligible?: boolean;
  friendship_id: string | null;
  team_id: string | null;
  event_id: string | null;
  sender: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}
