"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  POPUP_ACTIVATION_MODES,
  POPUP_DISMISS_MODES,
  POPUP_TARGET_PAGES,
} from "@/lib/announcements/constants";
import type {
  PopupActivationMode,
  PopupContentType,
  PopupDismissMode,
  PopupStatus,
  SitePopupAnnouncement,
} from "@/lib/announcements/types";
import { Eye, ImagePlus, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface AnnouncementEditorProps {
  announcement?: SitePopupAnnouncement;
}

const inputClass =
  "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none";
const labelClass =
  "text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-1.5 block";

function toLocalDatetimeValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDatetimeValue(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function AnnouncementEditor({ announcement }: AnnouncementEditorProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const isEdit = Boolean(announcement);

  const [title, setTitle] = useState(announcement?.title ?? "");
  const [contentType, setContentType] = useState<PopupContentType>(
    announcement?.content_type ?? "text"
  );
  const [textContent, setTextContent] = useState(announcement?.text_content ?? "");
  const [imageDesktopUrl, setImageDesktopUrl] = useState(
    announcement?.image_desktop_url ?? ""
  );
  const [imageMobileUrl, setImageMobileUrl] = useState(
    announcement?.image_mobile_url ?? ""
  );
  const [targetPages, setTargetPages] = useState<string[]>(
    announcement?.target_pages?.length
      ? [...announcement.target_pages]
      : ["/"]
  );
  const [dismissMode, setDismissMode] = useState<PopupDismissMode>(
    announcement?.dismiss_mode ?? "session"
  );
  const [activationMode, setActivationMode] = useState<PopupActivationMode>(
    announcement?.activation_mode ?? "manual"
  );
  const [isLive, setIsLive] = useState(announcement?.is_live ?? false);
  const [startsAt, setStartsAt] = useState(toLocalDatetimeValue(announcement?.starts_at));
  const [endsAt, setEndsAt] = useState(toLocalDatetimeValue(announcement?.ends_at));

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"desktop" | "mobile" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const togglePage = (path: string) => {
    setTargetPages((prev) => {
      if (prev.includes(path)) {
        const next = prev.filter((p) => p !== path);
        return next.length > 0 ? next : prev;
      }
      return [...prev, path];
    });
  };

  const uploadImage = async (file: File, variant: "desktop" | "mobile") => {
    setUploading(variant);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${announcement?.id || Date.now()}-${variant}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = `announcements/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("highlights")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("highlights").getPublicUrl(filePath);
      if (variant === "desktop") setImageDesktopUrl(data.publicUrl);
      else setImageMobileUrl(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "圖片上傳失敗");
    } finally {
      setUploading(null);
    }
  };

  const validate = (nextStatus: PopupStatus): string | null => {
    if (!title.trim()) return "請填寫內部名稱";
    if (!targetPages.length) return "請至少選擇一個顯示頁面";

    if (contentType === "text" && !textContent.trim()) {
      return "請填寫文字內容";
    }
    if (contentType === "image") {
      if (!imageDesktopUrl.trim()) return "請上傳桌面版圖片";
      if (!imageMobileUrl.trim()) return "請上傳手機版圖片";
    }

    if (activationMode === "scheduled") {
      if (!startsAt.trim()) return "排程模式請設定開始時間";
      if (!endsAt.trim()) return "排程模式請設定結束時間";
      const start = new Date(startsAt);
      const end = new Date(endsAt);
      if (end <= start) return "結束時間必須晚於開始時間";
    }

    if (nextStatus === "published" && activationMode === "manual" && !startsAt && !isLive) {
      return "手動模式發佈時請勾選「立即上線」，或設定預約開始時間";
    }

    return null;
  };

  const save = async (nextStatus: PopupStatus) => {
    setError(null);
    const validationError = validate(nextStatus);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("請先登入");

      const payload = {
        title: title.trim(),
        content_type: contentType,
        text_content: contentType === "text" ? textContent.trim() : null,
        image_desktop_url: contentType === "image" ? imageDesktopUrl.trim() : null,
        image_mobile_url: contentType === "image" ? imageMobileUrl.trim() : null,
        target_pages: targetPages,
        dismiss_mode: dismissMode,
        activation_mode: activationMode,
        status: nextStatus,
        is_live:
          activationMode === "manual"
            ? isLive || (nextStatus === "published" && !startsAt)
            : false,
        starts_at: fromLocalDatetimeValue(startsAt),
        ends_at: fromLocalDatetimeValue(endsAt),
        author_id: user.id,
      };

      if (isEdit && announcement) {
        const { error: updateError } = await supabase
          .from("site_popup_announcements")
          .update(payload)
          .eq("id", announcement.id);
        if (updateError) throw updateError;
        toast.success(nextStatus === "published" ? "已發佈 pop-up" : "已儲存草稿");
        router.push("/admin/announcements");
        router.refresh();
        return;
      }

      const { data, error: insertError } = await supabase
        .from("site_popup_announcements")
        .insert(payload)
        .select("id")
        .single();
      if (insertError) throw insertError;

      toast.success(nextStatus === "published" ? "已發佈 pop-up" : "已儲存草稿");
      router.push(`/admin/announcements/${data.id}/edit`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  const previewHref =
    isEdit && announcement
      ? `/admin/announcements/${announcement.id}/preview`
      : null;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save("draft");
      }}
    >
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <section className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-black text-white">基本設定</h2>
        <div>
          <label className={labelClass}>內部名稱（僅管理員可見）</label>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：新年活動公告"
          />
        </div>

        <div>
          <label className={labelClass}>內容類型</label>
          <div className="flex flex-wrap gap-2">
            {(["text", "image"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setContentType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-black border transition ${
                  contentType === type
                    ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                    : "bg-slate-950 border-slate-800 text-zinc-400 hover:text-white"
                }`}
              >
                {type === "text" ? "純文字" : "純圖片"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-black text-white">內容</h2>

        {contentType === "text" && (
          <div>
            <label className={labelClass}>文字內容</label>
            <textarea
              className={`${inputClass} min-h-[140px] resize-y`}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="輸入要顯示的公告文字…"
            />
          </div>
        )}

        {contentType === "image" && (
          <div className="grid sm:grid-cols-2 gap-4">
            {(["desktop", "mobile"] as const).map((variant) => {
              const url = variant === "desktop" ? imageDesktopUrl : imageMobileUrl;
              const label = variant === "desktop" ? "桌面版圖片" : "手機版圖片";
              return (
                <div key={variant} className="space-y-2">
                  <label className={labelClass}>{label}</label>
                  {url ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                      <Image
                        src={url}
                        alt={label}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="aspect-video rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-zinc-600 text-xs">
                      尚未上傳
                    </div>
                  )}
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-zinc-300 cursor-pointer hover:border-blue-500/50 transition">
                    <ImagePlus className="w-4 h-4" />
                    {uploading === variant ? "上傳中…" : "上傳圖片"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadImage(file, variant);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-black text-white">顯示頁面</h2>
        <div className="flex flex-wrap gap-2">
          {POPUP_TARGET_PAGES.map(({ path, label }) => (
            <button
              key={path}
              type="button"
              onClick={() => togglePage(path)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                targetPages.includes(path)
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                  : "bg-slate-950 border-slate-800 text-zinc-500 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-black text-white">關閉行為</h2>
        <div className="space-y-2">
          {POPUP_DISMISS_MODES.map((mode) => (
            <label
              key={mode.value}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                dismissMode === mode.value
                  ? "border-blue-500/40 bg-blue-500/10"
                  : "border-slate-800 bg-slate-950 hover:border-slate-700"
              }`}
            >
              <input
                type="radio"
                name="dismiss_mode"
                checked={dismissMode === mode.value}
                onChange={() => setDismissMode(mode.value)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-bold text-white">{mode.label}</span>
                <span className="block text-xs text-zinc-500 mt-0.5">{mode.description}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-black text-white">上下架排程</h2>
        <div className="space-y-2">
          {POPUP_ACTIVATION_MODES.map((mode) => (
            <label
              key={mode.value}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                activationMode === mode.value
                  ? "border-blue-500/40 bg-blue-500/10"
                  : "border-slate-800 bg-slate-950 hover:border-slate-700"
              }`}
            >
              <input
                type="radio"
                name="activation_mode"
                checked={activationMode === mode.value}
                onChange={() => setActivationMode(mode.value)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-bold text-white">{mode.label}</span>
                <span className="block text-xs text-zinc-500 mt-0.5">{mode.description}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className={labelClass}>
              {activationMode === "scheduled" ? "開始時間 *" : "預約開始（選填）"}
            </label>
            <input
              type="datetime-local"
              className={inputClass}
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              {activationMode === "scheduled" ? "結束時間 *" : "自動結束（選填）"}
            </label>
            <input
              type="datetime-local"
              className={inputClass}
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>

        {activationMode === "manual" && (
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={isLive}
              onChange={(e) => setIsLive(e.target.checked)}
              className="rounded"
            />
            立即上線（發佈後即時顯示；之後可在列表頁手動上下架）
          </label>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-black border border-slate-700 transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          儲存草稿
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => save("published")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-black transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          發佈
        </button>

        {previewHref && (
          <Link
            href={previewHref}
            target="_blank"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-sm font-black border border-amber-500/30 transition"
          >
            <Eye className="w-4 h-4" />
            預覽
          </Link>
        )}
      </div>
    </form>
  );
}
