"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { 
  Calendar, MapPin, Users, Shield, Trophy, AlertTriangle, 
  UserCheck, ArrowLeft, Loader2 
} from "lucide-react";
import Link from "next/link";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [myManagedTeams, setMyManagedTeams] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // 報名互動表單狀態
  const [companionCount, setCompanionCount] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [joinAlias, setJoinAlias] = useState("");
  const [joinNote, setJoinNote] = useState("");

  // 取消報名理由 Modal 狀態
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false);
  const [quitReason, setQuitReason] = useState("");

  // 1. 撈取活動與名單資料
  const fetchEventDetails = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: ev, error: evErr } = await supabase
        .from("events")
        .select("*, organizer_team:teams!organizer_team_id (id, name_zh, name_en)")
        .eq("id", eventId)
        .single();

      if (evErr) throw evErr;
      setEvent(ev);

      const { data: regs } = await supabase
        .from("event_registrations")
        .select(`
          *,
          user:user_id (id, full_name, avatar_url),
          team:teams!team_id (id, name_zh, name_en)
        `)
        .eq("event_id", eventId)
        .order("registered_at", { ascending: true });

      if (regs) {
        setRegistrations([...regs]); // 強制產生新陣列觸發 React 重新渲染
      }

      if (user && ev.registration_type === "team") {
        const { data: tm } = await supabase
          .from("team_members")
          .select("team_id, teams (id, name_zh, name_en)")
          .eq("user_id", user.id)
          .in("role", ["admin", "coach"]);
          
        if (tm) {
          setMyManagedTeams(tm.filter(t => t.teams).map((t: any) => t.teams));
        }
      }
    } catch (err) {
      console.error("無法載入活動:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, eventId]);

  useEffect(() => {
    fetchEventDetails();
  }, [fetchEventDetails]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-500" />
        載入賽事詳情...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <Trophy className="w-12 h-12 text-zinc-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">找不到此活動</h2>
        <Link href="/events" className="text-blue-400 hover:underline text-sm">返回約戰大廳</Link>
      </div>
    );
  }

  // 身份與狀態判定
  const isOrganizer = currentUser && (
    event.creator_id === currentUser.id ||
    (event.organizer_team_id && myManagedTeams.some(t => t.id === event.organizer_team_id))
  );

  const myReg = registrations.find(r => r.user_id === currentUser?.id && r.status !== "cancelled");

  const currentFilledCount = registrations
    .filter(r => r.status === "going" || r.status === "accepted")
    .reduce((acc, curr) => acc + (event.registration_type === "individual" ? (1 + (curr.companion_count || 0)) : 1), 0);

  const remainingSlots = event.max_capacity ? (event.max_capacity - currentFilledCount) : 9999;
  const isFull = remainingSlots <= 0;

  const hoursToStart = (new Date(event.start_time).getTime() - Date.now()) / (3600 * 1000);
  const isLateInfractionTrigger = hoursToStart < (event.late_cancellation_hours || 24);

  // --- 動作：個人報名參賽 (RSVP Join) ---
  const handleIndividualJoin = async () => {
    if (!currentUser) return router.push("/auth");
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc("upsert_individual_rsvp", {
        p_event_id: eventId,
        p_companion_count: companionCount,
        p_alias: joinAlias.trim() || null,
        p_note: joinNote.trim() || null
      });

      if (error) {
        console.error("報名 RPC 報錯:", error);
        alert("報名失敗: " + error.message);
        return;
      }
      
      if (data && data.success === false) {
        alert(data.message);
        return;
      }

      alert(data?.message || "🎉 報名成功！");
      setJoinAlias("");
      setJoinNote("");
      
      // 強制同步刷新畫面
      await fetchEventDetails();
      router.refresh();
    } catch (err: any) {
      console.error("報名過程發生異常:", err);
      alert("報名失敗: 系統發生未知異常");
    } finally {
      setActionLoading(false);
    }
  };

  // --- 動作：個人確認退出 (RSVP Quit) ---
  const confirmQuit = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc("upsert_individual_rsvp", {
        p_event_id: eventId,
        p_companion_count: 0,
        p_reason: quitReason.trim() || "無具體理由",
        p_cancel: true
      });

      if (error) {
        alert("取消失敗: " + error.message);
        return;
      }

      if (data && data.success === false) {
        alert(data.message);
        return;
      }

      setIsQuitModalOpen(false);
      alert(data?.message || "已成功退出活動");
      
      // 強制同步刷新畫面
      await fetchEventDetails();
      router.refresh();
    } catch (err: any) {
      alert("取消失敗: 系統發生未知異常");
    } finally {
      setActionLoading(false);
    }
  };

  // --- 動作：隊伍申請報名 ---
  const handleTeamApply = async () => {
    if (!selectedTeamId) return alert("請選擇代表球隊");
    setActionLoading(true);
    try {
      const { error } = await supabase.from("event_registrations").insert({
        event_id: eventId,
        team_id: selectedTeamId,
        status: "pending",
        alias: joinAlias.trim() || null,
        note: joinNote.trim() || null
      });

      if (error) throw error;
      alert("🎉 球隊參賽申請已送出，請等候主辦方審核！");
      setJoinAlias("");
      setJoinNote("");
      
      await fetchEventDetails();
      router.refresh();
    } catch (err: any) {
      alert("申請失敗: " + (err.message || err.details || "未知錯誤"));
    } finally {
      setActionLoading(false);
    }
  };

  // --- 動作：主辦方審核隊伍或踢人 ---
  const handleUpdateStatus = async (regId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("event_registrations")
        .update({ status: newStatus, last_updated_at: new Date().toISOString() })
        .eq("id", regId);

      if (error) throw error;
      await fetchEventDetails();
      router.refresh();
    } catch (err: any) {
      alert("狀態更新失敗: " + (err.message || err.details));
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString("zh-HK", {
      month: "short", day: "numeric", weekday: "short",
      hour: "numeric", minute: "2-digit", hour12: true
    });
  };

  return (
    <div className="bg-slate-950 min-h-screen py-10 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6 font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> 返回約戰大廳
        </Link>

        {/* 頂部活動資訊卡 */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl mb-8 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-600/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
              {event.event_type === "practice" && "訓練 / 團練"}
              {event.event_type === "match" && "友誼對戰"}
              {event.event_type === "tournament" && "正式盃賽"}
              {event.event_type === "social" && "休閒聚會"}
            </span>

            <span className={`px-3 py-1 rounded-full text-xs font-black border ${
              event.registration_type === "individual" 
                ? "bg-purple-950/50 text-purple-300 border-purple-500/30"
                : "bg-amber-950/50 text-amber-300 border-amber-500/30"
            }`}>
              {event.registration_type === "individual" ? "👤 個人報名制" : "🛡️ 球隊邀請賽"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-4">{event.title}</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-zinc-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <div className="text-xs text-zinc-500 font-bold">活動時間</div>
                <div className="font-extrabold text-white">{formatDateTime(event.start_time)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs text-zinc-500 font-bold">舉辦場地</div>
                <div className="font-extrabold text-white">{event.location_name}</div>
                {event.location_address && <div className="text-xs text-zinc-400">{event.location_address}</div>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs text-zinc-500 font-bold">名額狀況</div>
                <div className="font-extrabold text-white">
                  已佔用 {currentFilledCount} {event.max_capacity ? `/ 上限 ${event.max_capacity}` : ""}
                  {isFull && <span className="ml-2 text-xs font-black text-red-400">(名額已滿，開放排隊候補)</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <div className="text-xs text-zinc-500 font-bold">費用與主辦</div>
                <div className="font-extrabold text-white">
                  {event.fee > 0 ? `HKD $${event.fee}` : "免費活動"} • 主辦：{event.organizer_team?.name_zh || event.organizer_team?.name_en || "個人主辦"}
                </div>
              </div>
            </div>
          </div>

          {event.description && (
            <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap bg-slate-950/30 p-4 rounded-2xl border border-slate-800/40">
              {event.description}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左欄：互動報名操作台 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-black mb-4 border-b border-slate-800 pb-3 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" /> 報名控制台
              </h3>

              {isOrganizer ? (
                <div className="p-4 bg-blue-950/30 border border-blue-500/30 rounded-2xl text-center space-y-2">
                  <span className="text-xs font-black text-blue-400 uppercase tracking-wider block">您是本活動主辦人</span>
                  <p className="text-xs text-zinc-300">您可以在右側名單審核參賽球隊或管理球員出席狀態。</p>
                </div>
              ) : event.registration_type === "individual" ? (
                myReg ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-center">
                      <div className="text-xs font-black text-emerald-400 uppercase mb-1">您的狀態</div>
                      <div className="text-xl font-black text-white">
                        {myReg.status === "going" && "✅ 確認出席 (Going)"}
                        {myReg.status === "waitlist" && "⏳ 候補排隊中 (Waitlist)"}
                      </div>
                      {myReg.companion_count > 0 && (
                        <div className="text-xs text-zinc-300 mt-1">攜伴人數：+{myReg.companion_count} 人</div>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setIsQuitModalOpen(true)}
                      className="w-full py-3 rounded-xl bg-slate-800 hover:bg-red-950 hover:text-red-300 border border-slate-700 hover:border-red-500/50 text-zinc-400 font-bold text-sm transition flex items-center justify-center gap-2"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "申請退出活動"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                        球場稱呼 / 綽號 <span className="text-zinc-500 font-normal">(選填)</span>
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        placeholder="例：阿賢 / Ken"
                        value={joinAlias}
                        onChange={(e) => setJoinAlias(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-bold text-zinc-300">
                          給主辦的公開留言 <span className="text-zinc-500 font-normal">(選填)</span>
                        </label>
                        <span className="text-[10px] text-zinc-500">{joinNote.length}/40</span>
                      </div>
                      <input
                        type="text"
                        maxLength={40}
                        placeholder="例：自備比賽球 / D2程度..."
                        value={joinNote}
                        onChange={(e) => setJoinNote(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                        攜伴人數 (同行朋友)
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[0, 1, 2, 3].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setCompanionCount(num)}
                            className={`py-2 rounded-xl text-xs font-bold border transition ${
                              companionCount === num
                                ? "bg-blue-600 border-blue-500 text-white shadow-md"
                                : "bg-slate-950 border-slate-800 text-zinc-400 hover:border-slate-700"
                            }`}
                          >
                            +{num} 人
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleIndividualJoin}
                      className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-black text-sm transition shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isFull ? "排入候補名單" : "立即報名參賽"}
                    </button>
                  </div>
                )
              ) : (
                myManagedTeams.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5">選擇代表參賽的球隊 *</label>
                      <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">請選擇...</option>
                        {myManagedTeams.map(t => (
                          <option key={t.id} value={t.id}>{t.name_zh || t.name_en || "未命名球隊"}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                        球隊代表 / 領隊稱呼 <span className="text-zinc-500 font-normal">(選填)</span>
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        placeholder="例：陳隊長 / Coach Alex"
                        value={joinAlias}
                        onChange={(e) => setJoinAlias(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-bold text-zinc-300">
                          參賽備註留言 <span className="text-zinc-500 font-normal">(選填)</span>
                        </label>
                        <span className="text-[10px] text-zinc-500">{joinNote.length}/40</span>
                      </div>
                      <input
                        type="text"
                        maxLength={40}
                        placeholder="例：全隊球衣已齊全 / 預計12人出席..."
                        value={joinNote}
                        onChange={(e) => setJoinNote(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleTeamApply}
                      className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-black text-sm transition flex items-center justify-center gap-2 shadow-lg active:scale-95"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "代表球隊送出參賽申請"}
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950 rounded-2xl text-center text-xs text-zinc-400">
                    僅限球隊管理員代表隊伍申請參賽。
                  </div>
                )
              )}
            </div>
          </div>

          {/* 右欄：參賽與審核名單牆 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-black mb-6 border-b border-slate-800 pb-3 flex items-center justify-between">
                <span>參賽名單總覽</span>
                <span className="text-xs text-zinc-500 font-normal">共 {registrations.filter(r => r.status !== 'cancelled').length} 筆報名</span>
              </h3>

              <div className="space-y-3">
                {registrations.filter(r => r.status !== 'cancelled').length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-sm font-bold">目前尚無人報名，快搶下第一席！</div>
                ) : (
                  registrations.filter(r => r.status !== 'cancelled').map(reg => (
                    <div 
                      key={reg.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {reg.user ? (
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-xs shrink-0 overflow-hidden"
                               style={{ backgroundImage: reg.user.avatar_url ? `url(${reg.user.avatar_url})` : 'none', backgroundSize: 'cover' }}>
                            {!reg.user.avatar_url && (reg.user.full_name?.[0] || "?")}
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0">
                            <Shield className="w-5 h-5" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="font-bold text-sm text-white truncate flex items-center gap-2">
                            {reg.alias || reg.user?.full_name || reg.team?.name_zh || reg.team?.name_en || "未知球員"}
                            {reg.companion_count > 0 && (
                              <span className="text-xs text-blue-400 bg-blue-950 px-2 py-0.5 rounded-md">+{reg.companion_count} 攜伴</span>
                            )}
                          </div>

                          {reg.note && (
                            <div className="text-xs text-amber-300/90 bg-amber-950/40 border border-amber-500/20 px-2.5 py-1 rounded-lg mt-1.5 truncate max-w-sm">
                              💬 {reg.note}
                            </div>
                          )}

                          <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-1">
                            <span>報名於 {new Date(reg.registered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {reg.has_late_infraction && (
                              <span className="text-red-400 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> 臨場異動違規
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {reg.status === "going" || reg.status === "accepted" ? (
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-950 text-emerald-400 border border-emerald-500/30">確認出席</span>
                        ) : reg.status === "waitlist" ? (
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-950 text-amber-400 border border-amber-500/30">候補名單</span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-800 text-zinc-400">審核中</span>
                        )}

                        {isOrganizer && reg.user_id !== currentUser?.id && (
                          <div className="flex items-center gap-1">
                            {reg.status !== "accepted" && reg.status !== "going" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(reg.id, event.registration_type === "team" ? "accepted" : "going")}
                                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition text-xs font-bold"
                                title="通過審核"
                              >
                                ✓
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(reg.id, "kicked")}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition text-xs"
                              title="移除資格"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 退出活動詢問理由 Modal */}
      {isQuitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> 確認退出此賽事？
            </h3>

            {isLateInfractionTrigger && (
              <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 mb-4 font-bold leading-relaxed">
                ⚠️ 注意：目前距離開賽已低於 {event.late_cancellation_hours || 24} 小時，此退賽動作將遭到系統標記為「臨場違規」並提報給活動管理員。
              </div>
            )}

            <label className="block text-xs font-bold text-zinc-300 mb-2">請說明您退出的具體原因 *</label>
            <textarea
              rows={3}
              placeholder="例：身體不適、臨時會議、交通受阻..."
              value={quitReason}
              onChange={(e) => setQuitReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white mb-6 focus:outline-none focus:border-blue-500"
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsQuitModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-zinc-300 font-bold text-xs"
              >
                保留席位
              </button>
              <button
                type="button"
                disabled={actionLoading || !quitReason.trim()}
                onClick={confirmQuit}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white font-black text-xs transition"
              >
                確認送出退賽
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}