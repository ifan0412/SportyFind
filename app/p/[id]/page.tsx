"use client";

import { use, useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Phone, MapPin, X, EyeOff, MessageSquare, Zap, Star, AlertCircle, Users, GraduationCap, Activity } from "lucide-react";
import {
  formatDistrictList,
  formatSubdistrictList,
  normalizeDistrictIds,
  normalizeSubdistrictIds,
} from "@/lib/hk-locations";
import { RichBody } from "@/components/content/RichBody";
import { SportCategoryBadge } from "@/components/sports/SportCategoryBadge";
import { stripHtml, truncatePlainBio, serviceDescriptionPreview } from "@/lib/content/body";
import { reopenOrSendFriendRequest } from "@/lib/friendships";
import { mapHighlightGalleryFiles } from "@/lib/highlights-gallery";
import { ServicePublishBadge } from "@/components/services/ServicePublishBadge";
import { ComingSoonOverlay } from "@/components/ui/ComingSoonOverlay";
import { PhysioServiceTypeBadges } from "@/components/physio/PhysioServiceTypePicker";
import { normalizePhysioServiceTypes, physioCardServiceTags } from "@/lib/physio-service-types";
import { filterPhysioQualificationTags, filterCoachQualificationTags } from "@/lib/qualifications";
import { QualificationBadges } from "@/components/qualifications/QualificationBadges";
import { formatCoachServicePrice, formatPhysioServicePrice } from "@/lib/coach-pricing";
import { GenderAvatarBadge } from "@/components/profile/GenderBadge";

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
);

const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zM12 10.5v3c0 .828-.672 1.5-1.5 1.5S9 14.328 9 13.5v-3c0-1.657 1.343-3 3-3s3 1.343 3 3v2.25c0 .414-.336.75-.75.75s-.75-.336-.75-.75V10.5" /></svg>
);

interface Profile {
  id: string; full_name: string | null; handle: string | null; headline: string | null; bio: string | null; athlete_bio?: string | null; coach_bio?: string | null; location: string | null; avatar_url: string | null; status_tag: string | null; display_sports: string[] | null;
  is_player: boolean | null;
  is_coach: boolean | null;
  is_physio: boolean | null; physio_rate: number | null; clinic_name: string | null; physio_status: string | null; physio_region: string | null;
  contact_email?: string | null; contact_phone?: string | null; city_region?: string | null; address?: string | null; is_address_public?: boolean; coach_service_centre?: string | null; instagram_url?: string | null; facebook_url?: string | null; threads_url?: string | null;
  player_whatsapp?: string | null;
  player_phone_friends_only?: boolean | null;
  player_whatsapp_friends_only?: boolean | null;
  player_email_friends_only?: boolean | null;
  coach_districts?: string[] | null; coach_subdistricts?: string[] | null; coach_teaching_experience_years?: number | null;
  coach_qualification_tags?: string[] | null; coach_qualification_custom?: string | null;
  districts?: string[] | null; subdistricts?: string[] | null;
  physio_districts?: string[] | null; physio_subdistricts?: string[] | null;
  physio_contact_email?: string | null; physio_contact_phone?: string | null; physio_city_region?: string | null; physio_address?: string | null; physio_is_address_public?: boolean; physio_instagram_url?: string | null; physio_facebook_url?: string | null; physio_threads_url?: string | null;
  physio_experience_years?: string | null; physio_qualifications?: string | null; physio_services_offered?: string | null;
  physio_service_tags?: string[] | null;
  physio_qualification_tags?: string[] | null; physio_qualification_custom?: string | null;
  height_cm?: number | null; weight_kg?: number | null; show_physical_stats?: boolean | null;
  gender?: string | null;
}

interface UserSport { id: string; sports: { name: string } | null; metadata: Record<string, any>; }
interface MediaItem { id: string; sportName: string; url: string; }

type TopRole = "athlete" | "coach" | "physio";
type AthleteTab = "expertise" | "highlights" | "feed";
type FriendshipStatus = "none" | "pending_sent" | "pending_received" | "accepted";

const StatusBadge = ({ tag, type = "athlete" }: { tag: string | null, type?: "athlete"|"coach"|"physio" }) => {
  if (tag === "hidden" || tag === "draft") return null;
  if (type === "physio") {
    if (tag === "available") return <div className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] px-2.5 py-1 rounded-full font-black"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> 開放預約</div>;
    return <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2.5 py-1 rounded-full font-black"><div className="w-1.5 h-1.5 rounded-full bg-red-400" /> 滿診中</div>;
  }
  if (type === "coach") {
    if (tag === "recruiting") return <div className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] px-2.5 py-1 rounded-full font-black"><div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" /> 招生中</div>;
    return <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2.5 py-1 rounded-full font-black"><div className="w-1.5 h-1.5 rounded-full bg-red-400" /> 滿員</div>;
  }
  if (tag === "recruiting") return <div className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] px-2.5 py-1 rounded-full font-black"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> 招募新血</div>;
  if (tag === "seeking_team") return <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] px-2.5 py-1 rounded-full font-black"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> 尋找隊伍</div>;
  if (tag === "open_to_match") return <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2.5 py-1 rounded-full font-black"><div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> 開放約戰</div>;
  return <div className="inline-flex items-center gap-1.5 bg-slate-800/50 border border-slate-700/50 text-zinc-400 text-[10px] px-2.5 py-1 rounded-full font-black"><div className="w-1.5 h-1.5 rounded-full bg-slate-500" /> 穩定狀態</div>;
};

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">載入名片中...</div>}>
      <PublicProfilePageContent params={params} />
    </Suspense>
  );
}

function PublicProfilePageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  const [contactModalRole, setContactModalRole] = useState<"coach" | "physio" | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [coachServices, setCoachServices] = useState<any[]>([]);
  const [physioServices, setPhysioServices] = useState<any[]>([]);
  const [coachReviews, setCoachReviews] = useState<any[]>([]);
  const [physioReviews, setPhysioReviews] = useState<any[]>([]);
  const [userSports, setUserSports] = useState<UserSport[]>([]);
  const [galleryMedia, setGalleryMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [activeRole, setActiveRole] = useState<TopRole>("athlete");
  const [activeAthleteTab, setActiveAthleteTab] = useState<AthleteTab>("expertise");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>("none");
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);
  const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);

  const handleTabChange = (role: TopRole) => {
    setActiveRole(role);
    const q = new URLSearchParams();
    if (returnTo) q.set("returnTo", returnTo);
    if (role !== "athlete") q.set("tab", role);
    const qs = q.toString();
    router.replace(`/p/${id}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const refetchFriendshipStatus = useCallback(async (uid: string) => {
    const { data: friendData } = await supabase
      .from("friendships")
      .select("id, status, sender_id, receiver_id")
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${uid})`)
      .maybeSingle();

    if (friendData) {
      setFriendshipId(friendData.id);
      if (friendData.status === "accepted") setFriendshipStatus("accepted");
      else if (friendData.status === "pending") setFriendshipStatus(friendData.sender_id === uid ? "pending_sent" : "pending_received");
      else setFriendshipStatus("none");
    } else {
      setFriendshipId(null);
      setFriendshipStatus("none");
    }
  }, [id, supabase]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          { data: prof, error: profErr },
          { data: usData },
          { data: reviewsData },
          { data: { user } }
        ] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", id).single(),
          supabase.from("user_sports").select("id, metadata, sort_order, sports(name)").eq("user_id", id).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
          supabase.from("coach_reviews").select("rating").eq("coach_id", id),
          supabase.auth.getUser(),
        ]);
  
        if (profErr || !prof) { setIsNotFound(true); return; }
        const p = prof as Profile;
        setProfile(p);
        if (usData) setUserSports(usData as unknown as UserSport[]);

        const uid = user?.id ?? null;
        const isOwner = uid === id;
        setCurrentUserId(uid);

        const [{ data: coachSvc }, { data: physioSvc }] = await Promise.all([
          isOwner
            ? supabase.from("coach_services").select("*").eq("coach_id", id).order("sort_order", { ascending: true }).order("created_at", { ascending: true })
            : supabase.from("coach_services").select("*").eq("coach_id", id).eq("is_active", true).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
          isOwner
            ? supabase.from("physio_services").select("*").eq("physio_id", id).order("sort_order", { ascending: true }).order("created_at", { ascending: true })
            : supabase.from("physio_services").select("*").eq("physio_id", id).eq("is_active", true).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
        ]);
        if (coachSvc) setCoachServices(coachSvc);
        if (physioSvc) {
          setPhysioServices(physioSvc);
          if (physioSvc.length > 0) {
            const serviceIds = physioSvc.map((s: { id: string }) => s.id);
            const { data: physioRevData } = await supabase
              .from("physio_reviews")
              .select("rating")
              .in("service_id", serviceIds);
            if (physioRevData) setPhysioReviews(physioRevData);
          }
        }
        if (reviewsData) setCoachReviews(reviewsData);

        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const tabParam = urlParams.get("tab");
          if (tabParam === "coach") setActiveRole("coach");
          else if (tabParam === "physio") setActiveRole("physio");
          else if (p.is_player === false) {
            if (p.is_coach) setActiveRole("coach");
            else if (p.is_physio) setActiveRole("physio");
          }
        }
  
        if (user) {
          if (user.id !== id) await refetchFriendshipStatus(user.id);
        }
  
        const { data: storageFiles } = await supabase.storage.from("highlights").list(`${id}/`, { limit: 20 });
        if (storageFiles) {
          setGalleryMedia(
            mapHighlightGalleryFiles(supabase, id, storageFiles, "賽場高光").map(({ id: mediaId, sportName, url }) => ({
              id: mediaId,
              sportName,
              url,
            }))
          );
        }
      } catch (err) { setIsNotFound(true); } finally { setIsLoading(false); }
    };
    fetchData();
  }, [id, supabase, refetchFriendshipStatus]);
  
  useEffect(() => {
    if (!currentUserId || !id || currentUserId === id) return;
    const channel = supabase
      .channel(`profile-friendship-${currentUserId}-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, async (payload) => {
        const row = (payload.new || payload.old) as any; 
        if (row && ((row.sender_id === currentUserId && row.receiver_id === id) || (row.sender_id === id && row.receiver_id === currentUserId))) {
          await refetchFriendshipStatus(currentUserId);
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, id, supabase, refetchFriendshipStatus]);

  const handleSendRequest = async () => {
    if (!currentUserId) return;
    setFriendLoading(true);
    try {
      const { friendshipId: newId, error } = await reopenOrSendFriendRequest(supabase, currentUserId, id);
      if (error) throw error;
      if (newId) setFriendshipId(newId);
      await refetchFriendshipStatus(currentUserId);
      window.dispatchEvent(new CustomEvent("sync-friendship"));
      router.refresh();
    } catch (err: any) {
      if (err?.code === "23505") await refetchFriendshipStatus(currentUserId);
      else alert(`發送失敗: ${err?.message || "發生未知錯誤"}`);
    } finally { setFriendLoading(false); }
  };

  const handleCancelOrUnfriend = async () => {
    if (!friendshipId || !currentUserId) return;
    setFriendLoading(true);
    try {
      const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
      if (error) throw error;
      setShowUnfriendConfirm(false);
      await refetchFriendshipStatus(currentUserId);
      window.dispatchEvent(new CustomEvent("sync-friendship")); 
      router.refresh();
    } catch (err: any) { alert(`解除失敗: ${err.message || "發生未知錯誤"}`);
    } finally { setFriendLoading(false); }
  };

  const handleAcceptRequest = async () => {
    if (!friendshipId || !currentUserId) return;
    setFriendLoading(true);
    try {
      const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
      if (error) throw error;
      await refetchFriendshipStatus(currentUserId);
      window.dispatchEvent(new CustomEvent("sync-friendship")); 
      router.refresh();
    } catch (err: any) { alert(`接受失敗: ${err.message || "發生未知錯誤"}`);
    } finally { setFriendLoading(false); }
  };

  const handleRejectRequest = async () => {
    if (!friendshipId || !currentUserId) return;
    setFriendLoading(true);
    try {
      const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
      if (error) throw error;
      await refetchFriendshipStatus(currentUserId);
      window.dispatchEvent(new CustomEvent("sync-friendship"));
      router.refresh();
    } catch (err: any) { alert(`拒絕失敗: ${err.message || "發生未知錯誤"}`);
    } finally { setFriendLoading(false); }
  };

  const FriendButton = () => {
    if (!currentUserId || currentUserId === id) return null;
    if (friendshipStatus === "accepted") {
      if (showUnfriendConfirm) {
        return (
          <div className="mt-4 bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-xl text-center animate-fadeIn">
            <p className="text-sm text-zinc-300 font-bold mb-4">確定要解除好友關係？</p>
            <div className="flex gap-2">
              <button onClick={handleCancelOrUnfriend} disabled={friendLoading} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black transition cursor-pointer">
                {friendLoading ? "處理中..." : "解除好友"}
              </button>
              <button onClick={() => setShowUnfriendConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-300 text-xs font-black transition cursor-pointer">
                取消
              </button>
            </div>
          </div>
        );
      }
      return <button onClick={() => setShowUnfriendConfirm(true)} className="w-full mt-4 py-2.5 px-6 rounded-full text-sm font-black bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 transition-all duration-300 cursor-pointer">✓ 已加好友</button>;
    }
    if (friendshipStatus === "pending_sent") return <button onClick={handleCancelOrUnfriend} disabled={friendLoading} className="w-full mt-4 py-2.5 px-6 rounded-full text-sm font-black bg-slate-800 border border-slate-700 text-zinc-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all duration-300 cursor-pointer">{friendLoading ? "處理中..." : "⏳ 已發送請求（點擊取消）"}</button>;
    if (friendshipStatus === "pending_received") {
      return (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-zinc-500 font-bold text-center">對方向你發送了好友請求</p>
          <div className="flex gap-2">
            <button onClick={handleAcceptRequest} disabled={friendLoading} className="flex-1 py-2.5 rounded-full text-sm font-black bg-blue-600 hover:bg-blue-500 text-white transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.3)] cursor-pointer">{friendLoading ? "處理中..." : "✓ 接受"}</button>
            <button onClick={handleRejectRequest} disabled={friendLoading} className="flex-1 py-2.5 rounded-full text-sm font-black bg-slate-800 border border-slate-700 text-zinc-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all duration-300 cursor-pointer">{friendLoading ? "處理中..." : "✕ 拒絕"}</button>
          </div>
        </div>
      );
    }
    return <button onClick={handleSendRequest} disabled={friendLoading} className="w-full mt-4 py-2.5 px-6 rounded-full text-sm font-black bg-blue-600 hover:bg-blue-500 text-white transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.3)] cursor-pointer">{friendLoading ? "處理中..." : "+ 加好友"}</button>;
  };

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">載入名片中...</div>;
  if (isNotFound || !profile) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center"><h1 className="text-4xl font-black text-white mb-2">404</h1><p className="text-zinc-500 mb-6">查無此名片或已關閉</p><Link href="/network" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">返回</Link></div>;

  const avatarSrc = profile.avatar_url || "";
  const canViewFriendOnlyContact = currentUserId === id || friendshipStatus === "accepted";
  const showPlayerEmail = !!profile.contact_email && (!profile.player_email_friends_only || canViewFriendOnlyContact);
  const showPlayerPhone = !!profile.contact_phone && (!profile.player_phone_friends_only || canViewFriendOnlyContact);
  const showPlayerWhatsapp = !!profile.player_whatsapp && (!profile.player_whatsapp_friends_only || canViewFriendOnlyContact);
  const hasPublicPlayer = profile.is_player !== false;
  const hasPublicCoach = profile.is_coach === true;
  const hasPublicPhysio = profile.is_physio && profile.physio_status !== "hidden";
  const showPhysicalStats = hasPublicPlayer && profile.show_physical_stats && (profile.height_cm || profile.weight_kg);

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-blue-500/30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton label={returnTo ? "返回上一頁" : "返回"} href={returnTo || undefined} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 sticky top-20 shadow-2xl text-center">
              <div className="relative w-32 h-32 mx-auto mb-6 overflow-visible">
                <div className="w-full h-full rounded-full bg-slate-800 border-2 border-slate-700/50 shadow-xl overflow-hidden bg-cover bg-center" style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : "none" }}>
                  {!avatarSrc && <div className="w-full h-full flex items-center justify-center text-4xl font-black text-zinc-600">PRO</div>}
                </div>
                <GenderAvatarBadge gender={profile.gender} size="sm" />
                <div className="absolute -bottom-3 flex justify-center w-full z-10">
                  {activeRole === "athlete" && <StatusBadge tag={profile.status_tag} type="athlete" />}
                  {activeRole === "physio" && <StatusBadge tag={profile.physio_status} type="physio" />}
                </div>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight mb-1">{profile.full_name}</h1>
              <p className="text-blue-400 font-mono text-sm mb-4">@{profile.handle || id.slice(0, 8)}</p>

              {showPhysicalStats && (
                <div className="flex items-center justify-center gap-4 px-4 py-1.5 rounded-full bg-slate-950/60 border border-slate-800 text-xs font-mono text-zinc-400 mb-4 mx-auto w-fit shadow-inner">
                  {profile.height_cm && <span>📏 {profile.height_cm} cm</span>}
                  {profile.weight_kg && <span className={profile.height_cm ? "border-l border-slate-700 pl-4" : ""}>⚖️ {profile.weight_kg} kg</span>}
                </div>
              )}

              <p className="text-sm font-bold text-zinc-400 mb-4">{profile.headline || "專注於每一次場上表現。"}</p>
              
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {hasPublicPlayer && <span className="bg-slate-800/80 text-zinc-300 text-[10px] font-black px-3 py-1 rounded-full border border-slate-700">👤 運動員</span>}
                {hasPublicCoach && <span className="bg-orange-500/10 text-orange-400 text-[10px] font-black px-3 py-1 rounded-full border border-orange-500/20">🎓 教練</span>}
                {hasPublicPhysio && <span className="bg-green-500/10 text-green-400 text-[10px] font-black px-3 py-1 rounded-full border border-green-500/20">⚕️ 運動/物理治療</span>}
              </div>
              
              <p className="text-sm text-zinc-300 leading-relaxed text-left bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50 mb-6">
                {truncatePlainBio(profile.bio || "") || "這位運動員很低調，還沒有留下詳細的自介。"}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500 font-medium">
                <span>📍 {formatDistrictList(normalizeDistrictIds(profile.districts, profile.location), 2) || profile.location || "地點未公開"}</span>
              </div>

              <FriendButton />

              {currentUserId && currentUserId !== id && (
                <button
                  onClick={() => router.push(`/inbox?to=${id}&role=${activeRole}`)}
                  className="w-full mt-2.5 py-3 px-6 rounded-full text-sm font-black bg-blue-600 hover:bg-blue-500 text-white transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.3)] cursor-pointer flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" /> 站內訊息
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-1 rounded-2xl flex w-full sticky top-16 z-30 mb-8 shadow-sm overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {hasPublicPlayer && (
                <button onClick={() => handleTabChange("athlete")} className={`flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 min-w-[100px] cursor-pointer ${activeRole === "athlete" ? "bg-slate-50 text-black shadow-lg scale-[1.02]" : "text-zinc-500 hover:text-white hover:bg-slate-800/50"}`}><Users className="w-5 h-5 mb-0.5" strokeWidth={2.5} /><span className="text-[10px] md:text-xs font-black leading-tight">運動員簡歷</span></button>
              )}
              {hasPublicCoach && (
                <button onClick={() => handleTabChange("coach")} className={`flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 min-w-[100px] cursor-pointer ${activeRole === "coach" ? "bg-orange-500 text-black shadow-lg scale-[1.02]" : "text-zinc-500 hover:text-orange-400 hover:bg-slate-800/50"}`}><GraduationCap className="w-5 h-5 mb-0.5" strokeWidth={2.5} /><span className="text-[10px] md:text-xs font-black leading-tight">教練簡介</span></button>
              )}
              {hasPublicPhysio && (
                <button onClick={() => handleTabChange("physio")} className={`flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 min-w-[100px] cursor-pointer ${activeRole === "physio" ? "bg-green-500 text-black shadow-lg scale-[1.02]" : "text-zinc-500 hover:text-green-400 hover:bg-slate-800/50"}`}><Activity className="w-5 h-5 mb-0.5" strokeWidth={2.5} /><span className="text-[10px] md:text-xs font-black leading-tight">運動/物理治療</span></button>
              )}
            </div>

            <div className="flex-1 animate-fadeIn">
              {activeRole === "athlete" && hasPublicPlayer && (
                <div className="space-y-6">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
                    <h3 className="text-sm font-black text-blue-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                      <span>👤</span> 運動員 Bio
                    </h3>
                    <RichBody
                      html={profile.athlete_bio}
                      emptyText="目前尚未填寫運動員簡介。"
                      className="text-sm leading-relaxed"
                    />
                  </div>

                  {(showPlayerEmail || showPlayerPhone || showPlayerWhatsapp) && (
                    <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
                      <div className="text-xs font-black text-blue-400 mb-3">運動員聯絡資訊</div>
                      <div className="flex flex-wrap gap-2">
                        {showPlayerEmail && (
                          <a href={`mailto:${profile.contact_email}`} className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-zinc-200 font-bold text-xs hover:bg-slate-800 transition">
                            ✉️ {profile.contact_email}
                          </a>
                        )}
                        {showPlayerPhone && (
                          <a href={`tel:${profile.contact_phone}`} className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-zinc-200 font-bold text-xs hover:bg-slate-800 transition">
                            📞 {profile.contact_phone}
                          </a>
                        )}
                        {showPlayerWhatsapp && (
                          <a href={`https://wa.me/${String(profile.player_whatsapp).replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer" className="bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded-xl text-white font-black text-xs transition inline-flex items-center gap-1.5">
                            💬 WhatsApp
                          </a>
                        )}
                      </div>
                      {!canViewFriendOnlyContact && ((profile.player_email_friends_only && profile.contact_email) || (profile.player_phone_friends_only && profile.contact_phone) || (profile.player_whatsapp_friends_only && profile.player_whatsapp)) && (
                        <p className="text-[11px] text-zinc-500 mt-2">部份聯絡方式只開放給好友查看。</p>
                      )}
                    </div>
                  )}
                  <div className="flex gap-4 border-b border-slate-800 pb-2 px-2">
                    <button onClick={() => setActiveAthleteTab("expertise")} className={`text-sm font-black transition cursor-pointer ${activeAthleteTab === "expertise" ? "text-white border-b-2 border-blue-500 pb-2 -mb-[9px]" : "text-zinc-500 hover:text-zinc-300"}`}>技術特長</button>
                    <button onClick={() => setActiveAthleteTab("highlights")} className={`text-sm font-black transition cursor-pointer ${activeAthleteTab === "highlights" ? "text-white border-b-2 border-blue-500 pb-2 -mb-[9px]" : "text-zinc-500 hover:text-zinc-300"}`}>賽場圖庫</button>
                    <button onClick={() => setActiveAthleteTab("feed")} className={`text-sm font-black transition cursor-pointer ${activeAthleteTab === "feed" ? "text-white border-b-2 border-blue-500 pb-2 -mb-[9px]" : "text-zinc-500 hover:text-zinc-300"}`}>個人動態</button>
                  </div>

                  {activeAthleteTab === "expertise" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
                      {userSports.length === 0 ? (
                        <div className="md:col-span-2 text-center py-10 border border-dashed border-slate-800 rounded-2xl text-zinc-500 text-sm font-bold">尚未宣告專業項目。</div>
                      ) : (
                        userSports.map((us) => (
                          <div key={us.id} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                            <span className="text-xl font-black text-white mb-4 block relative z-10">{us.sports?.name}</span>
                            <div className="space-y-2 relative z-10">
                              {Object.entries(us.metadata || {}).map(([key, val]) => (
                                <div key={key} className="flex justify-between text-sm pb-1 border-b border-slate-800/50 last:border-0">
                                  <span className="text-zinc-500 font-bold capitalize">{key}</span>
                                  <span className="text-blue-400 font-black">{val as string}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeAthleteTab === "highlights" && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-4">
                      {galleryMedia.length === 0 ? (
                        <div className="col-span-3 text-center py-10 border border-dashed border-slate-800 rounded-2xl text-zinc-500 text-sm font-bold">相簿空空如也。</div>
                      ) : (
                        galleryMedia.map(m => (
                          <div key={m.id} className="aspect-square bg-slate-900 rounded-xl overflow-hidden cursor-pointer group relative">
                            <img src={m.url} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt="Highlight" />
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeAthleteTab === "feed" && (
                    <ComingSoonOverlay>
                      <div className="space-y-6 pt-4 animate-fadeIn max-w-3xl">
                        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-slate-800 bg-cover bg-center" style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : "none" }} />
                            <div>
                              <h4 className="text-sm font-black text-white">{profile.full_name}</h4>
                              <span className="text-[10px] text-zinc-500 uppercase">剛剛發布</span>
                            </div>
                          </div>
                          <p className="text-sm text-zinc-300 font-medium leading-relaxed">持續訓練，準備迎接下一個賽季！目前的技術儲備已經到位，期待能在友誼賽中驗證成果。🔥</p>
                        </div>
                      </div>
                    </ComingSoonOverlay>
                  )}
                </div>
              )}

              {activeRole === "coach" && (
                <div className="space-y-6 animate-fadeIn">
                  {!profile.is_coach ? (
                    <div className="p-12 bg-slate-900/40 border border-slate-800 rounded-3xl text-center space-y-3">
                      <AlertCircle className="w-10 h-10 text-zinc-500 mx-auto" />
                      <div className="text-base font-bold text-zinc-300">🚫 此運動員目前未開啟或已暫停教練授課專區</div>
                      <p className="text-xs text-zinc-500 max-w-md mx-auto">該使用者並未對外公開教練服務或正在調整教學內容中。</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl mt-2">
                        <div className="space-y-2 max-w-2xl">
                          <h3 className="text-sm font-black text-orange-400 uppercase tracking-wider flex items-center gap-2">
                            <span>🎓</span> 專業教學簡介
                          </h3>
                          <RichBody
                            html={profile.coach_bio}
                            emptyText="目前尚未填寫專屬的專業教學導讀。"
                            className="text-sm leading-relaxed"
                          />
                          {filterCoachQualificationTags(profile.coach_qualification_tags).length > 0 && (
                            <div className="pt-2">
                              <QualificationBadges
                                tags={filterCoachQualificationTags(profile.coach_qualification_tags)}
                                accent="orange"
                                size="xs"
                                max={6}
                              />
                            </div>
                          )}
                          {profile.coach_qualification_custom && (
                            <p className="text-xs text-zinc-400 font-medium pt-1">{profile.coach_qualification_custom}</p>
                          )}
                        </div>

                        <div className="bg-slate-950 px-6 py-4 rounded-2xl border border-slate-800/80 text-center shrink-0 w-full md:w-auto">
                          <div className="text-xs font-bold text-zinc-500 mb-1">學員綜合總評</div>
                          <div className="text-2xl font-black text-orange-400 flex items-center justify-center gap-1.5">
                            <Star className="w-5 h-5 fill-orange-400 text-orange-400" />
                            {coachReviews.length > 0 
                              ? (coachReviews.reduce((acc, r) => acc + r.rating, 0) / coachReviews.length).toFixed(1)
                              : "5.0"}
                            <span className="text-xs text-zinc-500 font-normal">({coachReviews.length} 評價)</span>
                          </div>
                        </div>
                      </div>

                      {(profile.contact_email || profile.contact_phone || profile.city_region || profile.address || profile.coach_service_centre || (profile.coach_districts && profile.coach_districts.length > 0)) && (
                        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
                          <span className="font-black text-orange-400 flex items-center gap-1 shrink-0 text-xs">
                            <MapPin className="w-3.5 h-3.5" /> 授課據點與聯絡：
                          </span>

                          <div className="flex flex-wrap items-center gap-2 flex-1">
                            {profile.coach_service_centre && (
                              <span className="bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-500/20 text-orange-300 font-bold text-xs">
                                🏢 {profile.coach_service_centre}
                              </span>
                            )}

                            {(profile.coach_districts?.length || profile.city_region) && (
                              <span className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-zinc-200 font-bold text-xs">
                                📍 {formatDistrictList(normalizeDistrictIds(profile.coach_districts, profile.city_region), 3) || profile.city_region}
                              </span>
                            )}

                            {profile.coach_teaching_experience_years != null && profile.coach_teaching_experience_years > 0 && (
                              <span className="text-[10px] font-black px-2.5 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {profile.coach_teaching_experience_years} 年教學經驗
                              </span>
                            )}
                          </div>

                          {currentUserId !== id && (
                            <button
                              type="button"
                              onClick={() => setContactModalRole("coach")}
                              className="w-full sm:w-auto sm:min-w-[160px] bg-orange-600 hover:bg-orange-500 text-white font-black py-3 px-6 rounded-xl transition shadow-[0_0_15px_rgba(234,88,12,0.35)] active:scale-95 cursor-pointer text-sm"
                            >
                              聯絡資料
                            </button>
                          )}
                        </div>
                      )}

                      <div className="pt-2">
                        <h3 className="text-base md:text-lg font-black text-white mb-4 flex items-center justify-between">
                          <span>開放預約課程 / 訓練服務 ({coachServices.length})</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {coachServices.map((srv: any) => (
                            <div
                              key={srv.id}
                              className="bg-slate-900 border border-slate-800 hover:border-orange-500/50 rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between group"
                            >
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <SportCategoryBadge category={srv.sport_category} variant="orange" size="xs" />
                                    {currentUserId === id && <ServicePublishBadge isActive={!!srv.is_active} />}
                                  </div>
                                  {(() => {
                                    const p = formatCoachServicePrice(srv);
                                    return (
                                      <span className={`text-base font-black ${p.isDm ? "text-zinc-400" : "text-orange-400"}`}>
                                        {p.main}
                                        {p.unit && (
                                          <span className="text-xs text-zinc-500 font-normal ml-0.5">{p.unit}</span>
                                        )}
                                      </span>
                                    );
                                  })()}
                                </div>

                                <Link href={`/coaches/services/${srv.id}`} className="block">
                                  <h4 className="text-lg font-black text-white group-hover:text-orange-400 transition line-clamp-1">
                                    {srv.title}
                                  </h4>
                                </Link>

                                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                  {serviceDescriptionPreview(srv.description, "點擊查看完整課程內容與學員評價")}
                                </p>
                                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                                  <MapPin className="w-3 h-3 text-orange-400" />
                                  {formatDistrictList(normalizeDistrictIds(srv.districts, srv.location), 2) || "地點可商議"}
                                </div>
                              </div>

                              <div className="pt-4 mt-5 border-t border-slate-800/80">
                                {srv.is_active ? (
                                  <Link
                                    href={`/coaches/services/${srv.id}`}
                                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-3 rounded-2xl transition shadow-[0_0_15px_rgba(234,88,12,0.3)] active:scale-95 flex items-center justify-center gap-1.5 text-sm"
                                  >
                                    查看課程詳情 →
                                  </Link>
                                ) : currentUserId === id ? (
                                  <p className="text-center text-xs font-bold text-zinc-500 py-2">草稿 — 發佈後才會顯示於名師榜</p>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeRole === "physio" && (
                <div className="space-y-6 animate-fadeIn">
                  {!profile.is_physio ? (
                    <div className="p-12 bg-slate-900/40 border border-slate-800 rounded-3xl text-center space-y-3">
                      <AlertCircle className="w-10 h-10 text-zinc-500 mx-auto" />
                      <div className="text-base font-bold text-zinc-300">🚫 此運動員目前未開啟或已暫停物理治療專區</div>
                      <p className="text-xs text-zinc-500 max-w-md mx-auto">該使用者並未對外公開治療師服務或正在調整內容中。</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl mt-2">
                        <div className="space-y-2 max-w-2xl">
                          <h3 className="text-sm font-black text-green-400 uppercase tracking-wider flex items-center gap-2">
                            <span>⚕️</span> 治療師專業簡介
                          </h3>
                          <RichBody
                            html={profile.physio_qualifications}
                            emptyText="目前尚未填寫專業資歷與簡介。"
                            className="text-sm leading-relaxed"
                          />
                          <div className="flex flex-wrap items-center gap-2 pt-3">
                            {profile.physio_experience_years && (
                              <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                                {profile.physio_experience_years} 年經驗
                              </span>
                            )}
                            {physioCardServiceTags(profile.physio_service_tags, null, physioServices).length > 0 && (
                              <PhysioServiceTypeBadges
                                types={physioCardServiceTags(profile.physio_service_tags, null, physioServices)}
                                size="xs"
                                max={6}
                              />
                            )}
                            {filterPhysioQualificationTags(profile.physio_qualification_tags).length > 0 && (
                              <QualificationBadges
                                tags={filterPhysioQualificationTags(profile.physio_qualification_tags)}
                                accent="green"
                                size="xs"
                                max={6}
                              />
                            )}
                          </div>
                          {profile.physio_qualification_custom && (
                            <p className="text-xs text-zinc-400 font-medium pt-2">{profile.physio_qualification_custom}</p>
                          )}
                          {profile.clinic_name && (
                            <p className="text-xs text-zinc-500 font-bold pt-2">
                              所屬：{profile.clinic_name}
                            </p>
                          )}
                        </div>

                        <div className="bg-slate-950 px-6 py-4 rounded-2xl border border-slate-800/80 text-center shrink-0 w-full md:w-auto">
                          <div className="text-xs font-bold text-zinc-500 mb-1">運動員綜合總評</div>
                          <div className="text-2xl font-black text-green-400 flex items-center justify-center gap-1.5">
                            <Star className="w-5 h-5 fill-green-400 text-green-400" />
                            {physioReviews.length > 0
                              ? (physioReviews.reduce((acc, r) => acc + r.rating, 0) / physioReviews.length).toFixed(1)
                              : "5.0"}
                            <span className="text-xs text-zinc-500 font-normal">({physioReviews.length} 評價)</span>
                          </div>
                        </div>
                      </div>

                      {(profile.physio_contact_email || profile.physio_contact_phone || profile.physio_city_region || profile.physio_address || profile.clinic_name || (profile.physio_districts && profile.physio_districts.length > 0)) && (
                        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
                          <span className="font-black text-green-400 flex items-center gap-1 shrink-0 text-xs">
                            <MapPin className="w-3.5 h-3.5" /> 服務據點與聯絡：
                          </span>

                          <div className="flex flex-wrap items-center gap-2 flex-1">
                            {profile.clinic_name && (
                              <span className="bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20 text-green-300 font-bold text-xs">
                                🏢 {profile.clinic_name}
                              </span>
                            )}

                            {(profile.physio_districts?.length || profile.physio_city_region) && (
                              <span className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-zinc-200 font-bold text-xs">
                                📍 {formatDistrictList(normalizeDistrictIds(profile.physio_districts, profile.physio_city_region), 3) || profile.physio_city_region}
                              </span>
                            )}
                          </div>

                          {currentUserId !== id && (
                            <button
                              type="button"
                              onClick={() => setContactModalRole("physio")}
                              className="w-full sm:w-auto sm:min-w-[160px] bg-green-600 hover:bg-green-500 text-white font-black py-3 px-6 rounded-xl transition shadow-[0_0_15px_rgba(34,197,94,0.35)] active:scale-95 cursor-pointer text-sm"
                            >
                              聯絡資料
                            </button>
                          )}
                        </div>
                      )}

                      <div className="pt-2">
                        <h3 className="text-base md:text-lg font-black text-white mb-4 flex items-center justify-between">
                          <span>診療項目 / 服務 ({physioServices.length})</span>
                        </h3>

                        {physioServices.length === 0 ? (
                          <p className="text-zinc-500 text-sm">尚未公開任何診療項目。</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {physioServices.map((srv: any) => (
                              <div
                                key={srv.id}
                                className="bg-slate-900 border border-slate-800 hover:border-green-500/50 rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between group"
                              >
                                <div className="space-y-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <PhysioServiceTypeBadges types={normalizePhysioServiceTypes(srv.service_types, srv.service_type)} size="xs" />
                                      {currentUserId === id && <ServicePublishBadge isActive={!!srv.is_active} />}
                                    </div>
                                  {(() => {
                                    const p = formatPhysioServicePrice(srv);
                                    return (
                                      <span className={`text-base font-black ${p.isDm ? "text-zinc-400" : "text-green-400"}`}>
                                        {p.main}
                                        {p.unit && (
                                          <span className="text-xs text-zinc-500 font-normal ml-0.5">{p.unit}</span>
                                        )}
                                      </span>
                                    );
                                  })()}
                                  </div>

                                  <Link href={`/physio/services/${srv.id}`} className="block">
                                    <h4 className="text-lg font-black text-white group-hover:text-green-400 transition line-clamp-1">
                                      {srv.title || "未命名項目"}
                                    </h4>
                                  </Link>

                                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                    {serviceDescriptionPreview(srv.description, "點擊查看完整診療內容與評價")}
                                  </p>
                                  <div className="space-y-1">
                                    {srv.service_centre && (
                                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-green-300">
                                        🏢 {srv.service_centre}
                                      </div>
                                    )}
                                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                                      <MapPin className="w-3 h-3 text-green-400" />
                                      {srv.full_address || formatDistrictList(normalizeDistrictIds(srv.districts, srv.location), 2) || "地點可商議"}
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-4 mt-5 border-t border-slate-800/80">
                                  {srv.is_active ? (
                                    <Link
                                      href={`/physio/services/${srv.id}`}
                                      className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-2xl transition shadow-[0_0_15px_rgba(34,197,94,0.3)] active:scale-95 flex items-center justify-center gap-1.5 text-sm"
                                    >
                                      查看項目詳情 →
                                    </Link>
                                  ) : currentUserId === id ? (
                                    <p className="text-center text-xs font-bold text-zinc-500 py-2">草稿 — 發佈後才會顯示於名錄</p>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {contactModalRole && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          {(() => {
            const isPhysio = contactModalRole === "physio";
            const modalEmail = isPhysio ? profile.physio_contact_email : profile.contact_email;
            const modalPhone = isPhysio ? profile.physio_contact_phone : profile.contact_phone;
            const modalIg = isPhysio ? profile.physio_instagram_url : profile.instagram_url;
            const modalFb = isPhysio ? profile.physio_facebook_url : profile.facebook_url;
            const modalThreads = isPhysio ? profile.physio_threads_url : profile.threads_url;
            const modalServiceCentre = isPhysio ? profile.clinic_name : profile.coach_service_centre;
            const modalDistricts = isPhysio
              ? formatDistrictList(normalizeDistrictIds(profile.physio_districts, profile.physio_city_region), 3) || profile.physio_city_region
              : formatDistrictList(normalizeDistrictIds(profile.coach_districts, profile.city_region), 3) || profile.city_region;
            const modalAddress = isPhysio
              ? (profile.physio_is_address_public ? profile.physio_address : null)
              : (profile.is_address_public ? profile.address : null);
            
            const cleanPhone = modalPhone ? modalPhone.replace(/\D/g, "") : null;
            const roleTitle = isPhysio ? "物理治療" : "教練";
            const greeting = encodeURIComponent(`您好 ${profile.full_name || ""}！我在 SportyFind 上看到您的${roleTitle}檔案，希望能向您諮詢或預約。`);
            const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${greeting}` : null;

            return (
              <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative animate-slideUp">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {roleTitle} 聯絡
                    </span>
                    <h3 className="text-lg font-black text-white mt-1">聯絡 {profile.full_name}</h3>
                  </div>
                  <button onClick={() => setContactModalRole(null)} className="text-slate-400 hover:text-white transition cursor-pointer">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {(modalServiceCentre || modalDistricts || modalAddress) && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1">地點</p>
                      {modalServiceCentre && (
                        <div className="flex items-start gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <MapPin className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">服務中心</p>
                            <p className="text-sm font-medium text-white">{modalServiceCentre}</p>
                          </div>
                        </div>
                      )}
                      {modalDistricts && (
                        <div className="flex items-start gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <MapPin className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">服務地區</p>
                            <p className="text-sm font-medium text-white">{modalDistricts}</p>
                          </div>
                        </div>
                      )}
                      {modalAddress && (
                        <div className="flex items-start gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <MapPin className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">詳細地址</p>
                            <p className="text-sm font-medium text-white leading-relaxed">{modalAddress}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1">即時線上洽詢</p>
                    {whatsappUrl ? (
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-between bg-green-600 hover:bg-green-500 text-white font-black p-4 rounded-2xl transition shadow-[0_0_15px_rgba(34,197,94,0.2)] group cursor-pointer">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">💬</span>
                          <div className="text-left">
                            <div className="text-sm">使用 WhatsApp 洽詢</div>
                            <div className="text-[10px] text-green-200 font-normal">自動開啟並填入打招呼訊息</div>
                          </div>
                        </div>
                        <span className="group-hover:translate-x-1 transition-transform">↗</span>
                      </a>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-zinc-500 text-center font-bold">尚未設定 WhatsApp 聯絡電話</div>
                    )}
                    <button onClick={() => router.push(`/inbox?to=${id}&role=${contactModalRole}`)} className="w-full flex items-center justify-between bg-blue-600 hover:bg-blue-500 text-white font-black p-4 rounded-2xl transition shadow-[0_0_15px_rgba(37,99,235,0.3)] group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Zap className="w-6 h-6 text-yellow-300" />
                        <div className="text-left">
                          <div className="text-sm">站內即時訊息 (Platform Chat)</div>
                          <div className="text-[10px] text-blue-200 font-normal">將對話紀錄安全留於 SportyFind</div>
                        </div>
                      </div>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-800">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1">傳統聯絡方式</p>
                    {modalEmail && (
                      <a href={`mailto:${modalEmail}`} className="flex items-center gap-4 p-3 bg-slate-950 rounded-xl hover:bg-slate-800 transition border border-slate-800 cursor-pointer">
                        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Mail className="w-5 h-5" /></div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Email</p>
                          <p className="text-sm font-medium text-white truncate">{modalEmail}</p>
                        </div>
                      </a>
                    )}
                    {modalPhone && (
                      <a href={`tel:${modalPhone}`} className="flex items-center gap-4 p-3 bg-slate-950 rounded-xl hover:bg-slate-800 transition border border-slate-800 cursor-pointer">
                        <div className="p-2 bg-green-500/20 text-green-400 rounded-lg"><Phone className="w-5 h-5" /></div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Phone</p>
                          <p className="text-sm font-medium text-white truncate">{modalPhone}</p>
                        </div>
                      </a>
                    )}
                    {!modalEmail && !modalPhone && <div className="text-center text-xs text-zinc-500 py-3 font-bold border border-dashed border-slate-800 rounded-xl">無提供傳統聯絡管道，請利用上方站內訊息洽詢。</div>}
                  </div>

                  {(modalIg || modalFb || modalThreads) && (
                    <div className="pt-4 border-t border-slate-800">
                      <p className="text-xs font-bold text-slate-400 mb-3 text-center">追蹤社群</p>
                      <div className="flex justify-center gap-4">
                        {modalIg && <a href={modalIg} target="_blank" rel="noreferrer" className="w-12 h-12 bg-slate-800 hover:bg-pink-600 hover:text-white text-slate-300 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-110 cursor-pointer"><InstagramIcon className="w-5 h-5" /></a>}
                        {modalFb && <a href={modalFb} target="_blank" rel="noreferrer" className="w-12 h-12 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-110 cursor-pointer"><FacebookIcon className="w-5 h-5" /></a>}
                        {modalThreads && <a href={modalThreads} target="_blank" rel="noreferrer" className="w-12 h-12 bg-slate-800 hover:bg-slate-50 hover:text-black text-slate-300 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-110 cursor-pointer"><ThreadsIcon className="w-5 h-5" /></a>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}