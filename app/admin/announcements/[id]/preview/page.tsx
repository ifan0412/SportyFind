"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { SiteAnnouncementPopup } from "@/components/announcements/SiteAnnouncementPopup";
import type { SitePopupAnnouncement } from "@/lib/announcements/types";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function PreviewAnnouncementPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [announcement, setAnnouncement] = useState<SitePopupAnnouncement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("site_popup_announcements")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (fetchError || !data) {
        setError(fetchError?.message || "找不到此 pop-up");
        setAnnouncement(null);
      } else {
        setAnnouncement(data as SitePopupAnnouncement);
        setVisible(true);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  return (
    <AdminShell title="Pop-up 預覽">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/admin/announcements/${id}/edit`}
          className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          返回編輯
        </Link>
        {announcement && visible && (
          <button
            type="button"
            onClick={() => setVisible(true)}
            className="text-xs font-bold text-blue-400 hover:text-blue-300"
          >
            重新顯示
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : error || !announcement ? (
        <div className="py-16 text-center text-red-400 text-sm">{error || "找不到此 pop-up"}</div>
      ) : (
        <div className="relative min-h-[60vh] rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 flex items-center justify-center p-8">
          <p className="absolute top-4 left-4 text-xs text-zinc-600">
            模擬網站頁面背景 — 實際顯示位置取決於你選擇的目標頁面
          </p>
          {!visible && (
            <p className="text-sm text-zinc-500">Pop-up 已關閉。點擊「重新顯示」以再次預覽。</p>
          )}
        </div>
      )}

      {announcement && visible && (
        <SiteAnnouncementPopup
          announcement={announcement}
          onClose={() => setVisible(false)}
          preview
        />
      )}
    </AdminShell>
  );
}
