"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { 
  Trophy, Calendar, MapPin, Shield, ChevronRight, Plus, Loader2, ArrowUpRight 
} from "lucide-react";
import Link from "next/link";
import CalendarExportButton from "@/components/CalendarExportButton";

export default function MyEventsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [activeTab, setActiveTab] = useState<"joined" | "hosted">("joined");
  const [timeHorizon, setTimeHorizon] = useState<"upcoming" | "past">("upcoming");
  const [isLoading, setIsLoading] = useState(true);

  const [joinedEvents, setJoinedEvents] = useState<any[]>([]);
  const [hostedEvents, setHostedEvents] = useState<any[]>([]);

  const fetchMyDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      // 1. 撈取「我參加的」活動
      const { data: myRegs, error: regErr } = await supabase
        .from("event_registrations")
        .select(`
          id, status, companion_count, alias, note, registered_at,
          event:events (
            id, title, description, sport_category, start_time, end_time, location_name, location_address,
            registration_type, max_capacity, fee
          )
        `)
        .eq("user_id", user.id)
        .neq("status", "cancelled");

      if (regErr) throw regErr;
      if (myRegs) {
        setJoinedEvents(myRegs.filter((r: any) => r.event !== null));
      }

      // 2. 撈取「我主辦的」活動
      const { data: myTeams } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .in("role", ["admin", "coach"]);

      const managedTeamIds = myTeams?.map(t => t.team_id) || [];

      let hostedQuery = supabase
        .from("events")
        .select(`
          *,
          organizer_team:teams!organizer_team_id (id, name_zh, name_en),
          registrations:event_registrations (id, status, companion_count)
        `);

      if (managedTeamIds.length > 0) {
        hostedQuery = hostedQuery.or(`creator_id.eq.${user.id},organizer_team_id.in.(${managedTeamIds.join(",")})`);
      } else {
        hostedQuery = hostedQuery.eq("creator_id", user.id);
      }

      const { data: myHosted, error: hostErr } = await hostedQuery;
      if (hostErr) throw hostErr;
      if (myHosted) setHostedEvents(myHosted);

    } catch (err) {
      console.error("載入個人行程表失敗:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchMyDashboardData();
  }, [fetchMyDashboardData]);

  const nowMs = Date.now();

  const filteredJoined = useMemo(() => {
    return joinedEvents.filter((item: any) => {
      const startMs = new Date(item.event.start_time).getTime();
      return timeHorizon === "upcoming" ? startMs >= nowMs : startMs < nowMs;
    }).sort((a: any, b: any) => {
      const timeA = new Date(a.event.start_time).getTime();
      const timeB = new Date(b.event.start_time).getTime();
      return timeHorizon === "upcoming" ? timeA - timeB : timeB - timeA;
    });
  }, [joinedEvents, timeHorizon, nowMs]);

  const filteredHosted = useMemo(() => {
    return hostedEvents.filter((ev: any) => {
      const startMs = new Date(ev.start_time).getTime();
      return timeHorizon === "upcoming" ? startMs >= nowMs : startMs < nowMs;
    }).sort((a: any, b: any) => {
      const timeA = new Date(a.start_time).getTime();
      const timeB = new Date(b.start_time).getTime();
      return timeHorizon === "upcoming" ? timeA - timeB : timeB - timeA;
    });
  }, [hostedEvents, timeHorizon, nowMs]);

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString("zh-HK", {
      month: "short", day: "numeric", weekday: "short",
      hour: "numeric", minute: "2-digit", hour12: true
    });
  };

  const getSportIcon = (cat: string) => {
    const icons: Record<string, string> = {
      volleyball: "🏐", tennis: "🎾", badminton: "🏸",
      basketball: "🏀", football: "⚽", table_tennis: "🏓"
    };
    return icons[cat] || "⚡";
  };

  return (
    <div className="bg-slate-950 min-h-screen py-10 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-5xl mx-auto">
        
        {/* 頂部標題與快速創建按鈕 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-500" /> 我的賽事中心
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              隨時掌握即將參加的約戰行程與您主辦的活動進度。
            </p>
          </div>

          <Link
            href="/events/new"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-black transition shadow-lg shadow-amber-600/20 active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5" /> 發起新活動
          </Link>
        </div>

        {/* 雙層導覽切換器 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab("joined")}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                activeTab === "joined"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>👤 我參加的行程</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950/60 font-mono">
              {filteredJoined.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("hosted")}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                activeTab === "hosted"
                  ? "bg-amber-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>👑 我主辦的賽事</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950/60 font-mono">
                {filteredHosted.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 w-fit">
            <button
              onClick={() => setTimeHorizon("upcoming")}
              className={`px-4 py-1.5 rounded-lg transition ${
                timeHorizon === "upcoming" ? "bg-slate-800 text-amber-400 font-black" : "hover:text-white"
              }`}
            >
              🔥 即將到來
            </button>
            <button
              onClick={() => setTimeHorizon("past")}
              className={`px-4 py-1.5 rounded-lg transition ${
                timeHorizon === "past" ? "bg-slate-800 text-zinc-200 font-black" : "hover:text-white"
              }`}
            >
              📜 歷史回顧
            </button>
          </div>
        </div>

        {/* 內容清單顯示區 */}
        {isLoading ? (
          <div className="py-24 text-center text-zinc-500 font-mono flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-500" /> 彙整您的賽事履歷...
          </div>
        ) : activeTab === "joined" ? (
          filteredJoined.length === 0 ? (
            <div className="py-20 text-center bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8">
              <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-300 mb-1">目前沒有符合條件的報名活動</h3>
              <p className="text-xs text-zinc-500 mb-6">隨時前往約戰大廳探索各區熱門訓練與友誼賽事！</p>
              <Link
                href="/events"
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-black text-white transition inline-flex items-center gap-2"
              >
                探索約戰大廳 <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredJoined.map((item: any) => {
                const ev = item.event;
                return (
                  <Link
                    key={item.id}
                    href={`/events/${ev.id}`}
                    className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 sm:p-6 transition flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                  >
                    <div className="space-y-2.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md text-xs bg-slate-950 border border-slate-800 font-black">
                          {getSportIcon(ev.sport_category)}
                        </span>

                        {/* 🔥 修正 Bug 1：防禦性標準化多重比對，不再錯誤顯示為「審核中」 */}
                        {(() => {
                          const normStatus = String(item.status || "").toLowerCase().trim();
                          const isConfirmed = ["going", "confirmed", "accepted"].includes(normStatus);
                          const isWaitlist = ["waitlist", "waiting", "queued"].includes(normStatus);

                          if (isConfirmed) {
                            return (
                              <span className="px-3 py-0.5 rounded-full text-xs font-black bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                                ✅ 確認出席
                              </span>
                            );
                          }
                          if (isWaitlist) {
                            return (
                              <span className="px-3 py-0.5 rounded-full text-xs font-black bg-amber-950 text-amber-400 border border-amber-500/30">
                                ⏳ 候補名單
                              </span>
                            );
                          }
                          return (
                            <span className="px-3 py-0.5 rounded-full text-xs font-black bg-slate-800 text-zinc-400">
                              🛡️ 審核中
                            </span>
                          );
                        })()}

                        {item.companion_count > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-xs bg-blue-950 text-blue-300 font-bold">
                            +{item.companion_count} 攜伴
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-blue-400 transition truncate">
                        {ev.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 font-bold">
                        <span className="flex items-center gap-1.5 text-zinc-200">
                          <Calendar className="w-4 h-4 text-blue-400" /> {formatDateTime(ev.start_time)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-amber-400" /> {ev.location_name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-right mr-2">
                        <div className="text-[10px] text-zinc-500 font-bold">預估費用</div>
                        <div className="text-sm font-black text-amber-400">
                          {ev.fee > 0 ? `HKD $${ev.fee}` : "免費"}
                        </div>
                      </div>

                      {timeHorizon === "upcoming" && (
                        <CalendarExportButton event={ev} />
                      )}

                      <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition group-hover:translate-x-1 ml-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          filteredHosted.length === 0 ? (
            <div className="py-20 text-center bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8">
              <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-300 mb-1">您尚未在近期發起任何賽事</h3>
              <p className="text-xs text-zinc-500 mb-6">建立專屬的球隊邀請賽或周末訓練營，掌握社群主導權！</p>
              <Link
                href="/events/new"
                className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-black text-white transition inline-flex items-center gap-2"
              >
                立即發起活動 <Plus className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredHosted.map((ev: any) => {
                const goingCount = ev.registrations
                  ?.filter((r: any) => ["going", "confirmed", "accepted"].includes(String(r.status || "").toLowerCase()))
                  .reduce((sum: number, r: any) => sum + (ev.registration_type === "individual" ? (1 + (r.companion_count || 0)) : 1), 0) || 0;

                const waitlistCount = ev.registrations?.filter((r: any) => ["waitlist", "waiting"].includes(String(r.status || "").toLowerCase())).length || 0;
                const orgName = ev.organizer_team?.name_zh || ev.organizer_team?.name_en || "個人獨立主辦";

                return (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 sm:p-6 transition flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                  >
                    <div className="space-y-2.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md text-xs bg-slate-950 border border-slate-800 font-black">
                          {getSportIcon(ev.sport_category)}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          👑 {orgName}
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-amber-400 transition truncate">
                        {ev.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 font-bold">
                        <span className="flex items-center gap-1.5 text-zinc-200">
                          <Calendar className="w-4 h-4 text-blue-400" /> {formatDateTime(ev.start_time)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-amber-400" /> {ev.location_name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800/80 flex items-center gap-3 text-right mr-1">
                        <div>
                          <div className="text-[10px] font-bold text-zinc-500">出席進度</div>
                          <div className="text-sm font-black text-white">
                            {goingCount} {ev.max_capacity ? `/ ${ev.max_capacity}` : "人"}
                          </div>
                        </div>
                        {waitlistCount > 0 && (
                          <div className="border-l border-slate-800 pl-3 text-amber-400">
                            <div className="text-[10px] font-bold">候補</div>
                            <div className="text-sm font-black">+{waitlistCount}</div>
                          </div>
                        )}
                      </div>

                      {timeHorizon === "upcoming" && (
                        <CalendarExportButton event={ev} />
                      )}

                      <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition group-hover:translate-x-1 ml-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}