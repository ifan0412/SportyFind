"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { POPUP_TARGET_PAGES } from "@/lib/announcements/constants";
import { isAnnouncementActive } from "@/lib/announcements/active";
import type { SitePopupAnnouncement } from "@/lib/announcements/types";
import { appConfirm } from "@/lib/app-dialog";
import {
  Edit,
  Eye,
  Loader2,
  Plus,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

function pageLabels(paths: string[]): string {
  return paths
    .map((p) => POPUP_TARGET_PAGES.find((t) => t.path === p)?.label ?? p)
    .join("、");
}

export default function AdminAnnouncementsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [items, setItems] = useState<SitePopupAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_popup_announcements")
      .select("*")
      .neq("status", "archived")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setItems([]);
    } else {
      setItems((data as SitePopupAnnouncement[]) || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const toggleLive = async (item: SitePopupAnnouncement) => {
    if (item.activation_mode !== "manual") {
      toast.error("排程模式的 pop-up 請透過時間控制上下架");
      return;
    }
    setActingId(item.id);
    const next = !item.is_live;
    const { error } = await supabase
      .from("site_popup_announcements")
      .update({ is_live: next })
      .eq("id", item.id);
    if (error) toast.error(error.message);
    else {
      toast.success(next ? "已上線" : "已下線");
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, is_live: next } : p))
      );
    }
    setActingId(null);
  };

  const handleArchive = async (item: SitePopupAnnouncement) => {
    if (
      !(await appConfirm({
        title: "下架並封存",
        message: `確定封存「${item.title}」？封存後將不再顯示。`,
        destructive: true,
        confirmLabel: "確認封存",
      }))
    ) {
      return;
    }
    setActingId(item.id);
    const { error } = await supabase
      .from("site_popup_announcements")
      .update({ status: "archived", is_live: false })
      .eq("id", item.id);
    if (error) toast.error(error.message);
    else {
      toast.success("已封存");
      setItems((prev) => prev.filter((p) => p.id !== item.id));
    }
    setActingId(null);
  };

  return (
    <AdminShell
      title="Pop-up 公告"
      wide
      action={
        <Link
          href="/admin/announcements/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-black transition"
        >
          <Plus className="w-4 h-4" /> 新增 Pop-up
        </Link>
      }
    >
      {loading ? (
        <div className="py-20 flex justify-center text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl text-zinc-500 text-sm">
          尚無 pop-up，點擊「新增 Pop-up」開始建立。
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const live = isAnnouncementActive(item);
            return (
              <div
                key={item.id}
                className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        item.status === "published"
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {item.status === "published" ? "已發佈" : "草稿"}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500">
                      {item.content_type === "text" ? "文字" : "圖片"}
                    </span>
                    {item.status === "published" && (
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          live
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-500 border border-zinc-600/20"
                        }`}
                      >
                        {live ? "顯示中" : "未顯示"}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-zinc-600">
                      {item.activation_mode === "manual" ? "手動" : "排程"}
                    </span>
                  </div>
                  <h2 className="text-sm font-black text-white truncate">{item.title}</h2>
                  <p className="text-[11px] text-zinc-600 mt-0.5 truncate">
                    頁面：{pageLabels(item.target_pages)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Link
                    href={`/admin/announcements/${item.id}/preview`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-300 text-xs font-bold border border-slate-700 transition"
                  >
                    <Eye className="w-3.5 h-3.5" /> 預覽
                  </Link>
                  <Link
                    href={`/admin/announcements/${item.id}/edit`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-300 text-xs font-bold border border-slate-700 transition"
                  >
                    <Edit className="w-3.5 h-3.5" /> 編輯
                  </Link>
                  {item.status === "published" && item.activation_mode === "manual" && (
                    <button
                      type="button"
                      disabled={actingId === item.id}
                      onClick={() => toggleLive(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-300 text-xs font-bold border border-slate-700 transition disabled:opacity-50"
                    >
                      {item.is_live ? (
                        <>
                          <PowerOff className="w-3.5 h-3.5" /> 下線
                        </>
                      ) : (
                        <>
                          <Power className="w-3.5 h-3.5" /> 上線
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() => handleArchive(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
