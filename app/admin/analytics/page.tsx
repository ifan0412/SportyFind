"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Activity,
  Calendar,
  Eye,
  FileText,
  Loader2,
  Shield,
  Users,
} from "lucide-react";
import { FormSelect } from "@/components/ui/form-select";

interface DayCount {
  date: string;
  count: number;
}

interface TopPage {
  path: string;
  count: number;
}

interface PlatformStats {
  totals: {
    users: number;
    events: number;
    teams: number;
    content_posts: number;
    page_views: number;
    coaches: number;
    physios: number;
  };
  registrations_by_day: DayCount[];
  events_by_day: DayCount[];
  page_views_by_day: DayCount[];
  top_pages: TopPage[];
  period_days: number;
}

function MiniBarChart({ data, color }: { data: DayCount[]; color: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  if (data.length === 0) {
    return <p className="text-xs text-zinc-600 py-6 text-center">此期間暫無數據</p>;
  }

  return (
    <div className="flex items-end gap-1 h-28 pt-2">
      {data.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div
            className={`w-full rounded-t ${color} transition-all`}
            style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 0)}%` }}
            title={`${d.date}: ${d.count}`}
          />
          <span className="text-[8px] text-zinc-600 truncate w-full text-center">
            {d.date.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg ${accent}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-black text-white">{value.toLocaleString()}</p>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("admin_get_platform_stats", { p_days: days });
    if (rpcError) {
      setError(rpcError.message);
      setStats(null);
    } else {
      setStats(data as PlatformStats);
    }
    setLoading(false);
  }, [supabase, days]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <AdminShell title="數據分析" wide>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 -mt-2">
        <p className="text-sm text-zinc-500">
          內建第一方追蹤（頁面瀏覽）＋平台數據趨勢。尚未整合 Google Analytics 等第三方工具。
        </p>
        <FormSelect
          value={String(days)}
          onValueChange={(v) => setDays(Number(v))}
          triggerClassName="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500 w-auto min-w-[8rem]"
          options={[
            { value: "7", label: "過去 7 天" },
            { value: "30", label: "過去 30 天" },
            { value: "90", label: "過去 90 天" },
          ]}
        />
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
          {(error.includes("site_page_views") || error.includes("function")) && (
            <p className="text-xs mt-2 text-red-300/80">請在 Supabase 執行 migration 006_admin_analytics.sql</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : stats ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="註冊用戶" value={stats.totals.users} icon={Users} accent="bg-blue-500/10 text-blue-400" />
            <StatCard label="賽事/活動" value={stats.totals.events} icon={Calendar} accent="bg-red-500/10 text-red-400" />
            <StatCard label="隊伍" value={stats.totals.teams} icon={Shield} accent="bg-purple-500/10 text-purple-400" />
            <StatCard label="頁面瀏覽" value={stats.totals.page_views} icon={Eye} accent="bg-green-500/10 text-green-400" />
            <StatCard label="教練" value={stats.totals.coaches} icon={Activity} accent="bg-orange-500/10 text-orange-400" />
            <StatCard label="物理治療師" value={stats.totals.physios} icon={Activity} accent="bg-green-500/10 text-green-400" />
            <StatCard label="已發佈文章" value={stats.totals.content_posts} icon={FileText} accent="bg-yellow-500/10 text-yellow-400" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-sm font-black text-white mb-1">註冊趨勢</h3>
              <p className="text-[11px] text-zinc-600 mb-4">過去 {days} 天新用戶</p>
              <MiniBarChart data={stats.registrations_by_day} color="bg-blue-500" />
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-sm font-black text-white mb-1">賽事/活動建立趨勢</h3>
              <p className="text-[11px] text-zinc-600 mb-4">過去 {days} 天新賽事/活動</p>
              <MiniBarChart data={stats.events_by_day} color="bg-amber-500" />
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-sm font-black text-white mb-1">流量趨勢</h3>
              <p className="text-[11px] text-zinc-600 mb-4">過去 {days} 天頁面瀏覽</p>
              <MiniBarChart data={stats.page_views_by_day} color="bg-emerald-500" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-sm font-black text-white mb-4">熱門頁面（過去 {days} 天）</h3>
            {stats.top_pages.length === 0 ? (
              <p className="text-xs text-zinc-600">尚無瀏覽記錄 — 追蹤會在用戶瀏覽網站後自動開始累積。</p>
            ) : (
              <div className="space-y-2">
                {stats.top_pages.map((p) => (
                  <div key={p.path} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-zinc-300 font-mono truncate">{p.path}</span>
                    <span className="text-zinc-500 font-bold shrink-0">{p.count} 次</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-zinc-600 leading-relaxed">
            <strong className="text-zinc-500">關於追蹤：</strong> 目前使用網站內建的第一方 page view 追蹤（不含第三方 cookie）。
            若需要更進階的分析（地理分佈、轉換漏斗、即時在線人數），可後續整合 Google Analytics 4、Plausible 或 PostHog。
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
