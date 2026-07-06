"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";
import { ContentCard } from "@/components/content/ContentCard";
import { CONTENT_CATEGORIES, CONTENT_SPORTS } from "@/lib/content/constants";
import { getSportCategory } from "@/lib/sports-categories";
import { stripHtml } from "@/lib/content/body";
import type { ContentPost } from "@/lib/types/content";
import { Sparkles, Loader2, Search } from "lucide-react";

const filterChip =
  "px-3 py-1.5 rounded-full text-xs font-bold transition border";

export default function ContentListingClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");

  const categoryFilter = searchParams.get("category") || "";
  const sportFilter = searchParams.get("sport") || "";

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      let query = supabase
        .from("content_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false });

      if (categoryFilter) query = query.contains("categories", [categoryFilter]);
      if (sportFilter) query = query.contains("sports", [sportFilter]);

      const { data, error } = await query;
      if (error) console.error("Failed to load content:", error.message);
      setPosts((data as ContentPost[]) || []);
      setLoading(false);
    };
    fetchPosts();
  }, [supabase, categoryFilter, sportFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return posts;
    const q = search.toLowerCase();
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.excerpt || "").toLowerCase().includes(q) ||
        stripHtml(p.body).toLowerCase().includes(q)
    );
  }, [posts, search]);

  const setFilter = (key: "category" | "sport", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/content?${params.toString()}`);
  };

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton label="返回首頁" href="/" />

        <header className="mt-6 mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Sports Tips</h1>
              <p className="text-sm text-zinc-500 mt-0.5">Train smarter · Eat better · Play longer</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Expert guides on training, nutrition, recovery, and getting more from your sport — curated for the SportyFind community.
          </p>
        </header>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="search"
              placeholder="搜尋文章標題或內容..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none"
            />
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-wider">功能分類</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFilter("category", "")}
                  className={`${filterChip} ${
                    !categoryFilter
                      ? "bg-blue-600/20 border-blue-500 text-blue-300"
                      : "bg-slate-950 border-slate-800 text-zinc-400 hover:border-slate-600 hover:text-white"
                  }`}
                >
                  全部
                </button>
                {CONTENT_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFilter("category", c.id)}
                    className={`${filterChip} ${
                      categoryFilter === c.id
                        ? "bg-blue-600/20 border-blue-500 text-blue-300"
                        : "bg-slate-950 border-slate-800 text-zinc-400 hover:border-slate-600 hover:text-white"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-wider">運動項目</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFilter("sport", "")}
                  className={`${filterChip} ${
                    !sportFilter
                      ? "bg-amber-600/20 border-amber-500 text-amber-300"
                      : "bg-slate-950 border-slate-800 text-zinc-400 hover:border-slate-600 hover:text-white"
                  }`}
                >
                  全部運動
                </button>
                {CONTENT_SPORTS.map((s) => {
                  const sport = getSportCategory(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFilter("sport", s)}
                      className={`${filterChip} ${
                        sportFilter === s
                          ? "bg-amber-600/20 border-amber-500 text-amber-300"
                          : "bg-slate-950 border-slate-800 text-zinc-400 hover:border-slate-600 hover:text-white"
                      }`}
                    >
                      {sport ? `${sport.emoji} ${sport.labelZh}` : s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-sm font-bold border border-dashed border-slate-800 rounded-2xl">
            暫無符合條件的文章，請稍後再來或調整篩選條件。
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post) => (
              <ContentCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
