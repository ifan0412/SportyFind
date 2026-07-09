export type DiscussionContextType = "event" | "team";

export const DISCUSSION_TAG_OPTIONS = [
  { id: "general", label: "💬 一般討論", color: "bg-blue-950 text-blue-300 border-blue-500/30" },
  { id: "carpool", label: "🚗 交通共乘", color: "bg-emerald-950 text-emerald-300 border-emerald-500/30" },
  { id: "equipment", label: "🏸 球具裝備", color: "bg-amber-950 text-amber-300 border-amber-500/30" },
] as const;

export function discussionTagInfo(tag: string | null | undefined) {
  return DISCUSSION_TAG_OPTIONS.find((t) => t.id === tag) ?? DISCUSSION_TAG_OPTIONS[0];
}

export interface DiscussionAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface DiscussionCommentRow {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: DiscussionAuthor | null;
  discussion_comment_likes?: { user_id: string }[];
}

export interface DiscussionPostRow {
  id: string;
  context_type: DiscussionContextType;
  context_id: string;
  user_id: string;
  tag: string;
  content: string;
  created_at: string;
  author?: DiscussionAuthor | null;
  discussion_post_likes?: { user_id: string }[];
  discussion_comments?: DiscussionCommentRow[];
}

export function formatDiscussionTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString("zh-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
