export type PopupContentType = "text" | "image";
export type PopupDismissMode = "session" | "user" | "until_end";
export type PopupActivationMode = "manual" | "scheduled";
export type PopupStatus = "draft" | "published" | "archived";

export interface SitePopupAnnouncement {
  id: string;
  title: string;
  content_type: PopupContentType;
  text_content: string | null;
  image_desktop_url: string | null;
  image_mobile_url: string | null;
  target_pages: string[];
  dismiss_mode: PopupDismissMode;
  activation_mode: PopupActivationMode;
  status: PopupStatus;
  is_live: boolean;
  starts_at: string | null;
  ends_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export type SitePopupAnnouncementInsert = Omit<
  SitePopupAnnouncement,
  "id" | "created_at" | "updated_at"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
