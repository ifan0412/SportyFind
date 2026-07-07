"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { 
  Calendar, MapPin, Users, Shield, Trophy, AlertTriangle, 
  UserCheck, ArrowLeft, Loader2, User as UserIcon, Trash2, Share2, Check
} from "lucide-react";
import Link from "next/link";
import EventLobbyBoard from "@/components/EventLobbyBoard";
import CalendarExportButton from "@/components/CalendarExportButton";
import { profileLink } from "@/lib/profile-links";
import { formatEventPeriod } from "@/lib/event-datetime";
import {
  countFilledSlots,
  getEventApprovalMode,
  getVisibleRegistrations,
  isConfirmedRegStatus,
  isPendingRegStatus,
  isWaitlistRegStatus,
  normalizeRegStatus,
} from "@/lib/event-registration";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const returnTo = `/events/${eventId}`;

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [myManagedTeams, setMyManagedTeams] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // 報名互動表單狀態
  const [companionCount, setCompanionCount] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [joinAlias, setJoinAlias] = useState("");
  const [joinNote, setJoinNote] = useState("");

  // 取消報名理由 Modal 狀態
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false);
  const [quitReason, setQuitReason] = useState("");

  // 主辦審核確認 Modal
  const [hostAction, setHostAction] = useState<{
    regId: string;
    newStatus: string;
    targetUserId?: string | null;
    displayName: string;
    action: "approve" | "reject";
    companionCount: number;
  } | null>(null);

  const fetchEventDetails = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: ev, error: evErr } = await supabase
        .from("events")
        .select(`
          *,
          organizer_team:teams!organizer_team_id (id, name_zh, name_en, logo_url),
          creator_profile:profiles!creator_id (id, full_name, avatar_url)
        `)
        .eq("id", eventId)
        .single();

      if (evErr) throw evErr;
      setEvent(ev);

      const { data: regs, error: regsErr } = await supabase
        .from("event_registrations")
        .select(`
          *,
          profiles:user_id (id, full_name, avatar_url),
          team:teams!team_id (id, name_zh, name_en)
        `)
        .eq("event_id", eventId)
        .order("registered_at", { ascending: true });

      if (regsErr) {
        console.error("載入報名名單失敗:", regsErr.message, regsErr.details);
      } else if (regs) {
        setRegistrations([...regs]);
      }

      if (user) {
        const { data: tm } = await supabase
          .from("team_members")
          .select("team_id, teams (id, name_zh, name_en, sport_category)")
          .eq("user_id", user.id)
          .in("role", ["admin", "coach"]);

        if (tm) {
          const managedTeams = tm.filter(t => t.teams).map((t: any) => t.teams);
          const sportFiltered = ev?.sport_category
            ? managedTeams.filter((t: any) => t.sport_category === ev.sport_category)
            : managedTeams;
          setMyManagedTeams(sportFiltered);
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

  useEffect(() => {
    if (!eventId) return;
    let isMounted = true;

    const channel = supabase
      .channel(`event-registrations-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_registrations", filter: `event_id=eq.${eventId}` },
        () => {
          if (isMounted) fetchEventDetails();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, eventId, fetchEventDetails]);

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

  const isOrganizer = Boolean(
    currentUser && (
      event.creator_id === currentUser.id ||
      (event.organizer_team_id && myManagedTeams.some(t => t.id === event.organizer_team_id))
    )
  );

  const activeIndivReg = registrations.find(r => 
    r.user_id === currentUser?.id && 
    ["going", "confirmed", "accepted", "waitlist", "waiting", "pending", "reviewing"].includes(String(r.status || "").toLowerCase())
  );
  const rejectedIndivReg = registrations.find(r => 
    r.user_id === currentUser?.id && 
    ["kicked", "rejected"].includes(String(r.status || "").toLowerCase())
  );

  const myManagedTeamIds = myManagedTeams.map(t => t.id);
  const activeTeamReg = registrations.find(r => 
    r.team_id && myManagedTeamIds.includes(r.team_id) && 
    ["accepted", "going", "confirmed", "waitlist", "waiting", "pending", "reviewing"].includes(String(r.status || "").toLowerCase())
  );
  const rejectedTeamReg = registrations.find(r => 
    r.team_id && myManagedTeamIds.includes(r.team_id) && 
    ["kicked", "rejected"].includes(String(r.status || "").toLowerCase())
  );

  const canViewLobby = Boolean(isOrganizer || activeIndivReg || activeTeamReg);

  const approvalMode = getEventApprovalMode(event);
  const visibleRegistrations = getVisibleRegistrations(registrations, {
    isOrganizer,
    currentUserId: currentUser?.id,
    registrationType: event.registration_type,
    approvalMode,
  });
  const confirmedRegistrations = visibleRegistrations.filter((r) =>
    isConfirmedRegStatus(r.status)
  );
  const waitlistRegistrations = visibleRegistrations.filter((r) =>
    isWaitlistRegStatus(r.status)
  );
  const pendingRegistrations = isOrganizer
    ? registrations.filter(
        (r) =>
          normalizeRegStatus(r.status) !== "cancelled" && isPendingRegStatus(r.status)
      )
    : visibleRegistrations.filter((r) => isPendingRegStatus(r.status));
  const myPendingReg =
    event.registration_type === "individual" &&
    approvalMode === "approval" &&
    activeIndivReg &&
    isPendingRegStatus(activeIndivReg.status)
      ? activeIndivReg
      : null;

  const renderRegistrationRow = (reg: any) => {
    const normRegStatus = normalizeRegStatus(reg.status);
    const displayName =
      reg.alias ||
      reg.profiles?.full_name ||
      reg.team?.name_zh ||
      reg.team?.name_en ||
      "未知球員";

    return (
      <div
        key={reg.id}
        className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          {reg.profiles ? (
            <Link href={profileLink(reg.profiles.id || reg.user_id, returnTo)} className="shrink-0">
              <div
                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-xs shrink-0 overflow-hidden"
                style={{
                  backgroundImage: reg.profiles.avatar_url ? `url(${reg.profiles.avatar_url})` : "none",
                  backgroundSize: "cover",
                }}
              >
                {!reg.profiles.avatar_url && (reg.profiles.full_name?.[0] || "?")}
              </div>
            </Link>
          ) : (
            <div className="w-10 h-10 rounded-full bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0">
            <div className="font-bold text-sm text-white truncate flex items-center gap-2">
              {reg.profiles ? (
                <Link
                  href={profileLink(reg.profiles.id || reg.user_id, returnTo)}
                  className="hover:text-blue-400 transition truncate"
                >
                  {displayName}
                </Link>
              ) : (
                displayName
              )}
              {reg.companion_count > 0 && (
                <span className="text-xs text-blue-400 bg-blue-950 px-2 py-0.5 rounded-md">
                  +{reg.companion_count} 攜伴
                </span>
              )}
            </div>

            {reg.note && (
              <div className="text-xs text-amber-300/90 bg-amber-950/40 border border-amber-500/20 px-2.5 py-1 rounded-lg mt-1.5 truncate max-w-sm">
                💬 {reg.note}
              </div>
            )}

            <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-1">
              <span>
                報名於{" "}
                {new Date(reg.registered_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {reg.has_late_infraction && (
                <span className="text-red-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> 臨場異動違規
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isConfirmedRegStatus(normRegStatus) && (
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              確認出席
            </span>
          )}
          {isWaitlistRegStatus(normRegStatus) && (
            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-950 text-amber-400 border border-amber-500/30">
              候補名單
            </span>
          )}
          {["kicked", "rejected"].includes(normRegStatus) && (
            <span className="px-3 py-1 rounded-full text-xs font-black bg-red-950 text-red-400 border border-red-500/30">
              資格移除
            </span>
          )}
          {isPendingRegStatus(normRegStatus) && (
            <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-800 text-zinc-400">
              審核中
            </span>
          )}

          {isOrganizer && reg.user_id !== currentUser?.id && (
            <div className="flex items-center gap-1">
              {!isConfirmedRegStatus(normRegStatus) && (
                <button
                  type="button"
                  onClick={() => requestHostAction(reg, "approve")}
                  className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition text-xs font-bold cursor-pointer"
                  title="通過審核 / 恢復資格"
                >
                  ✓
                </button>
              )}
              {!["kicked", "rejected"].includes(normRegStatus) && (
                <button
                  type="button"
                  onClick={() => requestHostAction(reg, "reject")}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition text-xs cursor-pointer"
                  title="移除資格 / 婉拒申請"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const currentFilledCount = registrations
    .filter(r => ["going", "confirmed", "accepted"].includes(String(r.status || "").toLowerCase()))
    .reduce((acc, curr) => acc + (event.registration_type === "individual" ? (1 + (curr.companion_count || 0)) : 1), 0);

  const remainingSlots = event.max_capacity ? (event.max_capacity - currentFilledCount) : 9999;
  const isFull = remainingSlots <= 0;

  const unitLabel = event.registration_type === "individual" ? "人" : "隊";
  const capacityDisplay = event.max_capacity 
    ? `${currentFilledCount} / ${event.max_capacity} ${unitLabel}` 
    : `${currentFilledCount} ${unitLabel} (無上限)`;

  const hoursToStart = (new Date(event.start_time).getTime() - Date.now()) / (3600 * 1000);
  const isLateInfractionTrigger = hoursToStart < (event.late_cancellation_hours || 24);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = `⚡ 運動約戰：${event.title}`;
    const shareText = `時間：${formatEventPeriod(event.start_time, event.end_time)}\n地點：${event.location_name}\n快點擊連結查看詳情與報名吧！`;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      } catch (err) {}
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      alert("複製失敗，請直接從瀏覽器網址列複製！");
    }
  };

  const handleDeleteEvent = async () => {
    if (!confirm("⚠️ 確定要澈底刪除這場賽事活動嗎？此動作將發送推播通知給所有已報名球友，且無法復原！")) return;
    setActionLoading(true);
    try {
      const activeRegs = registrations.filter(r => r.status !== "cancelled" && r.user_id !== currentUser?.id);
      if (activeRegs.length > 0) {
        const notifPayloads = activeRegs.map(reg => ({
          user_id: reg.user_id,
          sender_id: currentUser?.id,
          type: "event_cancelled",
          is_read: false,
          event_id: null,
          created_at: new Date().toISOString()
        }));
        await supabase.from("notifications").insert(notifPayloads);
      }

      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
      
      alert("🗑️ 活動已順利刪除，並自動發送推播通知給所有參賽球友！");
      router.push("/events/my");
      router.refresh();
    } catch (err: any) {
      alert("刪除活動失敗: " + err.message);
      setActionLoading(false);
    }
  };

  const handleIndividualJoin = async () => {
    if (!currentUser) return router.push("/auth");
    setActionLoading(true);
    try {
      const approvalMode = getEventApprovalMode(event);

      if (rejectedIndivReg) {
        const newStatus =
          approvalMode === "approval"
            ? "pending"
            : isFull
              ? "waitlist"
              : "going";
        const { error } = await supabase
          .from("event_registrations")
          .update({
            status: newStatus,
            companion_count: companionCount,
            alias: joinAlias.trim() || null,
            note: joinNote.trim() || null,
            last_updated_at: new Date().toISOString()
          })
          .eq("id", rejectedIndivReg.id);
        if (error) throw error;
        alert(
          approvalMode === "approval"
            ? "🎉 參賽申請已重新送出，請等候主辦審核！"
            : newStatus === "waitlist"
              ? "⏳ 已排入候補名單！"
              : "🎉 報名成功！"
        );
      } else {
        const { data, error } = await supabase.rpc("upsert_individual_rsvp", {
          p_event_id: eventId,
          p_companion_count: companionCount,
          p_alias: joinAlias.trim() || null,
          p_note: joinNote.trim() || null
        });

        if (error) {
          alert("報名失敗: " + error.message);
          return;
        }
        if (data && data.success === false) {
          alert(data.message);
          return;
        }
        alert(data?.message || "🎉 報名送出成功！");
      }

      try { await supabase.rpc("notify_event_registration", { p_event_id: eventId }); } catch (e) {}
      setJoinAlias("");
      setJoinNote("");
      await fetchEventDetails();
      router.refresh();
    } catch (err: any) {
      alert("報名失敗: " + (err.message || "系統發生未知異常"));
    } finally {
      setActionLoading(false);
    }
  };

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
      setQuitReason("");
      alert(data?.message || "已成功退出活動");
      await fetchEventDetails();
      router.refresh();
    } catch (err: any) {
      alert("取消失敗: 系統發生未知異常");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTeamApply = async () => {
    if (!selectedTeamId) return alert("請選擇代表球隊");
    const selectedTeam = myManagedTeams.find(t => t.id === selectedTeamId);
    if (selectedTeam?.sport_category && event.sport_category && selectedTeam.sport_category !== event.sport_category) {
      return alert("❌ 系統錯誤：所選球隊運動類別與本活動不吻合！");
    }

    setActionLoading(true);
    try {
      const existingReg = registrations.find(r => r.team_id === selectedTeamId);

      if (existingReg) {
        const { error } = await supabase
          .from("event_registrations")
          .update({
            status: "pending",
            alias: joinAlias.trim() || null,
            note: joinNote.trim() || null,
            last_updated_at: new Date().toISOString()
          })
          .eq("id", existingReg.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.rpc("apply_team_to_event", {
          p_event_id: eventId,
          p_team_id: selectedTeamId,
          p_alias: joinAlias.trim() || null,
          p_note: joinNote.trim() || null,
        });

        if (error) {
          alert("申請失敗: " + error.message);
          return;
        }
        if (data && data.success === false) {
          alert(data.message);
          return;
        }
      }

      try { await supabase.rpc("notify_event_registration", { p_event_id: eventId }); } catch (e) {}
      alert("🎉 球隊參賽申請已成功送出，請等候主辦方審核！");
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

  const handleTeamCancel = async () => {
    if (!activeTeamReg?.team_id) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc("cancel_team_event_registration", {
        p_event_id: eventId,
        p_team_id: activeTeamReg.team_id,
      });

      if (error) {
        alert("取消失敗: " + error.message);
        return;
      }
      if (data && data.success === false) {
        alert(data.message);
        return;
      }

      alert(data?.message || "已取消球隊參賽申請");
      await fetchEventDetails();
      router.refresh();
    } catch (err: any) {
      alert("取消失敗: 系統發生未知異常");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (
    regId: string,
    newStatus: string,
    targetUserId?: string | null,
    companionCount = 0
  ) => {
    setActionLoading(true);
    try {
      const approveStatus = event.registration_type === "team" ? "accepted" : "going";
      if (newStatus === approveStatus) {
        const slotsNeeded = event.registration_type === "individual" ? 1 + companionCount : 1;
        const filled = countFilledSlots(registrations, event.registration_type);
        if (event.max_capacity && filled + slotsNeeded > event.max_capacity) {
          alert("名額已滿，無法批准更多參賽者。請先移除或拒絕其他申請。");
          return;
        }
      }

      const { error } = await supabase
        .from("event_registrations")
        .update({ status: newStatus, last_updated_at: new Date().toISOString() })
        .eq("id", regId);

      if (error) throw error;

      if (newStatus === "kicked" && targetUserId) {
        await supabase.rpc("notify_event_kick", { p_event_id: eventId, p_user_id: targetUserId });
      }

      if (newStatus === approveStatus && targetUserId) {
        try {
          await supabase.rpc("notify_event_accepted", { p_event_id: eventId, p_user_id: targetUserId });
        } catch (e) {}
      }

      setHostAction(null);
      await fetchEventDetails();
      router.refresh();
    } catch (err: any) {
      alert("狀態更新失敗: " + (err.message || err.details));
    } finally {
      setActionLoading(false);
    }
  };

  const requestHostAction = (
    reg: any,
    action: "approve" | "reject"
  ) => {
    const displayName =
      reg.alias ||
      reg.profiles?.full_name ||
      reg.team?.name_zh ||
      reg.team?.name_en ||
      "未知球員";
    const newStatus =
      action === "approve"
        ? event.registration_type === "team"
          ? "accepted"
          : "going"
        : "kicked";

    setHostAction({
      regId: reg.id,
      newStatus,
      targetUserId: reg.user_id,
      displayName,
      action,
      companionCount: reg.companion_count || 0,
    });
  };

  const organizerName = event.organizer_team
    ? (event.organizer_team.name_zh || event.organizer_team.name_en || "未命名球隊")
    : (event.creator_profile?.full_name || "個人主辦");

  // 🔥 核心修復 404：將原本的 /network/ 修正為正確的 /p/
  const organizerHref = event.organizer_team
    ? `/team/${event.organizer_team.id}`
    : event.creator_profile?.id
      ? `/p/${event.creator_profile.id}`
      : null;

  const organizerAvatarUrl = event.organizer_team?.logo_url || event.creator_profile?.avatar_url || null;

  return (
    <div className="bg-slate-950 min-h-screen py-10 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-4xl mx-auto">
        
        {/* 頂部導覽列：返回與分享轉發 */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> 返回上一頁
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-black text-zinc-200 hover:text-white transition shadow-sm active:scale-95 cursor-pointer"
          >
            {isCopied ? (
              <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">已複製連結</span></>
            ) : (
              <><Share2 className="w-3.5 h-3.5 text-blue-400" /><span>分享 / 轉發賽事</span></>
            )}
          </button>
        </div>

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
              {event.registration_type === "individual" ? "👤 個人" : "🛡️ 團隊"}
            </span>

            {event.registration_type === "individual" && (
              <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                approvalMode === "approval"
                  ? "bg-indigo-950/50 text-indigo-300 border-indigo-500/30"
                  : "bg-emerald-950/50 text-emerald-300 border-emerald-500/30"
              }`}>
                {approvalMode === "approval" ? "主辦審核" : "先到先得"}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2">{event.title}</h1>

          {organizerHref ? (
            <Link href={organizerHref} className="inline-flex items-center gap-2.5 mb-5 group cursor-pointer">
              <div
                className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 bg-cover bg-center"
                style={organizerAvatarUrl ? { backgroundImage: `url(${organizerAvatarUrl})` } : undefined}
              >
                {!organizerAvatarUrl && (event.organizer_team ? <Shield className="w-4 h-4 text-zinc-500" /> : <UserIcon className="w-4 h-4 text-zinc-500" />)}
              </div>
              <span className="text-sm text-zinc-400">主辦：<span className="font-black text-white group-hover:text-blue-400 transition-colors underline decoration-slate-700 group-hover:decoration-blue-400 underline-offset-2">{organizerName}</span></span>
            </Link>
          ) : (
            <div className="inline-flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0"><UserIcon className="w-4 h-4 text-zinc-500" /></div>
              <span className="text-sm text-zinc-400">主辦：<span className="font-black text-white">{organizerName}</span></span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-zinc-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 mb-6">
            <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-blue-400 shrink-0" /><div><div className="text-xs text-zinc-500 font-bold">活動時間</div><div className="font-extrabold text-white">{formatEventPeriod(event.start_time, event.end_time)}</div></div></div>
            <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-amber-400 shrink-0" /><div><div className="text-xs text-zinc-500 font-bold">舉辦場地</div><div className="font-extrabold text-white">{event.location_name}</div>{event.location_address && <div className="text-xs text-zinc-400">{event.location_address}</div>}</div></div>
            
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs text-zinc-500 font-bold">名額狀況</div>
                <div className="font-extrabold text-white">
                  已佔用：{capacityDisplay}
                  {isFull && <span className="ml-2 text-xs font-black text-red-400">(名額已滿，排隊候補中)</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3"><Trophy className="w-5 h-5 text-purple-400 shrink-0" /><div><div className="text-xs text-zinc-500 font-bold">費用</div><div className="font-extrabold text-white">{event.fee > 0 ? `HKD $${event.fee}` : "免費活動"}</div></div></div>
          </div>

          {event.description && <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap bg-slate-950/30 p-4 rounded-2xl border border-slate-800/40">{event.description}</div>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左欄：互動報名操作台 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-black mb-4 border-b border-slate-800 pb-3 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" /> 報名控制台
              </h3>

              {isOrganizer ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-950/30 border border-blue-500/30 rounded-2xl text-center space-y-2">
                    <span className="text-xs font-black text-blue-400 uppercase tracking-wider block">您是本活動主辦人</span>
                    <p className="text-xs text-zinc-300">您可以在右側名單審核參賽球隊或管理球員狀態。</p>
                  </div>
                  
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleDeleteEvent}
                    className="w-full py-3 rounded-xl bg-slate-950 border border-red-900/40 hover:bg-red-950/40 text-red-400 hover:text-red-300 text-xs font-black transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 澈底取消並刪除此活動
                  </button>
                </div>
              ) : event.registration_type === "individual" ? (
                activeIndivReg ? (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-2xl text-center border ${
                      isConfirmedRegStatus(activeIndivReg.status)
                        ? "bg-emerald-950/40 border-emerald-500/40"
                        : isPendingRegStatus(activeIndivReg.status)
                          ? "bg-slate-800/60 border-slate-600/40"
                          : "bg-amber-950/40 border-amber-500/40"
                    }`}>
                      <div className={`text-xs font-black uppercase mb-1 ${
                        isConfirmedRegStatus(activeIndivReg.status)
                          ? "text-emerald-400"
                          : isPendingRegStatus(activeIndivReg.status)
                            ? "text-zinc-400"
                            : "text-amber-400"
                      }`}>
                        您的狀態
                      </div>
                      <div className="text-xl font-black text-white">
                        {isConfirmedRegStatus(activeIndivReg.status) && "✅ 確認出席"}
                        {isPendingRegStatus(activeIndivReg.status) && "🛡️ 審核中"}
                        {isWaitlistRegStatus(activeIndivReg.status) && "⏳ 候補排隊中"}
                      </div>
                      {activeIndivReg.companion_count > 0 && (
                        <div className="text-xs text-zinc-300 mt-1">攜伴人數：+{activeIndivReg.companion_count} 人</div>
                      )}
                      {isPendingRegStatus(activeIndivReg.status) && (
                        <div className="text-[11px] text-zinc-400 mt-2">主辦批准後您將收到通知並正式列入參賽名單。</div>
                      )}
                    </div>

                    {isConfirmedRegStatus(activeIndivReg.status) && (
                      <div className="flex justify-center">
                        <CalendarExportButton event={event} />
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setIsQuitModalOpen(true)}
                      className="w-full py-3 rounded-xl bg-slate-800 hover:bg-red-950 hover:text-red-300 border border-slate-700 hover:border-red-500/50 text-zinc-400 font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "申請退出活動"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rejectedIndivReg && (
                      <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-2xl text-xs text-red-300 font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>您前次的參賽資格遭到移除，可調整備註留言後重新申請。</span>
                      </div>
                    )}

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
                            className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
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
                      className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-black text-sm transition shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : approvalMode === "approval" ? (
                        "送出參賽申請"
                      ) : isFull ? (
                        "排入候補名單"
                      ) : (
                        "立即報名參賽"
                      )}
                    </button>
                  </div>
                )
              ) : activeTeamReg ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-center">
                    <div className="text-xs font-black text-emerald-400 uppercase mb-1">您的球隊狀態</div>
                    <div className="text-xl font-black text-white">
                      {["accepted", "going", "confirmed"].includes(String(activeTeamReg.status || "").toLowerCase())
                        ? "✅ 已獲批准參賽"
                        : "🛡️ 審核中"}
                    </div>
                    <div className="text-xs text-zinc-300 mt-1">
                      代表球隊：{activeTeamReg.team?.name_zh || activeTeamReg.team?.name_en || "未命名球隊"}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <CalendarExportButton event={event} />
                  </div>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleTeamCancel}
                    className="w-full py-3 rounded-xl bg-slate-800 hover:bg-red-950 hover:text-red-300 border border-slate-700 hover:border-red-500/50 text-zinc-400 font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "取消球隊申請"}
                  </button>
                </div>
              ) : (
                myManagedTeams.length > 0 ? (
                  <div className="space-y-4">
                    {rejectedTeamReg && (
                      <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-2xl text-xs text-red-300 font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>「{rejectedTeamReg.team?.name_zh || rejectedTeamReg.team?.name_en || "該球隊"}」前次申請已被婉拒，可調整備註留言後重新申請。</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5">選擇代表參賽的球隊 *</label>
                      <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="">請選擇...</option>
                        {myManagedTeams.map(t => (
                          <option key={t.id} value={t.id}>{t.name_zh || t.name_en || "未命名球隊"}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-zinc-500 mt-1.5 pl-1">
                        僅顯示運動項目與本活動相符的球隊
                      </p>
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
                      className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-black text-sm transition flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "代表球隊送出參賽申請"}
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950 rounded-2xl text-center text-xs text-zinc-400">
                    僅限管理該運動項目球隊的管理員/教練代表隊伍申請參賽。
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
                <span className="text-xs text-zinc-500 font-normal">
                  {approvalMode === "approval" && !isOrganizer
                    ? `已確認 ${confirmedRegistrations.length} 人`
                    : `共 ${visibleRegistrations.length} 筆報名`}
                </span>
              </h3>

              {!isOrganizer && approvalMode === "approval" && (
                <p className="text-[11px] text-zinc-500 mb-4 -mt-2">
                  審核制活動僅顯示已確認出席者；其他待審申請不對外公開。
                </p>
              )}

              <div className="space-y-6">
                {event.registration_type === "team" ? (
                  visibleRegistrations.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 text-sm font-bold">
                      目前尚無人報名，快搶下第一席！
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {visibleRegistrations.map((reg) => renderRegistrationRow(reg))}
                    </div>
                  )
                ) : visibleRegistrations.length === 0 && !myPendingReg ? (
                  <div className="py-12 text-center text-zinc-500 text-sm font-bold">
                    目前尚無人報名，快搶下第一席！
                  </div>
                ) : (
                  <>
                    {myPendingReg && (
                      <div>
                        <h4 className="text-xs font-black text-zinc-500 uppercase tracking-wider mb-2">
                          您的申請
                        </h4>
                        {renderRegistrationRow(myPendingReg)}
                      </div>
                    )}

                    {confirmedRegistrations.length > 0 && (
                      <div>
                        <h4 className="text-xs font-black text-emerald-500/80 uppercase tracking-wider mb-2">
                          確認出席 ({confirmedRegistrations.length})
                        </h4>
                        <div className="space-y-3">
                          {confirmedRegistrations.map((reg) => renderRegistrationRow(reg))}
                        </div>
                      </div>
                    )}

                    {waitlistRegistrations.length > 0 && (
                      <div>
                        <h4 className="text-xs font-black text-amber-500/80 uppercase tracking-wider mb-2">
                          候補名單 ({waitlistRegistrations.length})
                        </h4>
                        <div className="space-y-3">
                          {waitlistRegistrations.map((reg) => renderRegistrationRow(reg))}
                        </div>
                      </div>
                    )}

                    {isOrganizer && pendingRegistrations.length > 0 && (
                      <div>
                        <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                          待審核 ({pendingRegistrations.length})
                        </h4>
                        <div className="space-y-3">
                          {pendingRegistrations.map((reg) => renderRegistrationRow(reg))}
                        </div>
                      </div>
                    )}

                    {isOrganizer &&
                      confirmedRegistrations.length === 0 &&
                      waitlistRegistrations.length === 0 &&
                      pendingRegistrations.length === 0 && (
                        <div className="py-12 text-center text-zinc-500 text-sm font-bold">
                          目前尚無人報名，快搶下第一席！
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 活動討論大廳 */}
        {canViewLobby && (
          <EventLobbyBoard eventId={eventId} currentUser={currentUser} isOrganizer={isOrganizer} returnTo={returnTo} />
        )}

      </div>

      {/* 主辦審核確認 Modal */}
      {hostAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
              {hostAction.action === "approve" ? (
                <><UserCheck className="w-5 h-5 text-blue-400" /> 確認通過審核？</>
              ) : (
                <><AlertTriangle className="w-5 h-5 text-red-400" /> 確認婉拒 / 移除？</>
              )}
            </h3>

            <p className="text-sm text-zinc-300 mb-4">
              {hostAction.action === "approve" ? (
                <>
                  確定要批准 <span className="font-black text-white">{hostAction.displayName}</span>
                  {hostAction.companionCount > 0 && (
                    <span className="text-blue-400">（含 {hostAction.companionCount} 位攜伴）</span>
                  )}
                  的參賽申請嗎？對方將收到通知。
                </>
              ) : (
                <>
                  確定要婉拒或移除 <span className="font-black text-white">{hostAction.displayName}</span> 的參賽資格嗎？此動作將通知對方。
                </>
              )}
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setHostAction(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-zinc-300 font-bold text-xs cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  handleUpdateStatus(
                    hostAction.regId,
                    hostAction.newStatus,
                    hostAction.targetUserId,
                    hostAction.companionCount
                  )
                }
                className={`px-5 py-2.5 rounded-xl disabled:bg-slate-800 text-white font-black text-xs transition cursor-pointer ${
                  hostAction.action === "approve"
                    ? "bg-blue-600 hover:bg-blue-500"
                    : "bg-red-600 hover:bg-red-500"
                }`}
              >
                {actionLoading ? "處理中..." : hostAction.action === "approve" ? "確認通過" : "確認移除"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                onClick={() => { setIsQuitModalOpen(false); setQuitReason(""); }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-zinc-300 font-bold text-xs cursor-pointer"
              >
                保留席位
              </button>
              <button
                type="button"
                disabled={actionLoading || !quitReason.trim()}
                onClick={confirmQuit}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white font-black text-xs transition cursor-pointer"
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