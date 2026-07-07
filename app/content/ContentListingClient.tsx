"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";
import { ContentCard } from "@/components/content/ContentCard";
import { CategoryFilterModal } from "@/components/CategoryFilterModal";
import { SportFilterModal } from "@/components/SportFilterModal";
import { CONTENT_CATEGORIES, normalizeCategories, normalizeSports } from "@/lib/content/constants";
import { stripHtml } from "@/lib/content/body";
import type { ContentPost } from "@/lib/types/content";
import { Sparkles, Loader2, Search } from "lucide-react";

export default function ContentListingClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("content_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false });

      if (error) console.error("Failed to load content:", error.message);
      setPosts((data as ContentPost[]) || []);
      setLoading(false);
    };
    fetchPosts();
  }, [supabase]);

  const filtered = useMemo(() => {
    let result = posts;

    if (selectedCategories.length > 0) {
      result = result.filter((p) => {
        const cats = normalizeCategories(p.categories);
        return selectedCategories.some((c) => cats.includes(c));
      });
    }

    if (selectedSports.length > 0) {
      result = result.filter((p) => {
        const sports = normalizeSports(p.sports);
        return selectedSports.some((s) => sports.includes(s));
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.excerpt || "").toLowerCase().includes(q) ||
          stripHtml(p.body).toLowerCase().includes(q)
      );
    }

    return result;
  }, [posts, selectedCategories, selectedSports, search]);

  const categoryOptions = CONTENT_CATEGORIES.map((c) => ({ id: c.id, label: c.label }));

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

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 md:p-5 rounded-3xl mb-8 shadow-lg flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="search"
              placeholder="搜尋文章標題或內容..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-violet-500 outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className={`w-full md:w-auto flex items-center justify-between gap-3 px-5 py-3 rounded-xl border text-sm font-bold transition flex-shrink-0 cursor-pointer ${
              selectedCategories.length > 0
                ? "bg-violet-600/10 border-violet-500 text-violet-400"
                : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"
            }`}
          >
            <span>功能分類 {selectedCategories.length > 0 ? `(${selectedCategories.length})` : "(全部)"}</span>
            <span className="text-[10px]">▼</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSportModalOpen(true)}
            className={`w-full md:w-auto flex items-center justify-between gap-3 px-5 py-3 rounded-xl border text-sm font-bold transition flex-shrink-0 cursor-pointer ${
              selectedSports.length > 0
                ? "bg-blue-600/10 border-blue-500 text-blue-400"
                : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"
            }`}
          >
            <span>運動項目 {selectedSports.length > 0 ? `(${selectedSports.length})` : "(全部)"}</span>
            <span className="text-[10px]">▼</span>
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
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

      <CategoryFilterModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="篩選功能分類"
        subtitle={`可多選 · 已選 ${selectedCategories.length} 項`}
        options={categoryOptions}
        selected={selectedCategories}
        onApply={setSelectedCategories}
        accent="violet"
      />

      <SportFilterModal
        isOpen={isSportModalOpen}
        onClose={() => setIsSportModalOpen(false)}
        selectedSports={selectedSports}
        onApply={setSelectedSports}
      />
    </div>
  );
}
