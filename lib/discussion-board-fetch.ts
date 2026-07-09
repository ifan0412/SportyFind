import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiscussionCommentRow, DiscussionContextType, DiscussionPostRow } from "@/lib/discussion-board";

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("schema cache")
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "連線失敗，請檢查網路後再試。";
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }
  return "無法載入討論區。";
}

export async function fetchDiscussionPosts(
  supabase: SupabaseClient,
  contextType: DiscussionContextType,
  contextId: string
): Promise<{ posts: DiscussionPostRow[]; unavailable: boolean; error: string | null }> {
  try {
    let postsQuery = await supabase
      .from("discussion_posts")
      .select("*, author:user_id (id, full_name, avatar_url)")
      .eq("context_type", contextType)
      .eq("context_id", contextId)
      .order("created_at", { ascending: false });

    if (postsQuery.error) {
      if (isMissingTableError(postsQuery.error)) {
        return { posts: [], unavailable: true, error: null };
      }

      postsQuery = await supabase
        .from("discussion_posts")
        .select("*")
        .eq("context_type", contextType)
        .eq("context_id", contextId)
        .order("created_at", { ascending: false });

      if (postsQuery.error) {
        if (isMissingTableError(postsQuery.error)) {
          return { posts: [], unavailable: true, error: null };
        }
        return { posts: [], unavailable: false, error: postsQuery.error.message };
      }
    }

    const basePosts = (postsQuery.data as DiscussionPostRow[]) || [];
    if (basePosts.length === 0) {
      return { posts: [], unavailable: false, error: null };
    }

    const postIds = basePosts.map((p) => p.id);

    let likesData: { post_id: string; user_id: string }[] = [];
    let comments: DiscussionCommentRow[] = [];

    try {
      const [likesRes, commentsRes] = await Promise.all([
        supabase.from("discussion_post_likes").select("post_id, user_id").in("post_id", postIds),
        supabase
          .from("discussion_comments")
          .select("id, post_id, user_id, content, created_at, author:user_id (id, full_name, avatar_url)")
          .in("post_id", postIds)
          .order("created_at", { ascending: true }),
      ]);

      if (isMissingTableError(likesRes.error) || isMissingTableError(commentsRes.error)) {
        return { posts: basePosts, unavailable: false, error: null };
      }

      likesData = likesRes.data || [];
      comments = (commentsRes.data as unknown as DiscussionCommentRow[]) || [];
    } catch {
      return { posts: basePosts, unavailable: false, error: null };
    }
    const commentIds = comments.map((c) => c.id);

    let commentLikes: { comment_id: string; user_id: string }[] = [];
    if (commentIds.length > 0) {
      const commentLikesRes = await supabase
        .from("discussion_comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", commentIds);
      if (!commentLikesRes.error) {
        commentLikes = commentLikesRes.data || [];
      }
    }

    const likesByPost = new Map<string, { user_id: string }[]>();
    for (const row of likesData) {
      const list = likesByPost.get(row.post_id) || [];
      list.push({ user_id: row.user_id });
      likesByPost.set(row.post_id, list);
    }

    const likesByComment = new Map<string, { user_id: string }[]>();
    for (const row of commentLikes) {
      const list = likesByComment.get(row.comment_id) || [];
      list.push({ user_id: row.user_id });
      likesByComment.set(row.comment_id, list);
    }

    const commentsByPost = new Map<string, DiscussionCommentRow[]>();
    for (const comment of comments) {
      const enriched: DiscussionCommentRow = {
        ...comment,
        discussion_comment_likes: likesByComment.get(comment.id) || [],
      };
      const list = commentsByPost.get(comment.post_id) || [];
      list.push(enriched);
      commentsByPost.set(comment.post_id, list);
    }

    const posts = basePosts.map((post) => ({
      ...post,
      discussion_post_likes: likesByPost.get(post.id) || [],
      discussion_comments: commentsByPost.get(post.id) || [],
    }));

    return { posts, unavailable: false, error: null };
  } catch (err) {
    return { posts: [], unavailable: false, error: errorMessage(err) };
  }
}
