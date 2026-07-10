"use client";

import { toast } from "sonner";
import { appConfirm } from "@/lib/app-dialog";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { getCategoryLabel, normalizeCategories, normalizeSports } from "@/lib/content/constants";
import type { ContentPost } from "@/lib/types/content";
import { Edit, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";

export default function AdminContentPage() {
  return <AdminContentList />;
}

function AdminContentList() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("content_posts")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) console.error(error);
    setPosts((data as ContentPost[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async (post: ContentPost) => {
    if (!(await appConfirm(`確定刪除「${post.title}」？此操作無法復原。`))) return;
    setDeletingId(post.id);
    const { error } = await supabase.from("content_posts").delete().eq("id", post.id);
    if (error) toast.error(error.message);
    else setPosts((prev) => prev.filter((p) => p.id !== post.id));
    setDeletingId(null);
  };

  return (
    <AdminShell
      title="內容管理"
      action={
        <Link
          href="/admin/content/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-black transition"
        >
          <Plus className="w-4 h-4" /> 新增文章
        </Link>
      }
    >
      {loading ? (
        <div className="py-20 flex justify-center text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl text-zinc-500 text-sm">
          尚無文章，點擊「新增文章」開始撰寫。
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      post.status === "published"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {post.status === "published" ? "已發佈" : "草稿"}
                  </span>
                  {normalizeCategories(post.categories).map((c) => (
                    <span key={c} className="text-[10px] font-bold text-zinc-500">{getCategoryLabel(c)}</span>
                  ))}
                  {normalizeSports(post.sports).map((s) => (
                    <span key={s} className="text-[10px] font-bold text-amber-500/80">{s}</span>
                  ))}
                </div>
                <h2 className="text-sm font-black text-white truncate">{post.title}</h2>
                <p className="text-[11px] text-zinc-600 mt-0.5">/content/{post.slug}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {post.status === "published" && (
                  <Link
                    href={`/content/${post.slug}`}
                    target="_blank"
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white transition"
                    title="預覽"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}
                <Link
                  href={`/admin/content/${post.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition"
                >
                  <Edit className="w-3.5 h-3.5" /> 編輯
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(post)}
                  disabled={deletingId === post.id}
                  className="p-2.5 rounded-xl text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition"
                  title="刪除"
                >
                  {deletingId === post.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
