"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MessageSquare, Send, Trash2, Loader2 } from "lucide-react";

interface EventLobbyBoardProps {
  eventId: string;
  currentUser: any;
  isOrganizer?: boolean;
}

const TAG_OPTIONS = [
  { id: "general", label: "💬 一般討論", color: "bg-blue-950 text-blue-300 border-blue-500/30" },
  { id: "carpool", label: "🚗 交通共乘", color: "bg-emerald-950 text-emerald-300 border-emerald-500/30" },
  { id: "equipment", label: "🏸 球具裝備", color: "bg-amber-950 text-amber-300 border-amber-500/30" },
];

export default function EventLobbyBoard({ eventId, currentUser, isOrganizer }: EventLobbyBoardProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [content, setContent] = useState("");
  const [selectedTag, setSelectedTag] = useState("general");

  const fetchComments = useCallback(async () => {
    try {
      // 1. 嘗試嘗試帶有會員關聯 (user:user_id) 的查詢
      let { data, error } = await supabase
        .from("event_comments")
        .select(`
          *,
          user:user_id (id, full_name, avatar_url)
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      // 2. 降級防護：如果外鍵尚未建立導致關聯失敗，直接改抓留言本體避免畫面崩潰
      if (error) {
        console.warn("關聯會員資料失敗，嘗試單純撈取留言本體:", JSON.stringify(error, null, 2));
        const fallbackQuery = await supabase
          .from("event_comments")
          .select("*")
          .eq("event_id", eventId)
          .order("created_at", { ascending: false });
          
        if (fallbackQuery.error) throw fallbackQuery.error;
        data = fallbackQuery.data;
      }

      setComments(data || []);
    } catch (err: any) {
      // 印出清晰的 Supabase 錯誤訊息，不再顯示空白 {}
      console.error("載入留言失敗的詳細錯誤:", err?.message || JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  }, [supabase, eventId]);

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`event-comments-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_comments", filter: `event_id=eq.${eventId}` },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, eventId, fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return alert("請先登入才能留言！");
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("event_comments").insert({
        event_id: eventId,
        user_id: currentUser.id,
        tag: selectedTag,
        content: content.trim(),
      });

      if (error) throw error;
      setContent("");
      fetchComments();
    } catch (err: any) {
      alert("發佈失敗：" + (err.message || "請檢查權限設定"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("確定要刪除這則留言嗎？")) return;
    const { error } = await supabase.from("event_comments").delete().eq("id", commentId);
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
    }
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString("zh-HK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 mt-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-400" /> 活動討論大廳
        </h3>
        <span className="text-xs text-zinc-500">{comments.length} 則留言</span>
      </div>

      {currentUser ? (
        <form onSubmit={handleSubmit} className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setSelectedTag(tag.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                  selectedTag === tag.id
                    ? tag.color + " ring-1 ring-white/20 shadow-sm"
                    : "bg-slate-900 border-slate-800 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              maxLength={100}
              placeholder="詢問球路資訊、尋找共乘夥伴..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-black text-xs transition flex items-center gap-1.5 shrink-0"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> 發送</>}
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 bg-slate-950 rounded-2xl text-center text-xs text-zinc-400 border border-slate-800">
          登入會員後即可參與活動留言討論。
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-zinc-500 text-xs font-mono">載入留言...</div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center text-zinc-500 text-xs font-bold">尚無人發言，快來搶第一條留言吧！</div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1 divide-y divide-slate-800/40">
          {comments.map(comment => {
            const tagInfo = TAG_OPTIONS.find(t => t.id === comment.tag) || TAG_OPTIONS[0];
            const isMyComment = currentUser?.id === comment.user_id;

            return (
              <div key={comment.id} className="pt-3 first:pt-0 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black shrink-0 overflow-hidden mt-0.5"
                    style={{ backgroundImage: comment.user?.avatar_url ? `url(${comment.user.avatar_url})` : "none", backgroundSize: "cover" }}
                  >
                    {!comment.user?.avatar_url && (comment.user?.full_name?.[0] || "?")}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white truncate">
                        {comment.user?.full_name || "匿名球友"}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tagInfo.color}`}>
                        {tagInfo.label}
                      </span>
                      <span className="text-[10px] text-zinc-500">{formatTime(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-zinc-300 mt-1 leading-relaxed break-words">{comment.content}</p>
                  </div>
                </div>

                {(isMyComment || isOrganizer) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(comment.id)}
                    className="text-zinc-600 hover:text-red-400 p-1 transition shrink-0"
                    title="刪除留言"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}