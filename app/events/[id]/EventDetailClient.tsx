"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeSupabaseQuery } from "@/lib/supabase/safe-query";
import { useAuth } from "@/components/SupabaseProvider";
import { 
  Calendar, MapPin, Users, Shield, Trophy, AlertTriangle, 
  UserCheck, ArrowLeft, Loader2, User as UserIcon, Trash2, Pencil, ExternalLink
} from "lucide-react";
import Link from "next/link";
import EventLobbyBoard from "@/components/EventLobbyBoard";
import CalendarExportButton from "@/components/CalendarExportButton";
import { ShareMenu } from "@/components/share/ShareMenu";
import type { SharePayload } from "@/lib/share-payload";
import { profileLink } from "@/lib/profile-links";
import { formatEventPeriod } from "@/lib/event-datetime";
import {
  countFilledSlots,
  findUserIndividualRegistration,
  formatRegistrationDisplayName,
  getEventApprovalMode,
  getVisibleRegistrations,
  isConfirmedRegStatus,
  isEventAcceptingGuests,
  isPendingRegStatus,
  isRejectedRegStatus,
  isWaitlistRegStatus,
  joinWouldBeWaitlist,
  maxCompanionCountForJoin,
  normalizeRegStatus,
} from "@/lib/event-registration";
import { callUpsertIndividualRsvp, getJoinBlockReason } from "@/lib/event-rsvp";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { RichBody } from "@/components/content/RichBody";
import { eventMapQuery, googleMapsSearchUrl } from "@/lib/google-maps";
import {
  genderMeetsRequirement,
  genderRequirementRejectMessage,
  GENDER_REQUIREMENT_LABELS,
  normalizeGenderRequirement,
} from "@/lib/gender";
import { GenderAvatarBadge } from "@/components/profile/GenderBadge";
import { useFetchGeneration } from "@/lib/use-fetch-generation";
import { toast } from "sonner";
import { appConfirm } from "@/lib/app-dialog";
import { FormSelect } from "@/components/ui/form-select";

export default function EventDetailClient() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const returnTo = `/events/${eventId}`;

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { user: authUser, isLoading: authLoading } = useAuth();

  const [currentUserGender, setCurrentUserGender] = useState<string | null>(null);
  const [event, setEvent] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [myEventRegistration, setMyEventRegistration] = useState<any | null>(null);
  const [myManagedTeams, setMyManagedTeams] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingDetails, setIsSavingDetails] = useState(false);

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
    previousStatus: string;
  } | null>(null);

  const fetchGeneration = useFetchGeneration();
  const fetchRealtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchEventDetailsRef = useRef<() => Promise<void>>(async () => {});

  const fetchEventDetails = useCallback(async () => {
    const generation = fetchGeneration.nextGeneration();
    try {
      const { data: ev, error: evErr } = await safeSupabaseQuery(
        supabase
          .from("events")
          .select(`
          *,
          organizer_team:teams!organizer_team_id (id, name_zh, name_en, logo_url),
          creator_profile:profiles!creator_id (id, full_name, avatar_url)
        `)
          .eq("id", eventId)
          .single()
      );

      if (!fetchGeneration.isCurrent(generation)) return;

      if (evErr || !ev) {
        if (evErr) console.error("無法載入活動:", evErr.message, evErr);
        setEvent(null);
        return;
      }

      setEvent(ev);

      const { data: regs, error: regsErr } = await safeSupabaseQuery(
        supabase
          .from("event_registrations")
          .select(`
          *,
          profiles:user_id (id, full_name, avatar_url, gender),
          team:teams!team_id (id, name_zh, name_en)
        `)
          .eq("event_id", eventId)
          .order("registered_at", { ascending: true })
      );

      if (!fetchGeneration.isCurrent(generation)) return;

      if (regsErr) {
        console.error("載入報名名單失敗:", regsErr.message, regsErr);
      } else if (regs) {
        setRegistrations([...regs]);
      }

      if (authUser) {
        const { data: myReg } = await safeSupabaseQuery(
          supabase
            .from("event_registrations")
            .select("id, event_id, user_id, status, companion_count, alias, note, registered_at")
            .eq("event_id", eventId)
            .eq("user_id", authUser.id)
            .order("registered_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        );
        if (!fetchGeneration.isCurrent(generation)) return;
        setMyEventRegistration(myReg ?? null);

        const { data: profile } = await safeSupabaseQuery(
          supabase.from("profiles").select("gender").eq("id", authUser.id).maybeSingle()
        );
        if (!fetchGeneration.isCurrent(generation)) return;
        setCurrentUserGender(profile?.gender ?? null);

        const { data: tm } = await safeSupabaseQuery(
          supabase
            .from("team_members")
            .select("team_id, teams (id, name_zh, name_en, sport_category)")
            .eq("user_id", authUser.id)
            .in("role", ["admin", "coach"])
        );

        if (!fetchGeneration.isCurrent(generation)) return;

        if (tm) {
          const managedTeams = tm.filter((t) => t.teams).map((t: any) => t.teams);
          const sportFiltered = ev?.sport_category
            ? managedTeams.filter((t: any) => t.sport_category === ev.sport_category)
            : managedTeams;
          setMyManagedTeams(sportFiltered);
        } else {
          setMyManagedTeams([]);
        }
      } else {
        setMyEventRegistration(null);
        setCurrentUserGender(null);
        setMyManagedTeams([]);
      }
    } catch (err) {
      console.error("無法載入活動:", err);
    } finally {
      if (fetchGeneration.isCurrent(generation)) {
        setIsLoading(false);
      }
    }
  }, [supabase, eventId, authUser, fetchGeneration]);

  fetchEventDetailsRef.current = fetchEventDetails;

  useEffect(() => {
    if (authLoading) return;
    setIsLoading(true);
    void fetchEventDetails();
  }, [authLoading, fetchEventDetails]);

  useEffect(() => {
    if (!eventId) return;
    let isMounted = true;

    const channel = supabase
      .channel(`event-registrations-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_registrations", filter: `event_id=eq.${eventId}` },
        () => {
          if (!isMounted) return;
          if (fetchRealtimeTimerRef.current) clearTimeout(fetchRealtimeTimerRef.current);
          fetchRealtimeTimerRef.current = setTimeout(() => {
            if (isMounted) void fetchEventDetailsRef.current();
          }, 250);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (fetchRealtimeTimerRef.current) clearTimeout(fetchRealtimeTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [supabase, eventId]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-500" />
        載入賽事/活動詳情...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <Trophy className="w-12 h-12 text-zinc-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">找不到此活動</h2>
        <Link href="/events" className="text-blue-400 hover:underline text-sm">返回賽事/活動</Link>
      </div>
    );
  }

  const isOrganizer = Boolean(
    authUser && (
      event.creator_id === authUser.id ||
      (event.organizer_team_id && myManagedTeams.some(t => t.id === event.organizer_team_id))
    )
  );
  const isCreator = Boolean(authUser && event.creator_id === authUser.id);
  const acceptingGuests = isEventAcceptingGuests(event);

  const userIndivReg =
    findUserIndividualRegistration(registrations, authUser?.id) ?? myEventRegistration;
  const activeIndivReg =
    userIndivReg &&
    !["cancelled", "kicked", "rejected"].includes(normalizeRegStatus(userIndivReg.status))
      ? userIndivReg
      : undefined;
  const rejectedIndivReg =
    userIndivReg && isRejectedRegStatus(userIndivReg.status) ? userIndivReg : undefined;

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
    currentUserId: authUser?.id,
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
          normalizeRegStatus(r.status) !== "cancelled" &&
          isPendingRegStatus(r.status) &&
          r.user_id !== event.creator_id
      )
    : visibleRegistrations.filter((r) => isPendingRegStatus(r.status));
  const myPendingReg =
    event.registration_type === "individual" &&
    approvalMode === "approval" &&
    !isOrganizer &&
    activeIndivReg &&
    isPendingRegStatus(activeIndivReg.status)
      ? activeIndivReg
      : null;

  const renderRegistrationRow = (reg: any) => {
    const normRegStatus = normalizeRegStatus(reg.status);
    const displayName = formatRegistrationDisplayName(reg);

    return (
      <div
        key={reg.id}
        className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          {reg.profiles ? (
            <div className="relative shrink-0 w-10 h-10 overflow-visible">
              <Link href={profileLink(reg.profiles.id || reg.user_id, returnTo)} className="block w-full h-full">
                <div
                  className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center font-black text-xs overflow-hidden"
                  style={{
                    backgroundImage: reg.profiles.avatar_url ? `url(${reg.profiles.avatar_url})` : "none",
                    backgroundSize: "cover",
                  }}
                >
                  {!reg.profiles.avatar_url && (reg.profiles.full_name?.[0] || "?")}
                </div>
              </Link>
              <GenderAvatarBadge gender={reg.profiles.gender} size="xs" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center shrink-0">
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
              <div className="text-xs text-red-300/90 bg-red-950/40 border border-red-500/20 px-2.5 py-1 rounded-lg mt-1.5 truncate max-w-sm">
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
            <span className="px-3 py-1 rounded-full text-xs font-black bg-red-950 text-red-400 border border-red-500/30">
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

          {isOrganizer && reg.user_id !== authUser?.id && (
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

  const currentFilledCount = countFilledSlots(registrations, event.registration_type);

  const remainingSlots = event.max_capacity ? (event.max_capacity - currentFilledCount) : 9999;
  const isFull = remainingSlots <= 0;
  const maxCompanions = maxCompanionCountForJoin(event, registrations, activeIndivReg);
  const joinTargetsWaitlist = joinWouldBeWaitlist(
    event,
    registrations,
    Math.min(companionCount, maxCompanions),
    activeIndivReg
  );

  const unitLabel = event.registration_type === "individual" ? "人" : "隊";
  const capacityDisplay = event.max_capacity 
    ? `${currentFilledCount} / ${event.max_capacity} ${unitLabel}` 
    : `${currentFilledCount} ${unitLabel} (無上限)`;

  const hoursToStart = (new Date(event.start_time).getTime() - Date.now()) / (3600 * 1000);
  const isLateInfractionTrigger = hoursToStart < (event.late_cancellation_hours || 24);

  const sharePayload: SharePayload | null = event
    ? {
        type: "event",
        id: eventId,
        url: typeof window !== "undefined" ? window.location.href : `/events/${eventId}`,
        title: event.title,
        subtitle: `${formatEventPeriod(event.start_time, event.end_time)} · ${event.location_name}`,
        imageUrl: event.cover_image_url || undefined,
      }
    : null;

  const handleDeleteEvent = async () => {
    const confirmed = await appConfirm({
      title: "請確認",
      message: "⚠️ 確定要徹底刪除這場活動嗎？此動作將通知所有已報名參加者，且無法復原！",
      destructive: true,
    });
    if (!confirmed) return;
    setActionLoading(true);
    try {
      const activeRegs = registrations.filter(r => r.status !== "cancelled" && r.user_id !== authUser?.id);
      if (activeRegs.length > 0) {
        const notifPayloads = activeRegs.map(reg => ({
          user_id: reg.user_id,
          sender_id: authUser?.id,
          type: "event_cancelled",
          is_read: false,
          event_id: null,
          created_at: new Date().toISOString()
        }));
        await supabase.from("notifications").insert(notifPayloads);
      }

      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
      
      toast.success("🗑️ 活動已順利刪除，並自動發送推播通知給所有參賽球友！");
      router.push("/events/my");
      router.refresh();
    } catch (err: any) {
      toast.error("刪除活動失敗: " + err.message);
      setActionLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!isCreator) return;
    const nextTitle = editTitle.trim();
    if (!nextTitle) {
      toast.error("活動名稱不可空白");
      return;
    }
    setIsSavingDetails(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          title: nextTitle,
          description: editDescription.trim() || null,
        })
        .eq("id", eventId);
      if (error) throw error;
      setEvent((prev: any) => ({
        ...prev,
        title: nextTitle,
        description: editDescription.trim() || null,
      }));
      setIsEditingDetails(false);
      toast.success("活動名稱與介紹已更新！");
    } catch (err: any) {
      toast.error("儲存失敗: " + (err.message || "未知錯誤"));
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleToggleAcceptingGuests = async () => {
    if (!isOrganizer) return;
    setActionLoading(true);
    try {
      const nextValue = !acceptingGuests;
      const { error } = await supabase
        .from("events")
        .update({ accepting_guests: nextValue })
        .eq("id", eventId);
      if (error) throw error;
      setEvent((prev: any) => ({ ...prev, accepting_guests: nextValue }));
    } catch (err: any) {
      toast.error("更新失敗: " + (err.message || "未知錯誤"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleIndividualJoin = async () => {
    if (!authUser) return router.push("/auth");
    if (actionLoading) return;

    const requirement = event?.gender_requirement ?? "both";
    if (!genderMeetsRequirement(currentUserGender, requirement)) {
      toast.error(
        !currentUserGender
          ? "請先於個人檔案設定性別後再報名。"
          : genderRequirementRejectMessage(requirement)
      );
      return;
    }

    const safeCompanionCount = Math.min(companionCount, maxCompanions);
    const blockReason = getJoinBlockReason(
      event,
      registrations,
      userIndivReg,
      safeCompanionCount
    );
    if (blockReason) {
      toast.error(blockReason);
      return;
    }

    setActionLoading(true);
    try {
      const result = await callUpsertIndividualRsvp(supabase, {
        eventId,
        userId: authUser.id,
        companionCount: safeCompanionCount,
        alias: joinAlias.trim() || null,
        note: joinNote.trim() || null,
        existingReg: userIndivReg,
        event,
        registrations,
      });

      if (!result.success) {
        toast.error("報名失敗: " + result.message);
        return;
      }

      toast.success(result.message || "🎉 報名送出成功！");

      setJoinAlias("");
      setJoinNote("");
      setCompanionCount(0);
      fetchGeneration.invalidate();
      await fetchEventDetails();
      router.refresh();
    } catch (err: any) {
      toast.error("報名失敗: " + (err.message || "系統發生未知異常"));
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
        toast.error("取消失敗: " + error.message);
        return;
      }
      if (data && data.success === false) {
        toast.error(data.message);
        return;
      }

      setIsQuitModalOpen(false);
      setQuitReason("");
      toast(data?.message || "已成功退出活動");
      fetchGeneration.invalidate();
      await fetchEventDetails();
      router.refresh();
    } catch (err: any) {
      toast.error("取消失敗: 系統發生未知異常");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTeamApply = async () => {
    if (!selectedTeamId) {
      toast.error("請選擇代表球隊");
      return;
    }
    const selectedTeam = myManagedTeams.find(t => t.id === selectedTeamId);
    if (selectedTeam?.sport_category && event.sport_category && selectedTeam.sport_category !== event.sport_category) {
      toast.error("❌ 系統錯誤：所選球隊運動類別與本活動不吻合！");
      return;
    }

    const requirement = event?.gender_requirement ?? "both";
    if (!genderMeetsRequirement(currentUserGender, requirement)) {
      toast.error(
        !currentUserGender
          ? "請先於個人檔案設定性別後再申請。"
          : genderRequirementRejectMessage(requirement)
      );
      return;
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
          toast.error("申請失敗: " + error.message);
          return;
        }
        if (data && data.success === false) {
          toast.error(data.message);
          return;
        }
      }

      try { await supabase.rpc("notify_event_registration", { p_event_id: eventId }); } catch (e) {}
      toast.success("🎉 球隊參賽申請已成功送出，請等候主辦方審核！");
      setJoinAlias("");
      setJoinNote("");
      await fetchEventDetails();
      router.refresh();
    } catch (err: any) {
      toast.error("申請失敗: " + (err.message || err.details || "未知錯誤"));
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
        toast.error("取消失敗: " + error.message);
        return;
      }
      if (data && data.success === false) {
        toast.error(data.message);
        return;
      }

      toast(data?.message || "已取消球隊參賽申請");
      try {
        await supabase.rpc("notify_event_leave", { p_event_id: eventId });
      } catch {
        // Non-blocking
      }
      await fetchEventDetails();
      router.refresh();
    } catch (err: any) {
      toast.error("取消失敗: 系統發生未知異常");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (
    regId: string,
    newStatus: string,
    targetUserId?: string | null,
    companionCount = 0,
    previousStatus = ""
  ) => {
    setActionLoading(true);
    try {
      const approveStatus = event.registration_type === "team" ? "accepted" : "going";
      if (newStatus === approveStatus) {
        const slotsNeeded = event.registration_type === "individual" ? 1 + companionCount : 1;
        const filled = countFilledSlots(registrations, event.registration_type);
        if (event.max_capacity && filled + slotsNeeded > event.max_capacity) {
          toast.error("名額已滿，無法批准更多參賽者。請先移除或拒絕其他申請。");
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

      // Waitlist promotion alerts are sent by trg_promote_waitlist_on_registration_change.
      if (newStatus === approveStatus && targetUserId && !isWaitlistRegStatus(previousStatus)) {
        try {
          await supabase.rpc("notify_event_accepted", { p_event_id: eventId, p_user_id: targetUserId });
        } catch (e) {}
      }

      setHostAction(null);
      fetchGeneration.invalidate();
      await fetchEventDetails();
      router.refresh();
    } catch (err: any) {
      toast.error("狀態更新失敗: " + (err.message || err.details));
    } finally {
      setActionLoading(false);
    }
  };

  const requestHostAction = (
    reg: any,
    action: "approve" | "reject"
  ) => {
    const displayName = formatRegistrationDisplayName(reg);
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
      previousStatus: String(reg.status || ""),
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

          {sharePayload ? (
            <ShareMenu payload={sharePayload} label="分享賽事/活動" />
          ) : null}
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
                : "bg-red-950/50 text-red-300 border-red-500/30"
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

            {!acceptingGuests && (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-red-950/50 text-red-300 border border-red-500/30">
                主辦已暫停接受報名
              </span>
            )}
          </div>

          {isEditingDetails ? (
            <div className="mb-5 space-y-2">
              <label className="block text-xs font-bold text-zinc-500">活動名稱</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={120}
                placeholder="活動名稱"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg sm:text-2xl font-black text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          ) : (
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2">{event.title}</h1>
          )}

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
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-zinc-500 font-bold">舉辦場地</div>
                <div className="font-extrabold text-white">{event.location_name}</div>
                {event.location_address && (
                  <div className="text-xs text-zinc-400">{event.location_address}</div>
                )}
                {(() => {
                  const mapQ = eventMapQuery(event.location_name, event.location_address);
                  if (!mapQ) return null;
                  return (
                    <a
                      href={googleMapsSearchUrl(mapQ)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-black text-blue-300 hover:text-blue-200 transition"
                    >
                      <ExternalLink className="w-3 h-3" />
                      地圖
                    </a>
                  );
                })()}
              </div>
            </div>
            
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

            {event.gender_requirement && event.gender_requirement !== "both" && (
              <div className="flex items-center gap-3 sm:col-span-2">
                <UserIcon className="w-5 h-5 text-pink-400 shrink-0" />
                <div>
                  <div className="text-xs text-zinc-500 font-bold">報名性別要求</div>
                  <div className="font-extrabold text-white">{GENDER_REQUIREMENT_LABELS[normalizeGenderRequirement(event.gender_requirement)]}</div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {isEditingDetails ? (
              <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/40 space-y-3">
                <label className="block text-xs font-bold text-zinc-500">活動介紹</label>
                <RichTextEditor
                  value={editDescription}
                  onChange={setEditDescription}
                  placeholder="撰寫活動介紹、程度要求、報名須知…"
                  variant="compact"
                  minHeight="180px"
                />
                <p className="text-[10px] text-zinc-600">日期、時間與地點建立後不可在此修改。</p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={isSavingDetails}
                    onClick={() => {
                      setIsEditingDetails(false);
                      setEditTitle(event.title || "");
                      setEditDescription(event.description || "");
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-300 text-xs font-bold transition cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    disabled={isSavingDetails}
                    onClick={handleSaveDetails}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSavingDetails ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    儲存名稱與介紹
                  </button>
                </div>
              </div>
            ) : (
              <>
                {event.description ? (
                  <div className="text-sm text-zinc-300 leading-relaxed bg-slate-950/30 p-4 rounded-2xl border border-slate-800/40">
                    <RichBody html={event.description} />
                  </div>
                ) : isCreator ? (
                  <div className="text-sm text-zinc-500 italic bg-slate-950/30 p-4 rounded-2xl border border-slate-800/40">
                    尚無活動介紹
                  </div>
                ) : null}
                {isCreator && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditTitle(event.title || "");
                      setEditDescription(event.description || "");
                      setIsEditingDetails(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-zinc-300 hover:text-white transition cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    編輯名稱與介紹
                  </button>
                )}
              </>
            )}
          </div>
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
                    <p className="text-xs text-zinc-300">您可以在右側名單審核參賽球隊或管理參加者狀態。</p>
                  </div>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleToggleAcceptingGuests}
                    className={`w-full py-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer ${
                      acceptingGuests
                        ? "bg-red-600 hover:bg-red-500 text-white shadow-lg"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
                    }`}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : acceptingGuests ? (
                      "暫停接受報名"
                    ) : (
                      "重新開放報名"
                    )}
                  </button>
                  
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
                          : "bg-red-950/40 border-red-500/40"
                    }`}>
                      <div className={`text-xs font-black uppercase mb-1 ${
                        isConfirmedRegStatus(activeIndivReg.status)
                          ? "text-emerald-400"
                          : isPendingRegStatus(activeIndivReg.status)
                            ? "text-zinc-400"
                            : "text-red-400"
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
                    {!acceptingGuests && (
                      <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-2xl text-xs text-red-300 font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>主辦已暫停接受報名，新報名將排入{approvalMode === "approval" ? "審核" : "候補"}名單。</span>
                      </div>
                    )}

                    {rejectedIndivReg && (
                      <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-2xl text-xs text-red-300 font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>您前次的參賽資格遭到移除，可調整備註留言後重新申請。</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                        稱呼 / 綽號 <span className="text-zinc-500 font-normal">(選填)</span>
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
                        placeholder="例：自備裝備 / 初學程度..."
                        value={joinNote}
                        onChange={(e) => setJoinNote(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                        攜伴人數 (同行朋友)
                      </label>
                      {maxCompanions < 3 && (
                        <p className="text-[11px] text-amber-400/90 mb-2">
                          剩餘正式名額 {remainingSlots} 人，最多可攜 {maxCompanions} 位同伴。
                          {joinTargetsWaitlist && companionCount > 0
                            ? " 候補名單不接受攜伴。"
                            : ""}
                        </p>
                      )}
                      <div className="grid grid-cols-4 gap-2">
                        {[0, 1, 2, 3].map(num => (
                          <button
                            key={num}
                            type="button"
                            disabled={num > maxCompanions}
                            onClick={() => setCompanionCount(num)}
                            className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
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
                      className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white font-black text-sm transition shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : !acceptingGuests ? (
                        approvalMode === "approval" ? "送出參賽申請（審核名單）" : "排入候補名單"
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
                      <FormSelect
                        value={selectedTeamId}
                        onValueChange={setSelectedTeamId}
                        placeholder="請選擇..."
                        options={myManagedTeams.map((t) => ({
                          value: t.id,
                          label: t.name_zh || t.name_en || "未命名球隊",
                        }))}
                      />
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
                      className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white font-black text-sm transition flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer"
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
                        <h4 className="text-xs font-black text-red-500/80 uppercase tracking-wider mb-2">
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
          <EventLobbyBoard eventId={eventId} currentUser={authUser} isOrganizer={isOrganizer} returnTo={returnTo} />
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
                    hostAction.companionCount,
                    hostAction.previousStatus
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
              <AlertTriangle className="w-5 h-5 text-red-500" /> 確認退出此賽事/活動？
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