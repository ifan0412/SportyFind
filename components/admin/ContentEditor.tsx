"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CONTENT_CATEGORIES, CONTENT_SPORTS, slugify } from "@/lib/content/constants";
import type { ContentLink, ContentPost } from "@/lib/types/content";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";

interface ContentEditorProps {
  post?: ContentPost;
}

const inputClass =
  "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none";
const labelClass = "text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-1.5 block";

export function ContentEditor({ post }: ContentEditorProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const isEdit = Boolean(post);

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(post?.cover_image_url ?? "");
  const [category, setCategory] = useState(post?.category ?? "general");
  const [sport, setSport] = useState(post?.sport ?? "");
  const [status, setStatus] = useState<"draft" | "published">(post?.status ?? "draft");
  const [links, setLinks] = useState<ContentLink[]>(
    (post?.links?.length ? post.links : [{ label: "", url: "" }]) as ContentLink[]
  );
  const [metaTitle, setMetaTitle] = useState(post?.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(post?.meta_description ?? "");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleCoverUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${post?.id || Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = `content/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("highlights").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("highlights").getPublicUrl(filePath);
      setCoverImageUrl(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "封面圖片上傳失敗");
    } finally {
      setUploading(false);
    }
  };

  const updateLink = (index: number, field: keyof ContentLink, value: string) => {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const addLink = () => setLinks((prev) => [...prev, { label: "", url: "" }]);
  const removeLink = (index: number) => setLinks((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("請填寫標題");
      return;
    }
    if (!slug.trim()) {
      setError("請填寫網址代稱 (slug)");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("請先登入");

      const cleanLinks = links.filter((l) => l.label.trim() && l.url.trim());
      const now = new Date().toISOString();
      const payload = {
        slug: slug.trim(),
        title: title.trim(),
        excerpt: excerpt.trim() || null,
        body: body.trim(),
        cover_image_url: coverImageUrl.trim() || null,
        category,
        sport: sport || null,
        status,
        links: cleanLinks,
        meta_title: metaTitle.trim() || null,
        meta_description: metaDescription.trim() || null,
        author_id: user.id,
        published_at: status === "published" ? (post?.published_at || now) : null,
      };

      if (isEdit && post) {
        const { error: updateError } = await supabase.from("content_posts").update(payload).eq("id", post.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("content_posts").insert(payload);
        if (insertError) throw insertError;
      }

      router.push("/admin/content");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold">
          {error}
        </div>
      )}

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <h2 className="text-sm font-black text-white">基本資料</h2>

        <div>
          <label className={labelClass}>標題 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className={inputClass}
            placeholder="文章標題"
          />
        </div>

        <div>
          <label className={labelClass}>網址代稱 (slug) *</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className={inputClass}
            placeholder="my-article-slug"
          />
          <p className="text-[11px] text-zinc-600 mt-1">公開網址：/content/{slug || "..."}</p>
        </div>

        <div>
          <label className={labelClass}>摘要</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            className={inputClass}
            placeholder="列表頁與搜尋結果顯示的簡短描述"
          />
        </div>

        <div>
          <label className={labelClass}>內文 *</label>
          <RichTextEditor value={body} onChange={setBody} placeholder="撰寫文章內容，可插入圖片、標題、清單與連結…" />
        </div>
      </section>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <h2 className="text-sm font-black text-white">封面圖片</h2>

        {coverImageUrl && (
          <div className="relative aspect-[16/9] max-w-md rounded-xl overflow-hidden border border-slate-700">
            <Image src={coverImageUrl} alt="Cover preview" fill className="object-cover" sizes="400px" />
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-center">
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-white cursor-pointer transition">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {uploading ? "上傳中..." : "上傳圖片"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCoverUpload(file);
              }}
            />
          </label>
          {coverImageUrl && (
            <button
              type="button"
              onClick={() => setCoverImageUrl("")}
              className="text-xs font-bold text-red-400 hover:text-red-300"
            >
              移除封面
            </button>
          )}
        </div>

        <div>
          <label className={labelClass}>或貼上圖片網址</label>
          <input
            type="url"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            className={inputClass}
            placeholder="https://..."
          />
        </div>
      </section>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <h2 className="text-sm font-black text-white">分類與狀態</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>功能分類</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              {CONTENT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>運動項目（選填）</label>
            <select value={sport} onChange={(e) => setSport(e.target.value)} className={inputClass}>
              <option value="">— 不限 —</option>
              {CONTENT_SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>發佈狀態</label>
          <div className="flex gap-3">
            {(["draft", "published"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                  status === s
                    ? s === "published"
                      ? "bg-green-600 text-white"
                      : "bg-amber-600 text-white"
                    : "bg-slate-800 text-zinc-400 hover:text-white"
                }`}
              >
                {s === "published" ? "已發佈" : "草稿"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-white">相關連結</h2>
          <button
            type="button"
            onClick={addLink}
            className="inline-flex items-center gap-1 text-xs font-black text-blue-400 hover:text-blue-300"
          >
            <Plus className="w-3.5 h-3.5" /> 新增連結
          </button>
        </div>

        {links.map((link, i) => (
          <div key={i} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className={labelClass}>標籤</label>
              <input
                type="text"
                value={link.label}
                onChange={(e) => updateLink(i, "label", e.target.value)}
                className={inputClass}
                placeholder="例如：尋找教練"
              />
            </div>
            <div className="flex-[2] w-full">
              <label className={labelClass}>網址</label>
              <input
                type="text"
                value={link.url}
                onChange={(e) => updateLink(i, "url", e.target.value)}
                className={inputClass}
                placeholder="/coaches 或 https://..."
              />
            </div>
            {links.length > 1 && (
              <button
                type="button"
                onClick={() => removeLink(i)}
                className="p-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition shrink-0"
                aria-label="移除連結"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <h2 className="text-sm font-black text-white">SEO</h2>
        <div>
          <label className={labelClass}>Meta 標題（選填）</label>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            className={inputClass}
            placeholder="留空則使用文章標題"
          />
        </div>
        <div>
          <label className={labelClass}>Meta 描述（選填）</label>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            rows={2}
            className={inputClass}
            placeholder="搜尋引擎顯示的描述"
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-black transition"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit ? "儲存變更" : "建立文章"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/content")}
          className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-zinc-300 transition"
        >
          取消
        </button>
      </div>
    </form>
  );
}
