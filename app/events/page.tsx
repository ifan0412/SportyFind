"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { 
  Trophy, Search, Calendar, MapPin, Users, Shield, 
  Plus, Loader2, Filter 
} from "lucide-react";
import Link from "next/link";

const sportsCategories = [
  { id: "all", label: "全部項目", icon: "⚡" },
  { id: "volleyball", label: "排球", icon: "🏐" },
  { id: "tennis", label: "網球", icon: "🎾" },
  { id: "badminton", label: "羽毛球", icon: "🏸" },
  { id: "basketball", label: "籃球", icon: "🏀" },
  { id: "football", label: "足球", icon: "⚽" },
  { id: "table_tennis", label: "乒乓球", icon: "🏓" },
];

export default function EventListingPage() {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 篩選器狀態
  const [selectedSport, setSelectedSport] = useState("all");
  const [selectedRegType, setSelectedRegType] = useState("all"); // 'all' | 'individual' | 'team'
  const [searchQuery, setSearchQuery] = useState("");

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const nowIso = new Date().toISOString();
      
      // 🔥 修正重點：改為抓取 id, name_zh, name_en
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          organizer_team:teams!organizer_team_id (id, name_zh, name_en),
          registrations:event_registrations (id, companion_count, status)
        `)
        .eq("status", "published")
        .gte("end_time", nowIso)
        .order("start_time", { ascending: true });

      if (error) throw error;
      if (data) setEvents(data);
    } catch (err: any) {
      console.error("載入活動失敗詳細資訊:", JSON.stringify(err, null, 2));
      console.error("錯誤細節:", err?.message || err?.details);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // 前端過濾邏輯
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      // 1. 運動類別過濾
      if (selectedSport !== "all" && ev.sport_category !== selectedSport) return false;
      
      // 2. 報名維度過濾
      if (selectedRegType !== "all" && ev.registration_type !== selectedRegType) return false;

      // 3. 關鍵字搜尋 (標題或場地)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ev.title?.toLowerCase().includes(q);
        const matchLoc = ev.location_name?.toLowerCase().includes(q);
        if (!matchTitle && !matchLoc) return false;
      }

      return true;
    });
  }, [events, selectedSport, selectedRegType, searchQuery]);

  // 格式化輸出時間 (AM/PM 12小時制)
  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString("zh-HK", {
      month: "short", day: "numeric", weekday: "short",
      hour: "numeric", minute: "2-digit", hour12: true
    });
  };

  return (
    <div className="bg-slate-950 min-h-screen py-10 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-6xl mx-auto">
        
        {/* 頂部標題與行動呼籲 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-500" /> 運動約戰大廳
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              探索各區即將舉行的排球團練、網球交流賽與球隊聯賽，隨時報名加入！
            </p>
          </div>

          <Link
            href="/events/new"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-black transition shadow-lg shadow-amber-600/20 active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5" /> 發起新活動
          </Link>
        </div>

        {/* 運動項目橫向篩選膠囊 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
          {sportsCategories.map(sport => {
            const isActive = selectedSport === sport.id;
            return (
              <button
                key={sport.id}
                onClick={() => setSelectedSport(sport.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition whitespace-nowrap flex items-center gap-2 shrink-0 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "bg-slate-900 hover:bg-slate-800 text-zinc-400 border border-slate-800"
                }`}
              >
                <span>{sport.icon}</span>
                <span>{sport.label}</span>
              </button>
            );
          })}
        </div>

        {/* 搜尋欄與報名模式切換 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="搜尋活動標題、球館名稱或區域..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
            {[
              { id: "all", label: "全部模式" },
              { id: "individual", label: "👤 個人約戰" },
              { id: "team", label: "🛡️ 球隊對戰" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedRegType(tab.id)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                  selectedRegType === tab.id
                    ? "bg-slate-800 text-white font-black shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 活動卡片網格清單 */}
        {isLoading ? (
          <div className="py-24 text-center text-zinc-500 font-mono flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-500" /> 撈取即將到來的賽事...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/50 border border-slate-800/60 rounded-3xl p-8">
            <Filter className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-zinc-300 mb-1">找不到符合篩選條件的活動</h3>
            <p className="text-xs text-zinc-500 mb-6">試著切換運動類別，或是成為第一個在該領域發起賽事的主辦人！</p>
            <Link
              href="/events/new"
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition"
            >
              發起此運動項目賽事
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(ev => {
              // 計算當前報名總數
              const filledSlots = ev.registrations
                ?.filter((r: any) => r.status === "going" || r.status === "accepted")
                .reduce((sum: number, r: any) => {
                  return sum + (ev.registration_type === "individual" ? (1 + (r.companion_count || 0)) : 1);
                }, 0) || 0;

              const isFull = ev.max_capacity && filledSlots >= ev.max_capacity;
              const sportInfo = sportsCategories.find(s => s.id === ev.sport_category) || { icon: "🏆", label: "運動" };

              return (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between"
                >
                  <div>
                    {/* 頂部標籤區 */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-950 border border-slate-800 text-zinc-300">
                        <span>{sportInfo.icon}</span> {sportInfo.label}
                      </span>

                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black ${
                        ev.registration_type === "individual" 
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {ev.registration_type === "individual" ? "個人制" : "球隊制"}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition leading-snug mb-3 line-clamp-2">
                      {ev.title}
                    </h3>

                    <div className="space-y-2 text-xs text-zinc-400 mb-6">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="font-bold text-zinc-200">{formatDateTime(ev.start_time)}</span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="truncate">{ev.location_name}</span>
                      </div>
                    </div>
                  </div>

                  {/* 底部容量進度條與費用 */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-zinc-500 flex items-center gap-1.5 mb-1">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span>名額狀況</span>
                      </div>
                      <div className="text-xs font-black text-white">
                        {filledSlots} {ev.max_capacity ? `/ ${ev.max_capacity} 席` : "人參賽"}
                        {isFull && <span className="ml-1 text-[10px] text-red-400">(候選)</span>}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500 font-bold">預估費用</div>
                      <div className="text-sm font-black text-amber-400">
                        {ev.fee > 0 ? `HKD $${ev.fee}` : "免費"}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}