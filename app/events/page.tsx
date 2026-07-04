"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { 
  Calendar, MapPin, Users, Shield, Trophy, Search, 
  Plus, Loader2, User as UserIcon, Filter, Clock
} from "lucide-react";
import Link from "next/link";

const SPORT_OPTIONS = [
  { id: "all", label: "⚡ 全部項目" },
  { id: "volleyball", label: "🏐 排球" },
  { id: "tennis", label: "🎾 網球" },
  { id: "badminton", label: "🏸 羽毛球" },
  { id: "basketball", label: "🏀 籃球" },
  { id: "football", label: "⚽ 足球" },
  { id: "table_tennis", label: "🏓 乒乓球" },
];

// 🔥 修正：簡化篩選器標籤字眼
const REG_TYPE_OPTIONS = [
  { id: "all", label: "全部" },
  { id: "individual", label: "個人" },
  { id: "team", label: "團隊" },
];

const AVAILABILITY_OPTIONS = [
  { id: "all", label: "全部狀態" },
  { id: "available", label: "🟢 報名開放中" },
  { id: "full", label: "🔴 額滿開放候補" },
];

export default function EventsLobbyPage() {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 篩選器狀態
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState("all");
  const [selectedRegType, setSelectedRegType] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("all");

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("events")
        .select(`
          *,
          organizer_team:teams!organizer_team_id (id, name_zh, name_en, logo_url),
          creator_profile:profiles!creator_id (id, full_name, avatar_url),
          event_registrations (id, status, companion_count)
        `)
        // 僅撈取尚未開賽的活動，時間過期自動下架
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      if (selectedSport !== "all") {
        query = query.eq("sport_category", selectedSport);
      }

      if (selectedRegType !== "all") {
        query = query.eq("registration_type", selectedRegType);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      console.error("載入賽事失敗:", err.message || err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, selectedSport, selectedRegType]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = events.filter(ev => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ev.title?.toLowerCase().includes(q);
      const matchLocation = ev.location_name?.toLowerCase().includes(q);
      const matchTeamZh = ev.organizer_team?.name_zh?.toLowerCase().includes(q);
      const matchTeamEn = ev.organizer_team?.name_en?.toLowerCase().includes(q);
      const matchCreator = ev.creator_profile?.full_name?.toLowerCase().includes(q);
      
      if (!matchTitle && !matchLocation && !matchTeamZh && !matchTeamEn && !matchCreator) {
        return false;
      }
    }

    const validRegs = (ev.event_registrations || []).filter(
      (r: any) => ["going", "confirmed", "accepted"].includes(String(r.status || "").toLowerCase())
    );
    const filledCount = validRegs.reduce(
      (acc: number, curr: any) => acc + (ev.registration_type === "individual" ? (1 + (curr.companion_count || 0)) : 1),
      0
    );
    const isFull = ev.max_capacity ? filledCount >= ev.max_capacity : false;

    if (selectedAvailability === "available" && isFull) return false;
    if (selectedAvailability === "full" && !isFull) return false;

    return true;
  });

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString("zh-HK", {
      month: "short", day: "numeric", weekday: "short",
      hour: "numeric", minute: "2-digit", hour12: true
    });
  };

  return (
    <div className="bg-slate-950 min-h-screen py-10 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* 頂部標題與按鈕列 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-500" /> 運動約戰大廳
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              尋找即將開打的球隊友誼賽、訓練營或散客休閒團練（已開賽活動將自動下架）
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/events/my"
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-zinc-300 transition cursor-pointer"
            >
              📋 我的賽事
            </Link>
            <Link
              href="/events/new"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition shadow-lg flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> 發起新約戰
            </Link>
          </div>
        </div>

        {/* 篩選控制器大區塊 */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋活動標題、舉辦場地、主辦球隊或發起人姓名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition shadow-inner"
            />
          </div>

          {/* 運動分類切換標籤 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar">
            {SPORT_OPTIONS.map(sport => (
              <button
                key={sport.id}
                type="button"
                onClick={() => setSelectedSport(sport.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition shrink-0 cursor-pointer border ${
                  selectedSport === sport.id
                    ? "bg-blue-600 border-blue-500 text-white shadow-md"
                    : "bg-slate-900 border-slate-800 text-zinc-400 hover:border-slate-700 hover:text-white"
                }`}
              >
                {sport.label}
              </button>
            ))}
          </div>

          {/* 次級篩選列：報名維度 + 名額狀態 */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/60">
            {/* 報名維度過濾 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-zinc-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> 模式：
              </span>
              {REG_TYPE_OPTIONS.map(reg => (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => setSelectedRegType(reg.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    selectedRegType === reg.id
                      ? "bg-slate-800 border-slate-600 text-white shadow-sm"
                      : "bg-slate-950 border-slate-900 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {reg.label}
                </button>
              ))}
            </div>

            {/* 名額狀態過濾 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-zinc-500 mr-1">名額：</span>
              {AVAILABILITY_OPTIONS.map(avail => (
                <button
                  key={avail.id}
                  type="button"
                  onClick={() => setSelectedAvailability(avail.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    selectedAvailability === avail.id
                      ? "bg-slate-800 border-slate-600 text-white shadow-sm"
                      : "bg-slate-950 border-slate-900 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {avail.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 賽事卡片列表渲染 */}
        {isLoading ? (
          <div className="py-20 text-center text-zinc-500 font-mono flex items-center justify-center gap-2 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> 正在尋找即將開打的賽事...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-3">
            <Clock className="w-10 h-10 text-zinc-600 mx-auto" />
            <div className="text-base font-bold text-zinc-300">目前沒有符合條件的即將開打賽事</div>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              嘗試更換搜尋關鍵字、切換篩選條件，或是點擊右上角發起您的第一場公開約戰！
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((ev) => {
              const validRegs = (ev.event_registrations || []).filter(
                (r: any) => ["going", "confirmed", "accepted"].includes(String(r.status || "").toLowerCase())
              );
              const filledCount = validRegs.reduce(
                (acc: number, curr: any) => acc + (ev.registration_type === "individual" ? (1 + (curr.companion_count || 0)) : 1),
                0
              );
              const isFull = ev.max_capacity && filledCount >= ev.max_capacity;

              // 🔥 核心修正：精確格式化 X / Y 人 或 X / Y 隊
              const unitLabel = ev.registration_type === "individual" ? "人" : "隊";
              const countText = ev.max_capacity 
                ? `${filledCount} / ${ev.max_capacity} ${unitLabel}` 
                : `${filledCount} ${unitLabel}`;

              const organizerName = ev.organizer_team
                ? (ev.organizer_team.name_zh || ev.organizer_team.name_en || "未命名球隊")
                : (ev.creator_profile?.full_name || "個人主辦");
              const organizerAvatarUrl = ev.organizer_team?.logo_url || ev.creator_profile?.avatar_url || null;
              const isTeamOrganizer = Boolean(ev.organizer_team);

              return (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between group cursor-pointer"
                >
                  <div className="space-y-4">
                    {/* 卡片頂部標籤列 */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-950 text-blue-400 border border-blue-500/30">
                        {ev.sport_category === "volleyball" && "🏐 排球"}
                        {ev.sport_category === "tennis" && "🎾 網球"}
                        {ev.sport_category === "badminton" && "🏸 羽毛球"}
                        {ev.sport_category === "basketball" && "🏀 籃球"}
                        {ev.sport_category === "football" && "⚽ 足球"}
                        {ev.sport_category === "table_tennis" && "🏓 乒乓球"}
                        {!ev.sport_category && "⚡ 運動"}
                      </span>

                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                        ev.registration_type === "individual"
                          ? "bg-purple-950/40 text-purple-300 border-purple-500/30"
                          : "bg-amber-950/40 text-amber-300 border-amber-500/30"
                      }`}>
                        {ev.registration_type === "individual" ? "👤 個人" : "🛡️ 團隊"}
                      </span>
                    </div>

                    {/* 活動標題 */}
                    <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                      {ev.title}
                    </h3>

                    {/* 活動核心資訊 */}
                    <div className="space-y-2 text-xs text-zinc-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="font-bold text-zinc-200 truncate">{formatDateTime(ev.start_time)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="truncate">{ev.location_name}</span>
                      </div>
                    </div>
                  </div>

                  {/* 卡片底部列：主辦人 + X/Y 報名進度徽章 */}
                  <div className="pt-4 mt-5 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden bg-cover bg-center"
                        style={organizerAvatarUrl ? { backgroundImage: `url(${organizerAvatarUrl})` } : undefined}
                      >
                        {!organizerAvatarUrl && (
                          isTeamOrganizer ? <Shield className="w-3 h-3 text-amber-400" /> : <UserIcon className="w-3 h-3 text-blue-400" />
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 truncate">
                        {isTeamOrganizer ? "🛡️ " : "👤 "}
                        <span className="font-bold text-zinc-200">{organizerName}</span>
                      </span>
                    </div>

                    {/* 🔥 清晰顯示 X / Y 人 或 X / Y 隊 */}
                    <div className="shrink-0">
                      {isFull ? (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-black bg-red-950/80 text-red-400 border border-red-500/40 flex items-center gap-1 shadow-sm">
                          🔴 額滿候補 • {countText}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-black bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                          🟢 開放中 • {countText}
                        </span>
                      )}
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