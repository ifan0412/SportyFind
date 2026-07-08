"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Trophy,
  Calendar,
  MapPin,
  Shield,
  ChevronRight,
  Plus,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { getSportCategory } from "@/lib/sports-categories";
import CalendarExportButton from "@/components/CalendarExportButton";
import { formatEventPeriod } from "@/lib/event-datetime";

interface MyEventsTabProps {
  /** When embedded in profile tab, hides standalone page chrome */
  embedded?: boolean;
  userId?: string;
}

export function MyEventsTab({ embedded = false, userId }: MyEventsTabProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [activeTab, setActiveTab] = useState<"joined" | "hosted">("joined");
  const [timeHorizon, setTimeHorizon] = useState<"upcoming" | "past">("upcoming");
  const [isLoading, setIsLoading] = useState(true);

  const [joinedEvents, setJoinedEvents] = useState<any[]>([]);
  const [hostedEvents, setHostedEvents] = useState<any[]>([]);

  const fetchMyDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth");
          return;
        }
        uid = user.id;
      }

      const { data: myRegs, error: regErr } = await supabase
        .from("event_registrations")
        .select(`
          id, status, companion_count, alias, note, registered_at,
          event:events (
            id, title, description, sport_category, start_time, end_time, location_name, location_address,
            registration_type, max_capacity, fee,
            organizer_team:teams!organizer_team_id (id, name_zh, name_en, logo_url),
            creator_profile:profiles!creator_id (id, full_name, avatar_url)
          )
        `)
        .eq("user_id", uid)
        .neq("status", "cancelled");

      if (regErr) throw regErr;
      if (myRegs) {
        setJoinedEvents(myRegs.filter((r: any) => r.event !== null));
      }

      const { data: myTeams } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", uid)
        .in("role", ["admin", "coach"]);

      const managedTeamIds = myTeams?.map((t) => t.team_id) || [];

      let hostedQuery = supabase
        .from("events")
        .select(`
          *,
          organizer_team:teams!organizer_team_id (id, name_zh, name_en, logo_url),
          registrations:event_registrations (id, status, companion_count)
        `);

      if (managedTeamIds.length > 0) {
        hostedQuery = hostedQuery.or(`creator_id.eq.${uid},organizer_team_id.in.(${managedTeamIds.join(",")})`);
      } else {
        hostedQuery = hostedQuery.eq("creator_id", uid);
      }

      const { data: myHosted, error: hostErr } = await hostedQuery;
      if (hostErr) throw hostErr;
      if (myHosted) setHostedEvents(myHosted);
    } catch (err) {
      console.error("載入個人行程表失敗:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router, userId]);

  useEffect(() => {
    fetchMyDashboardData();
  }, [fetchMyDashboardData]);

  const nowMs = Date.now();

  const filteredJoined = useMemo(() => {
    return joinedEvents
      .filter((item: any) => {
        const startMs = new Date(item.event.start_time).getTime();
        return timeHorizon === "upcoming" ? startMs >= nowMs : startMs < nowMs;
      })
      .sort((a: any, b: any) => {
        const timeA = new Date(a.event.start_time).getTime();
        const timeB = new Date(b.event.start_time).getTime();
        return timeHorizon === "upcoming" ? timeA - timeB : timeB - timeA;
      });
  }, [joinedEvents, timeHorizon, nowMs]);

  const filteredHosted = useMemo(() => {
    return hostedEvents
      .filter((ev: any) => {
        const startMs = new Date(ev.start_time).getTime();
        return timeHorizon === "upcoming" ? startMs >= nowMs : startMs < nowMs;
      })
      .sort((a: any, b: any) => {
        const timeA = new Date(a.start_time).getTime();
        const timeB = new Date(b.start_time).getTime();
        return timeHorizon === "upcoming" ? timeA - timeB : timeB - timeA;
      });
  }, [hostedEvents, timeHorizon, nowMs]);

  const sportBadge = (cat: string) => {
    const sport = getSportCategory(cat);
    return (
      <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black px-3 py-1 rounded-full whitespace-nowrap">
        {sport ? `${sport.emoji} ${sport.labelZh}` : "⚡ 運動"}
      </span>
    );
  };

  const content = (
    <>
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <Trophy className="w-8 h-8 text-red-500" /> 我的賽事/活動中心
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              隨時掌握即將參加的約戰行程與您主辦的活動進度。
            </p>
          </div>
          <Link
            href="/events/new"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-sm font-black transition shadow-lg shadow-red-600/20 active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5" /> 發起新活動
          </Link>
        </div>
      )}

      {embedded && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg md:text-xl font-black text-white">我的賽事</h2>
            <p className="text-xs text-zinc-500 mt-1">管理你參加與主辦的所有活動。</p>
          </div>
          <Link
            href="/events/new"
            className="flex-shrink-0 flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-[0_0_10px_rgba(220,38,38,0.2)] transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> 發起活動
          </Link>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("joined")}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === "joined" ? "bg-blue-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>👤 我參加的</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950/60 font-mono">{filteredJoined.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("hosted")}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === "hosted" ? "bg-red-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>👑 我主辦的</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950/60 font-mono">{filteredHosted.length}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 w-full sm:w-fit">
          <button
            type="button"
            onClick={() => setTimeHorizon("upcoming")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg transition ${
              timeHorizon === "upcoming" ? "bg-slate-800 text-red-400 font-black" : "hover:text-white"
            }`}
          >
            🔥 即將到來
          </button>
          <button
            type="button"
            onClick={() => setTimeHorizon("past")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg transition ${
              timeHorizon === "past" ? "bg-slate-800 text-zinc-200 font-black" : "hover:text-white"
            }`}
          >
            📜 歷史回顧
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center text-zinc-500 font-mono flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-500" /> 彙整您的賽事履歷...
        </div>
      ) : activeTab === "joined" ? (
        filteredJoined.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/40 border border-dashed border-slate-700/50 rounded-3xl p-8">
            <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-zinc-300 mb-1">你尚未參加任何賽事</h3>
            <p className="text-xs text-zinc-500 mb-6">前往約戰大廳探索各區熱門訓練與友誼賽事！</p>
            <Link
              href="/events"
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-black text-white transition inline-flex items-center gap-2"
            >
              探索約戰賽事 <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredJoined.map((item: any) => {
              const ev = item.event;
              const organizerName = ev.organizer_team
                ? (ev.organizer_team.name_zh || ev.organizer_team.name_en || "未命名球隊")
                : (ev.creator_profile?.full_name || "個人主辦");
              const organizerAvatarUrl =
                ev.organizer_team?.logo_url || ev.creator_profile?.avatar_url || null;
              const isTeamOrganizer = Boolean(ev.organizer_team);

              return (
                <Link
                  key={item.id}
                  href={`/events/${ev.id}`}
                  className="group relative bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 sm:p-6 transition block"
                >
                  <div className="absolute top-5 right-5 sm:top-6 sm:right-6 text-right">
                    <div className="text-[10px] text-zinc-500 font-bold">預估費用</div>
                    <div className="text-sm font-black text-yellow-400">
                      {ev.fee > 0 ? `HKD $${ev.fee}` : "免費"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap min-w-0 pr-24 mb-2">
                    {sportBadge(ev.sport_category)}
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
                          <span className="px-3 py-0.5 rounded-full text-xs font-black bg-red-950 text-red-400 border border-red-500/30">
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

                  <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-blue-400 transition truncate mb-2.5 pr-20">
                    {ev.title}
                  </h3>

                  <div className="flex flex-col items-start gap-1.5 text-[11px] text-zinc-400 font-bold mb-3">
                    <span className="flex items-center gap-1.5 text-zinc-200">
                      <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" /> {ev.location_name}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" /> {formatEventPeriod(ev.start_time, ev.end_time)}
                    </span>
                    {timeHorizon === "upcoming" && (
                      <CalendarExportButton event={ev} menuPlacement="down" />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden bg-cover bg-center"
                        style={organizerAvatarUrl ? { backgroundImage: `url(${organizerAvatarUrl})` } : undefined}
                      >
                        {!organizerAvatarUrl && (
                          isTeamOrganizer
                            ? <Shield className="w-3.5 h-3.5 text-red-400" />
                            : <span className="text-[10px] font-black text-blue-400">👤</span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 truncate">
                        {isTeamOrganizer ? "🛡️ " : "👤 "}
                        <span className="font-bold text-zinc-200">{organizerName}</span>
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition group-hover:translate-x-1 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : filteredHosted.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/40 border border-dashed border-slate-700/50 rounded-3xl p-8">
          <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-300 mb-1">你尚未建立任何賽事</h3>
          <p className="text-xs text-zinc-500 mb-6">建立專屬的球隊邀請賽或周末訓練營，掌握社群主導權！</p>
          <Link
            href="/events/new"
            className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-black text-white transition inline-flex items-center gap-2"
          >
            立即建立賽事 <Plus className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredHosted.map((ev: any) => {
            const goingCount =
              ev.registrations
                ?.filter((r: any) => ["going", "confirmed", "accepted"].includes(String(r.status || "").toLowerCase()))
                .reduce(
                  (sum: number, r: any) =>
                    sum + (ev.registration_type === "individual" ? 1 + (r.companion_count || 0) : 1),
                  0
                ) || 0;
            const waitlistCount =
              ev.registrations?.filter((r: any) => ["waitlist", "waiting"].includes(String(r.status || "").toLowerCase()))
                .length || 0;
            const orgName = ev.organizer_team?.name_zh || ev.organizer_team?.name_en || "個人獨立主辦";
            const organizerAvatarUrl = ev.organizer_team?.logo_url || null;
            const isTeamOrganizer = Boolean(ev.organizer_team);

            return (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 sm:p-6 transition block"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {sportBadge(ev.sport_category)}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    {timeHorizon === "upcoming" && (
                      <CalendarExportButton event={ev} menuPlacement="down" />
                    )}
                    <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800/80 text-right">
                      <div className="text-[10px] font-bold text-zinc-500">出席進度</div>
                      <div className="text-sm font-black text-white">
                        {goingCount} {ev.max_capacity ? `/ ${ev.max_capacity}` : "人"}
                        {waitlistCount > 0 && (
                          <span className="text-red-400 text-xs ml-1.5">· 候補 +{waitlistCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-red-400 transition truncate mb-2.5">
                  {ev.title}
                </h3>
                <div className="flex flex-col items-start gap-1.5 text-[11px] text-zinc-400 font-bold mb-4">
                  <span className="flex items-center gap-1.5 text-zinc-200">
                    <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" /> {ev.location_name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" /> {formatEventPeriod(ev.start_time, ev.end_time)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden bg-cover bg-center"
                      style={organizerAvatarUrl ? { backgroundImage: `url(${organizerAvatarUrl})` } : undefined}
                    >
                      {!organizerAvatarUrl && (
                        isTeamOrganizer
                          ? <Shield className="w-3.5 h-3.5 text-red-400" />
                          : <span className="text-[10px] font-black text-red-400">👑</span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400 truncate">
                      {isTeamOrganizer ? "🛡️ " : "👑 "}
                      <span className="font-bold text-zinc-200">{orgName}</span>
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition group-hover:translate-x-1 shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="animate-fadeIn">{content}</div>;
  }

  return (
    <div className="bg-slate-950 min-h-screen py-10 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-5xl mx-auto">{content}</div>
    </div>
  );
}
