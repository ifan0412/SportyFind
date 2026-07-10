"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { appConfirm } from "@/lib/app-dialog";
import { Loader2, Trash2, Users, Calendar } from "lucide-react";
import { toast } from "sonner";
import { getSportCategory } from "@/lib/sports-categories";

interface AdminTeam {
  id: string;
  name_en: string;
  name_zh: string | null;
  sport_category: string | null;
  created_at: string;
  created_by: string;
  member_count: number;
}

interface AdminEvent {
  id: string;
  title: string;
  start_time: string | null;
  creator_id: string | null;
  host_name: string | null;
  registration_count: number;
  status: string | null;
}

export default function AdminModerationPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [tab, setTab] = useState<"teams" | "events">("teams");
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [teamsRes, eventsRes] = await Promise.all([
      supabase.rpc("admin_list_teams"),
      supabase.rpc("admin_list_events"),
    ]);
    if (teamsRes.error || eventsRes.error) {
      setError(teamsRes.error?.message || eventsRes.error?.message || "載入失敗");
      setTeams([]);
      setEvents([]);
    } else {
      setTeams((teamsRes.data as AdminTeam[]) || []);
      setEvents((eventsRes.data as AdminEvent[]) || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteTeam = async (team: AdminTeam) => {
    const label = team.name_zh || team.name_en;
    const confirmed = await appConfirm({
      title: "移除群組",
      message: `確定要移除群組「${label}」嗎？所有成員紀錄將被刪除，群組管理員將收到通知。此操作無法復原。`,
      destructive: true,
      confirmLabel: "確認移除",
    });
    if (!confirmed) return;

    setActingId(team.id);
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_delete_team", {
        p_team_id: team.id,
      });
      if (rpcError) throw rpcError;
      const result = data as { success?: boolean; message?: string };
      if (!result?.success) {
        toast.error(result?.message || "移除失敗");
        return;
      }
      toast.success(result.message || "已移除群組");
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "移除失敗");
    } finally {
      setActingId(null);
    }
  };

  const handleDeleteEvent = async (event: AdminEvent) => {
    const confirmed = await appConfirm({
      title: "移除活動",
      message: `確定要移除活動「${event.title}」嗎？主辦方與已報名參加者將收到通知。此操作無法復原。`,
      destructive: true,
      confirmLabel: "確認移除",
    });
    if (!confirmed) return;

    setActingId(event.id);
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_delete_event", {
        p_event_id: event.id,
      });
      if (rpcError) throw rpcError;
      const result = data as { success?: boolean; message?: string };
      if (!result?.success) {
        toast.error(result?.message || "移除失敗");
        return;
      }
      toast.success(result.message || "已移除活動");
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "移除失敗");
    } finally {
      setActingId(null);
    }
  };

  return (
    <AdminShell title="群組與活動管理" wide>
      <p className="text-sm text-zinc-500 mb-6 -mt-2">
        網站管理員可移除違規或問題群組／活動，並自動通知相關管理員或主辦方。
      </p>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab("teams")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border transition ${
            tab === "teams"
              ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
              : "bg-slate-900 border-slate-800 text-zinc-400"
          }`}
        >
          <Users className="w-4 h-4" />
          群組 ({teams.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("events")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border transition ${
            tab === "events"
              ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
              : "bg-slate-900 border-slate-800 text-zinc-400"
          }`}
        >
          <Calendar className="w-4 h-4" />
          活動 ({events.length})
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error.includes("not authorized") ? "無權限存取" : error}
          {error.includes("function") && (
            <p className="text-xs mt-2 text-red-300/80">請在 Supabase 執行 migration 041_admin_user_moderation.sql</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : tab === "teams" ? (
        <div className="space-y-2">
          {teams.length === 0 ? (
            <p className="text-center text-zinc-500 py-12 text-sm">尚無群組</p>
          ) : (
            teams.map((team) => {
              const sport = getSportCategory(team.sport_category);
              return (
                <div
                  key={team.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white truncate">
                      {sport?.emoji} {team.name_zh || team.name_en}
                    </p>
                    <p className="text-xs text-zinc-500">{team.name_en}</p>
                    <p className="text-[11px] text-zinc-600 mt-1">
                      {team.member_count} 位成員 · {new Date(team.created_at).toLocaleDateString("zh-HK")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/team/${team.id}`}
                      target="_blank"
                      className="text-xs font-bold text-blue-400 hover:text-blue-300"
                    >
                      查看
                    </Link>
                    <button
                      type="button"
                      disabled={actingId === team.id}
                      onClick={() => handleDeleteTeam(team)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {actingId === team.id ? "處理中…" : "移除"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-center text-zinc-500 py-12 text-sm">尚無活動</p>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white truncate">{event.title}</p>
                  <p className="text-xs text-zinc-500">
                    主辦：{event.host_name || "未知"} · {event.registration_count} 人報名
                  </p>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    {event.start_time
                      ? new Date(event.start_time).toLocaleString("zh-HK")
                      : "未設定時間"}
                    {event.status ? ` · ${event.status}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/events/${event.id}`}
                    target="_blank"
                    className="text-xs font-bold text-blue-400 hover:text-blue-300"
                  >
                    查看
                  </Link>
                  <button
                    type="button"
                    disabled={actingId === event.id}
                    onClick={() => handleDeleteEvent(event)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {actingId === event.id ? "處理中…" : "移除"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </AdminShell>
  );
}
