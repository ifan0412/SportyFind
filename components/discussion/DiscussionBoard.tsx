"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MessageSquare, Send, Trash2, Loader2, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { profileLink } from "@/lib/profile-links";
import {
  DISCUSSION_TAG_OPTIONS,
  discussionTagInfo,
  formatDiscussionTime,
  type DiscussionCommentRow,
  type DiscussionContextType,
  type DiscussionPostRow,
} from "@/lib/discussion-board";
import { fetchDiscussionPosts } from "@/lib/discussion-board-fetch";
import { cn } from "@/lib/utils";

interface DiscussionBoardProps {
  contextType: DiscussionContextType;
  contextId: string;
  currentUser: { id: string } | null;
  isModerator?: boolean;
  canParticipate?: boolean;
  returnTo?: string;
  title?: string;
  emptyHint?: string;
  inputPlaceholder?: string;
  className?: string;
}

function likeCount(likes: { user_id: string }[] | undefined): number {
  return likes?.length ?? 0;
}

function userLiked(likes: { user_id: string }[] | undefined, userId: string | undefined): boolean {
  if (!userId) return false;
  return (likes ?? []).some((l) => l.user_id === userId);
}

function AuthorAvatar({
  author,
  userId,
  returnTo,
}: {
  author?: { full_name?: string | null; avatar_url?: string | null } | null;
  userId: string;
  returnTo?: string;
}) {
  const inner = (
    <div
      className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black shrink-0 overflow-hidden"
      style={{
        backgroundImage: author?.avatar_url ? `url(${author.avatar_url})` : undefined,
        backgroundSize: "cover",
      }}
    >
      {!author?.avatar_url && (author?.full_name?.[0] || "?")}
    </div>
  );
  return (
    <Link href={profileLink(userId, returnTo)} className="shrink-0">
      {inner}
    </Link>
  );
}

export function DiscussionBoard({
  contextType,
  contextId,
  currentUser,
  isModerator = false,
  canParticipate = true,
  returnTo,
  title = "討論區",
  emptyHint = "尚無人發言，快來搶第一條留言吧！",
  inputPlaceholder = "分享想法、提問或找夥伴...",
  className,
}: DiscussionBoardProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [posts, setPosts] = useState<DiscussionPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [selectedTag, setSelectedTag] = useState("general");
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const fetchPosts = useCallback(async () => {
    const result = await fetchDiscussionPosts(supabase, contextType, contextId);
    setPosts(result.posts);
    setUnavailable(result.unavailable);
    setLoadError(result.error);
    setLoading(false);
    return result;
  }, [supabase, contextType, contextId]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    setLoading(true);
    setLoadError(null);
    setUnavailable(false);

    void fetchPosts().then((result) => {
      if (cancelled || result.unavailable || result.error) return;

      channel = supabase
        .channel(`discussion-${contextType}-${contextId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "discussion_posts",
            filter: `context_id=eq.${contextId}`,
          },
          () => {
            if (!cancelled) void fetchPosts();
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, contextType, contextId, fetchPosts]);

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return alert("請先登入才能發佈！");
    if (!canParticipate) return alert("你目前無法在此討論區發言。");
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("discussion_posts").insert({
        context_type: contextType,
        context_id: contextId,
        user_id: currentUser.id,
        tag: selectedTag,
        content: content.trim(),
      });
      if (error) throw error;
      setContent("");
      fetchPosts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "請檢查權限設定";
      alert("發佈失敗：" + message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("確定要刪除這則貼文嗎？")) return;
    const { error } = await supabase.from("discussion_posts").delete().eq("id", postId);
    if (!error) setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const togglePostLike = async (post: DiscussionPostRow) => {
    if (!currentUser) return alert("請先登入才能按讚！");
    const liked = userLiked(post.discussion_post_likes, currentUser.id);
    if (liked) {
      await supabase
        .from("discussion_post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", currentUser.id);
    } else {
      await supabase.from("discussion_post_likes").insert({
        post_id: post.id,
        user_id: currentUser.id,
      });
    }
    fetchPosts();
  };

  const handleSubmitComment = async (postId: string) => {
    if (!currentUser) return alert("請先登入才能留言！");
    if (!canParticipate) return;
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;

    setCommentSubmitting(postId);
    try {
      const { error } = await supabase.from("discussion_comments").insert({
        post_id: postId,
        user_id: currentUser.id,
        content: text,
      });
      if (error) throw error;
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      setExpandedComments((prev) => ({ ...prev, [postId]: true }));
      fetchPosts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "請稍後再試";
      alert("留言失敗：" + message);
    } finally {
      setCommentSubmitting(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("確定要刪除這則留言嗎？")) return;
    const { error } = await supabase.from("discussion_comments").delete().eq("id", commentId);
    if (!error) fetchPosts();
  };

  const toggleCommentLike = async (comment: DiscussionCommentRow) => {
    if (!currentUser) return alert("請先登入才能按讚！");
    const liked = userLiked(comment.discussion_comment_likes, currentUser.id);
    if (liked) {
      await supabase
        .from("discussion_comment_likes")
        .delete()
        .eq("comment_id", comment.id)
        .eq("user_id", currentUser.id);
    } else {
      await supabase.from("discussion_comment_likes").insert({
        comment_id: comment.id,
        user_id: currentUser.id,
      });
    }
    fetchPosts();
  };

  const toggleCommentsOpen = (postId: string) => {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <div className={cn("bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6", className)}>
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-400" /> {title}
        </h3>
        <span className="text-xs text-zinc-500">{posts.length} 則貼文</span>
      </div>

      {currentUser && canParticipate ? (
        <form onSubmit={handleSubmitPost} className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="flex flex-wrap gap-2">
            {DISCUSSION_TAG_OPTIONS.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setSelectedTag(tag.id)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold border transition",
                  selectedTag === tag.id
                    ? tag.color + " ring-1 ring-white/20 shadow-sm"
                    : "bg-slate-900 border-slate-800 text-zinc-500 hover:text-zinc-300"
                )}
              >
                {tag.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={500}
              placeholder={inputPlaceholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-black text-xs transition flex items-center gap-1.5 shrink-0"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> 發送
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 bg-slate-950 rounded-2xl text-center text-xs text-zinc-400 border border-slate-800">
          {!currentUser
            ? "登入後即可參與討論。"
            : "你目前無法在此討論區發言（需為成員或已報名參與）。"}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-zinc-500 text-xs font-mono">載入討論中...</div>
      ) : unavailable ? (
        <div className="py-8 text-center text-zinc-500 text-xs font-bold space-y-2">
          <p>討論區尚未啟用。</p>
          <p className="text-zinc-600 font-normal">請在 Supabase 執行 migration 033_discussion_board.sql。</p>
        </div>
      ) : loadError ? (
        <div className="py-8 text-center space-y-3">
          <p className="text-xs font-bold text-red-400">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void fetchPosts();
            }}
            className="text-xs font-bold text-blue-400 hover:text-blue-300"
          >
            重試
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="py-8 text-center text-zinc-500 text-xs font-bold">{emptyHint}</div>
      ) : (
        <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-1">
          {posts.map((post) => {
            const tagInfo = discussionTagInfo(post.tag);
            const isMyPost = currentUser?.id === post.user_id;
            const postLikes = likeCount(post.discussion_post_likes);
            const postLiked = userLiked(post.discussion_post_likes, currentUser?.id);
            const comments = [...(post.discussion_comments ?? [])].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            const commentsOpen = expandedComments[post.id] ?? comments.length > 0;

            return (
              <article
                key={post.id}
                className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <AuthorAvatar
                      author={post.author}
                      userId={post.user_id}
                      returnTo={returnTo}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={profileLink(post.user_id, returnTo)}
                          className="text-xs font-bold text-white truncate hover:text-blue-400 transition"
                        >
                          {post.author?.full_name || "會員"}
                        </Link>
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", tagInfo.color)}>
                          {tagInfo.label}
                        </span>
                        <span className="text-[10px] text-zinc-500">{formatDiscussionTime(post.created_at)}</span>
                      </div>
                      <p className="text-sm text-zinc-300 mt-1.5 leading-relaxed break-words">{post.content}</p>
                    </div>
                  </div>
                  {(isMyPost || isModerator) && (
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      className="text-zinc-600 hover:text-red-400 p-1 transition shrink-0"
                      title="刪除貼文"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 pl-11">
                  <button
                    type="button"
                    onClick={() => togglePostLike(post)}
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-bold transition",
                      postLiked ? "text-pink-400" : "text-zinc-500 hover:text-pink-300"
                    )}
                  >
                    <Heart className={cn("w-3.5 h-3.5", postLiked && "fill-current")} />
                    {postLikes > 0 ? postLikes : "讚"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCommentsOpen(post.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-blue-400 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    留言 {comments.length > 0 ? `(${comments.length})` : ""}
                    {commentsOpen ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {commentsOpen && (
                  <div className="pl-11 space-y-3 border-t border-slate-800/60 pt-3">
                    {comments.map((comment) => {
                      const isMyComment = currentUser?.id === comment.user_id;
                      const cLikes = likeCount(comment.discussion_comment_likes);
                      const cLiked = userLiked(comment.discussion_comment_likes, currentUser?.id);

                      return (
                        <div key={comment.id} className="flex items-start gap-2">
                          <AuthorAvatar
                            author={comment.author}
                            userId={comment.user_id}
                            returnTo={returnTo}
                          />
                          <div className="flex-1 min-w-0 bg-slate-900/80 rounded-xl px-3 py-2 border border-slate-800/60">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Link
                                  href={profileLink(comment.user_id, returnTo)}
                                  className="text-[11px] font-bold text-white truncate hover:text-blue-400"
                                >
                                  {comment.author?.full_name || "會員"}
                                </Link>
                                <span className="text-[10px] text-zinc-600 shrink-0">
                                  {formatDiscussionTime(comment.created_at)}
                                </span>
                              </div>
                              {(isMyComment || isModerator) && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="text-zinc-600 hover:text-red-400 p-0.5 shrink-0"
                                  title="刪除留言"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-zinc-300 mt-1 break-words">{comment.content}</p>
                            <button
                              type="button"
                              onClick={() => toggleCommentLike(comment)}
                              className={cn(
                                "inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold transition",
                                cLiked ? "text-pink-400" : "text-zinc-500 hover:text-pink-300"
                              )}
                            >
                              <Heart className={cn("w-3 h-3", cLiked && "fill-current")} />
                              {cLikes > 0 ? cLikes : "讚"}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {currentUser && canParticipate && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={300}
                          placeholder="寫下留言..."
                          value={commentDrafts[post.id] || ""}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmitComment(post.id);
                            }
                          }}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          disabled={commentSubmitting === post.id || !(commentDrafts[post.id] || "").trim()}
                          onClick={() => handleSubmitComment(post.id)}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-blue-600 text-white text-xs font-bold disabled:opacity-40 transition"
                        >
                          {commentSubmitting === post.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "送出"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
