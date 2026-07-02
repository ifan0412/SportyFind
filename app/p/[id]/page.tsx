"use client";

import { use, useEffect, useState, useMemo, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Phone, MapPin, X, EyeOff } from "lucide-react"; 

// ── 自訂社群圖示 (SVG) ──
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zM12 10.5v3c0 .828-.672 1.5-1.5 1.5S9 14.328 9 13.5v-3c0-1.657 1.343-3 3-3s3 1.343 3 3v2.25c0 .414-.336.75-.75.75s-.75-.336-.75-.75V10.5" />
  </svg>
);
// ────────────────────────

interface Profile {
  id: string; full_name: string | null; handle: string | null; headline: string | null; bio: string | null; location: string | null; avatar_url: string | null; status_tag: string | null; display_sports: string[] | null;
  is_coach: boolean | null;
  is_physio: boolean | null; physio_rate: number | null; clinic_name: string | null; physio_status: string | null; physio_region: string | null;
  
  // 教練的聯絡與社群資訊
  contact_email?: string | null;
  contact_phone?: string | null;
  city_region?: string | null;
  address?: string | null;
  is_address_public?: boolean;
  instagram_url?: string | null;
  facebook_url?: string | null;
  threads_url?: string | null;

  // 防護員的聯絡與社群資訊
  physio_contact_email?: string | null;
  physio_contact_phone?: string | null;
  physio_city_region?: string | null;
  physio_address?: string | null;
  physio_is_address_public?: boolean;
  physio_instagram_url?: string | null;
  physio_facebook_url?: string | null;
  physio_threads_url?: string | null;

  // 防護員專業經歷
  physio_experience_years?: string | null;
  physio_qualifications?: string | null;
  physio_services_offered?: string | null;
}

interface CoachProfile { id: string; sport: string; rate: number; status: string; country: string; region: string; }
interface UserSport { id: string; sports: { name: string } | null; metadata: Record<string, any>; }
interface MediaItem { id: string; sportName: string; url: string; }

type TopRole = "athlete" | "coach" | "physio";
type AthleteTab = "expertise" | "highlights" | "feed";
type FriendshipStatus = "none" | "pending_sent" | "pending_received" | "accepted";

const StatusBadge = ({ tag, type = "athlete" }: { tag: string | null, type?: "athlete"|"coach"|"physio" }) => {
  if (tag === "hidden" || tag === "draft") return null;
  if (type === "physio") {
    if (tag === "available") return <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-black"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 開放預約</div>;
    return <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2.5 py-1 rounded-full font-black"><div className="w-1.5 h-1.5 rounded-full bg-red-400" /> 滿診中</div>;
  }
  if (type === "coach") {
    if (tag === "recruiting") return <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-2.5 py-1 rounded-full font-black"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> 招生中</div>;
    return <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2.5 py-1 rounded-full font-black"><div className="w-1.5 h-1.5 rounded-full bg-red-400" /> 滿員</div>;
  }
  if (tag === "recruiting") return <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-black"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 招募新血</div>;
  if (tag === "seeking_team") return <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] px-2.5 py-1 rounded-full font-black"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> 尋找隊伍</div>;
  if (tag === "open_to_match") return <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-2.5 py-1 rounded-full font-black"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> 開放約戰</div>;
  return <div className="inline-flex items-center gap-1.5 bg-slate-800/50 border border-slate-700/50 text-zinc-400 text-[10px] px-2.5 py-1 rounded-full font-black"><div className="w-1.5 h-1.5 rounded-full bg-slate-500" /> 穩定狀態</div>;
};

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter(); 

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [coachProfiles, setCoachProfiles] = useState<CoachProfile[]>([]);
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
          { data: coachesData },
          { data: { user } }
        ] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", id).single(),
          supabase.from("user_sports").select("id, metadata, sports(name)").eq("user_id", id),
          supabase.from("coach_profiles").select("*").eq("user_id", id).neq("status", "hidden"),
          supabase.auth.getUser(),
        ]);
  
        if (profErr || !prof) { setIsNotFound(true); return; }
        setProfile(prof as Profile);
        if (usData) setUserSports(usData as unknown as UserSport[]);
        if (coachesData) setCoachProfiles(coachesData);
  
        if (user) {
          const uid = user.id;
          setCurrentUserId(uid);
          if (uid !== id) await refetchFriendshipStatus(uid);
        }
  
        const { data: storageFiles } = await supabase.storage.from("highlights").list(`${id}/`, { limit: 20 });
        if (storageFiles && storageFiles.length > 0) {
          const fetchedGallery = storageFiles.filter(f => f.name !== ".emptyFolderPlaceholder").map(file => {
            const { data: urlData } = supabase.storage.from("highlights").getPublicUrl(`${id}/${file.name}`);
            return { id: file.id || file.name, sportName: "賽場高光", url: urlData.publicUrl };
          });
          setGalleryMedia(fetchedGallery);
        }
      } catch (err) { setIsNotFound(true); } finally { setIsLoading(false); }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, supabase]);
  
  useEffect(() => {
    if (!currentUserId || !id || currentUserId === id) return;
  
    const channel = supabase
      .channel(`profile-friendship-${currentUserId}-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, async (payload) => {
        // 👇 在這裡加上 as any，強制消除 TypeScript 警告
        const row = (payload.new || payload.old) as any; 
        
        if (row && ((row.sender_id === currentUserId && row.receiver_id === id) || (row.sender_id === id && row.receiver_id === currentUserId))) {
          await refetchFriendshipStatus(currentUserId);
        }
      }
    ).subscribe();
  
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, id, supabase]);

  const handleSendRequest = async () => {
    if (!currentUserId) return;
    setFriendLoading(true);
    try {
      const { error } = await supabase.from("friendships").insert({ sender_id: currentUserId, receiver_id: id, status: "pending" });
      if (error) throw error;
      await refetchFriendshipStatus(currentUserId);
      window.dispatchEvent(new CustomEvent("sync-friendship")); 
      router.refresh();
    } catch (err: any) {
      if (err.code === '23505') await refetchFriendshipStatus(currentUserId); 
      else alert(`發送失敗: ${err.message || "發生未知錯誤"}`);
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
              <button onClick={handleCancelOrUnfriend} disabled={friendLoading} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black transition shadow-[0_0_10px_rgba(220,38,38,0.2)]">
                {friendLoading ? "處理中..." : "解除好友"}
              </button>
              <button onClick={() => setShowUnfriendConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-300 text-xs font-black transition">
                取消
              </button>
            </div>
          </div>
        );
      }
      return <button onClick={() => setShowUnfriendConfirm(true)} className="w-full mt-4 py-2.5 px-6 rounded-full text-sm font-black bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 transition-all duration-300">✓ 已加好友</button>;
    }
    if (friendshipStatus === "pending_sent") return <button onClick={handleCancelOrUnfriend} disabled={friendLoading} className="w-full mt-4 py-2.5 px-6 rounded-full text-sm font-black bg-slate-800 border border-slate-700 text-zinc-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all duration-300">{friendLoading ? "處理中..." : "⏳ 已發送請求（點擊取消）"}</button>;
    if (friendshipStatus === "pending_received") {
      return (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-zinc-500 font-bold text-center">對方向你發送了好友請求</p>
          <div className="flex gap-2">
            <button onClick={handleAcceptRequest} disabled={friendLoading} className="flex-1 py-2.5 rounded-full text-sm font-black bg-blue-600 hover:bg-blue-500 text-white transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.3)]">{friendLoading ? "處理中..." : "✓ 接受"}</button>
            <button onClick={handleRejectRequest} disabled={friendLoading} className="flex-1 py-2.5 rounded-full text-sm font-black bg-slate-800 border border-slate-700 text-zinc-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all duration-300">{friendLoading ? "處理中..." : "✕ 拒絕"}</button>
          </div>
        </div>
      );
    }
    return <button onClick={handleSendRequest} disabled={friendLoading} className="w-full mt-4 py-2.5 px-6 rounded-full text-sm font-black bg-blue-600 hover:bg-blue-500 text-white transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.3)]">{friendLoading ? "處理中..." : "+ 加好友"}</button>;
  };

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">載入名片中...</div>;
  if (isNotFound || !profile) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center"><h1 className="text-4xl font-black text-white mb-2">404</h1><p className="text-zinc-500 mb-6">查無此名片或已關閉</p><Link href="/network" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">返回列表</Link></div>;

  const avatarSrc = profile.avatar_url || "";
  const hasPublicCoach = profile.is_coach && coachProfiles.length > 0;
  const hasPublicPhysio = profile.is_physio && profile.physio_status !== "hidden";

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-blue-500/30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton label="返回列表" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 sticky top-20 shadow-2xl text-center">
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="w-full h-full rounded-full bg-slate-800 border-2 border-slate-700/50 shadow-xl overflow-hidden bg-cover bg-center" style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : "none" }}>
                  {!avatarSrc && <div className="w-full h-full flex items-center justify-center text-4xl font-black text-zinc-600">PRO</div>}
                </div>
                <div className="absolute -bottom-3 flex justify-center w-full z-10">
                  {activeRole === "athlete" && <StatusBadge tag={profile.status_tag} type="athlete" />}
                  {activeRole === "physio" && <StatusBadge tag={profile.physio_status} type="physio" />}
                </div>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight mb-1">{profile.full_name}</h1>
              <p className="text-blue-400 font-mono text-sm mb-4">@{profile.handle || id.slice(0, 8)}</p>
              <p className="text-sm font-bold text-zinc-400 mb-4">{profile.headline || "專注於每一次場上表現。"}</p>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                <span className="bg-slate-800/80 text-zinc-300 text-[10px] font-black px-3 py-1 rounded-full border border-slate-700">👤 運動員</span>
                {hasPublicCoach && <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-3 py-1 rounded-full border border-amber-500/20">🎓 教練</span>}
                {hasPublicPhysio && <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-500/20">⚕️ 運動/物理治療</span>}
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed text-left bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50 mb-6">
                {profile.bio || "這位運動員很低調，還沒有留下詳細的自介。"}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500 font-medium">
                <span>📍 {profile.location || "地點未公開"}</span>
              </div>

              {/* Friend Button */}
              <FriendButton />
            </div>
          </div>

          <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-1 rounded-2xl flex w-full sticky top-16 z-30 mb-8 shadow-sm overflow-x-auto [&::-webkit-scrollbar]:hidden">
              <button onClick={() => setActiveRole("athlete")} className={`flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 min-w-[100px] ${activeRole === "athlete" ? "bg-slate-50 text-black shadow-lg scale-[1.02]" : "text-zinc-500 hover:text-white hover:bg-slate-800/50"}`}><span className="text-lg md:text-xl mb-0.5">👤</span><span className="text-[10px] md:text-xs font-black leading-tight">運動員簡歷</span></button>
              {hasPublicCoach && (
                <button onClick={() => setActiveRole("coach")} className={`flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 min-w-[100px] ${activeRole === "coach" ? "bg-amber-500 text-black shadow-lg scale-[1.02]" : "text-zinc-500 hover:text-amber-400 hover:bg-slate-800/50"}`}><span className="text-lg md:text-xl mb-0.5">🎓</span><span className="text-[10px] md:text-xs font-black leading-tight">教練專區</span></button>
              )}
              {hasPublicPhysio && (
                <button onClick={() => setActiveRole("physio")} className={`flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 min-w-[100px] ${activeRole === "physio" ? "bg-emerald-500 text-black shadow-lg scale-[1.02]" : "text-zinc-500 hover:text-emerald-400 hover:bg-slate-800/50"}`}><span className="text-lg md:text-xl mb-0.5">⚕️</span><span className="text-[10px] md:text-xs font-black leading-tight">運動/物理治療</span></button>
              )}
            </div>

            <div className="flex-1 animate-fadeIn">
              {activeRole === "athlete" && (
                <div className="space-y-6">
                  <div className="flex gap-4 border-b border-slate-800 pb-2 px-2">
                    <button onClick={() => setActiveAthleteTab("expertise")} className={`text-sm font-black transition ${activeAthleteTab === "expertise" ? "text-white border-b-2 border-blue-500 pb-2 -mb-[9px]" : "text-zinc-500 hover:text-zinc-300"}`}>技術特長</button>
                    <button onClick={() => setActiveAthleteTab("highlights")} className={`text-sm font-black transition ${activeAthleteTab === "highlights" ? "text-white border-b-2 border-blue-500 pb-2 -mb-[9px]" : "text-zinc-500 hover:text-zinc-300"}`}>賽場圖庫</button>
                    <button onClick={() => setActiveAthleteTab("feed")} className={`text-sm font-black transition ${activeAthleteTab === "feed" ? "text-white border-b-2 border-blue-500 pb-2 -mb-[9px]" : "text-zinc-500 hover:text-zinc-300"}`}>個人動態</button>
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
                  )}
                </div>
              )}

              {activeRole === "coach" && (
                <div className="space-y-8 animate-fadeIn">
                  
                  {/* 📍 教練專屬：公開聯絡與服務地點卡片 */}
                  {(profile.contact_email || profile.contact_phone || profile.city_region) && (
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 md:p-6 mb-8 mt-4">
                      <h3 className="text-sm md:text-base font-black text-white mb-5 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-500" />
                        聯絡與服務據點
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profile.contact_email && (
                          <div className="flex items-start gap-3 p-3 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                              <Mail className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase">Email</span>
                              <a href={`mailto:${profile.contact_email}`} className="text-sm font-medium text-white hover:text-blue-400 transition-colors truncate">
                                {profile.contact_email}
                              </a>
                            </div>
                          </div>
                        )}

                        {profile.contact_phone && (
                          <div className="flex items-start gap-3 p-3 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                              <Phone className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase">Phone</span>
                              <a href={`tel:${profile.contact_phone}`} className="text-sm font-medium text-white hover:text-emerald-400 transition-colors truncate">
                                {profile.contact_phone}
                              </a>
                            </div>
                          </div>
                        )}

                        {profile.city_region && (
                          <div className="flex items-start gap-3 p-3 bg-slate-950/50 rounded-2xl border border-slate-800/50 md:col-span-2">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                              <MapPin className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase">Location</span>
                              <span className="text-sm font-black text-white mt-0.5">
                                {profile.city_region}
                              </span>
                              {profile.is_address_public && profile.address ? (
                                <span className="text-xs font-medium text-slate-400 mt-1">
                                  {profile.address}
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                                  <EyeOff className="w-3 h-3" /> 詳細地址未公開，請私訊預約
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 教練卡片列表 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {coachProfiles.map(coach => (
                      <div key={coach.id} className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 md:p-8 flex flex-col justify-between items-center text-center">
                        <div className="mb-6 w-full">
                          <span className="text-amber-400 text-sm font-black block mb-3">{coach.sport} 指導</span>
                          <div className="flex items-center gap-3 justify-center mb-4">
                            <span className="text-4xl font-black text-white">HK$ {coach.rate} <span className="text-lg text-zinc-500 font-medium">/ hr</span></span>
                          </div>
                          <StatusBadge tag={coach.status} type="coach" />
                          <p className="text-zinc-400 text-sm font-medium mt-5">📍 {coach.region ? `${coach.region}, ${coach.country}` : "地點未提供"}</p>
                        </div>
                        
                        <button 
                          onClick={() => setIsContactModalOpen(true)}
                          className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-3.5 px-6 rounded-2xl transition shadow-[0_0_15px_rgba(217,119,6,0.3)] active:scale-95 mt-auto"
                        >
                          聯繫方式
                        </button>
                      </div>
                    ))}
                  </div>

                </div>
              )}

              {activeRole === "physio" && (
                <div className="space-y-8 animate-fadeIn">
                  
                  {/* 📍 防護員專屬：公開聯絡與服務地點卡片 */}
                  {(profile.physio_contact_email || profile.physio_contact_phone || profile.physio_city_region) && (
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 md:p-6 mb-8 mt-4">
                      <h3 className="text-sm md:text-base font-black text-white mb-5 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-500" />
                        聯絡與服務據點
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profile.physio_contact_email && (
                          <div className="flex items-start gap-3 p-3 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0"><Mail className="w-4 h-4 text-blue-400" /></div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase">Email</span>
                              <a href={`mailto:${profile.physio_contact_email}`} className="text-sm font-medium text-white hover:text-blue-400 transition-colors truncate">{profile.physio_contact_email}</a>
                            </div>
                          </div>
                        )}
                        {profile.physio_contact_phone && (
                          <div className="flex items-start gap-3 p-3 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0"><Phone className="w-4 h-4 text-emerald-400" /></div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase">Phone</span>
                              <a href={`tel:${profile.physio_contact_phone}`} className="text-sm font-medium text-white hover:text-emerald-400 transition-colors truncate">{profile.physio_contact_phone}</a>
                            </div>
                          </div>
                        )}
                        {profile.physio_city_region && (
                          <div className="flex items-start gap-3 p-3 bg-slate-950/50 rounded-2xl border border-slate-800/50 md:col-span-2">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0"><MapPin className="w-4 h-4 text-emerald-400" /></div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase">Location</span>
                              <span className="text-sm font-black text-white mt-0.5">{profile.physio_city_region}</span>
                              {profile.physio_is_address_public && profile.physio_address ? (
                                <span className="text-xs font-medium text-slate-400 mt-1">{profile.physio_address}</span>
                              ) : (
                                <span className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5"><EyeOff className="w-3 h-3" /> 詳細地址未公開，請私訊預約</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ⚕️ 專業履歷區塊 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* 左側：基本資訊與預約按鈕 */}
                    <div className="md:col-span-1 space-y-6">
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 md:p-8 text-center flex flex-col justify-center h-[calc(100%-88px)]">
                        <div>
                          <StatusBadge tag={profile.physio_status} type="physio" />
                          <div className="mt-6">
                            <span className="text-xs text-zinc-500 font-bold uppercase block mb-1">所屬診所 / 工作室</span>
                            <span className="text-lg font-black text-white block mb-6">{profile.clinic_name || "獨立接案防護員"}</span>
                            <span className="text-xs text-zinc-500 font-bold uppercase block mb-1">單次參考收費</span>
                            <span className="text-4xl font-black text-white">HK$ {profile.physio_rate}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 flex flex-col justify-center items-center text-center">
                        <button 
                          onClick={() => setIsContactModalOpen(true)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 px-6 rounded-2xl transition shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95"
                        >
                          聯繫方式
                        </button>
                      </div>
                    </div>

                    {/* 右側：專業經歷與服務項目 */}
                    <div className="md:col-span-2 space-y-6">
                      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:p-8">
                        <h3 className="text-lg font-black text-emerald-400 mb-6 flex items-center gap-2">
                          <span className="text-2xl">🎓</span> 專業資歷
                        </h3>
                        <div className="space-y-6">
                          <div>
                            <span className="text-xs text-zinc-500 font-bold uppercase block mb-1">從業經驗</span>
                            <span className="text-white font-medium bg-slate-800 px-3 py-1 rounded-lg">
                              {profile.physio_experience_years ? `${profile.physio_experience_years} 年以上` : "未提供"}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-zinc-500 font-bold uppercase block mb-2">專業證照與資格 (Certifications)</span>
                            <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed text-sm bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                              {profile.physio_qualifications || "尚未填寫專業資格。"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:p-8">
                        <h3 className="text-lg font-black text-emerald-400 mb-4 flex items-center gap-2">
                          <span className="text-2xl">💆‍♂️</span> 服務項目 (Services)
                        </h3>
                        <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed text-sm bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                          {profile.physio_services_offered || "尚未填寫提供的服務項目。"}
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 📩 聯絡資訊彈出視窗 (Modal) */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          {(() => {
            // 動態判斷要顯示哪一組聯絡資訊
            const modalEmail = activeRole === "physio" ? profile.physio_contact_email : profile.contact_email;
            const modalPhone = activeRole === "physio" ? profile.physio_contact_phone : profile.contact_phone;
            const modalIg = activeRole === "physio" ? profile.physio_instagram_url : profile.instagram_url;
            const modalFb = activeRole === "physio" ? profile.physio_facebook_url : profile.facebook_url;
            const modalThreads = activeRole === "physio" ? profile.physio_threads_url : profile.threads_url;
            
            return (
              <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative animate-slideUp">
                
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                  <h3 className="text-lg font-black text-white">聯絡 {profile.full_name}</h3>
                  <button onClick={() => setIsContactModalOpen(false)} className="text-slate-400 hover:text-white transition">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  <div className="space-y-3">
                    {modalEmail && (
                      <a href={`mailto:${modalEmail}`} className="flex items-center gap-4 p-3 bg-slate-950 rounded-xl hover:bg-slate-800 transition border border-slate-800">
                        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Mail className="w-5 h-5" /></div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Email</p>
                          <p className="text-sm font-medium text-white truncate">{modalEmail}</p>
                        </div>
                      </a>
                    )}
                    {modalPhone && (
                      <a href={`tel:${modalPhone}`} className="flex items-center gap-4 p-3 bg-slate-950 rounded-xl hover:bg-slate-800 transition border border-slate-800">
                        <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><Phone className="w-5 h-5" /></div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Phone</p>
                          <p className="text-sm font-medium text-white truncate">{modalPhone}</p>
                        </div>
                      </a>
                    )}
                    {!modalEmail && !modalPhone && (
                      <div className="text-center text-sm text-zinc-500 py-4 font-bold border border-dashed border-slate-800 rounded-xl">
                        該用戶尚未提供聯絡方式，請透過站內信聯絡。
                      </div>
                    )}
                  </div>

                  {(modalIg || modalFb || modalThreads) && (
                    <div className="pt-4 border-t border-slate-800">
                      <p className="text-xs font-bold text-slate-400 mb-3 text-center">追蹤社群</p>
                      <div className="flex justify-center gap-4">
                        {modalIg && (
                          <a href={modalIg} target="_blank" rel="noreferrer" className="w-12 h-12 bg-slate-800 hover:bg-pink-600 hover:text-white text-slate-300 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-110">
                            <InstagramIcon className="w-5 h-5" />
                          </a>
                        )}
                        {modalFb && (
                          <a href={modalFb} target="_blank" rel="noreferrer" className="w-12 h-12 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-110">
                            <FacebookIcon className="w-5 h-5" />
                          </a>
                        )}
                        {modalThreads && (
                          <a href={modalThreads} target="_blank" rel="noreferrer" className="w-12 h-12 bg-slate-800 hover:bg-slate-50 hover:text-black text-slate-300 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-110">
                            <ThreadsIcon className="w-5 h-5" />
                          </a>
                        )}
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