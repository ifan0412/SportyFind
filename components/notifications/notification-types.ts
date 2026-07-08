export interface Notification {
  id: string;
  type:
    | "friend_request"
    | "friend_accepted"
    | "team_join_request"
    | "team_request_accepted"
    | "team_request_rejected"
    | "event_registration"
    | "event_kicked"
    | "event_accepted"
    | "event_joined"
    | "coach_enquiry"
    | "coach_review"
    | "physio_enquiry"
    | "physio_review";
  is_read: boolean;
  created_at: string;
  friendship_id: string | null;
  team_id: string | null;
  event_id: string | null;
  sender: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}
