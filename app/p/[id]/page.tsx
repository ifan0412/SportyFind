"use client";

import { use, useEffect, useState, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";
import Link from "next/link";

interface Profile {
  id: string; full_name: string | null; handle: string | null; headline: string | null; bio: string | null; location: string | null; avatar_url: string | null; status_tag: string | null; display_sports: string[] | null;
  is_coach: boolean | null; 
  is_physio: boolean | null; physio_rate: number | null; clinic_name: string | null; physio_status: string | null; physio_region: string | null;
}

interface CoachProfile { id: string; sport: string; rate: number; status: string; country: string; region: string; }
interface UserSport { id: string; sports: { name: string } | null; metadata: Record<string, any>; }
interface MediaItem { id: string; sportName: string; url: string; }

type TopRole = "athlete" | "coach" | "physio";
type AthleteTab = "expertise" | "highlights" | "feed";

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

  const [profile, setProfile] = useState<Profile | null>(null);
  const [coachProfiles, setCoachProfiles] = useState<CoachProfile[]>([]);
  const [userSports, setUserSports] = useState<UserSport[]>([]);
  const [galleryMedia, setGalleryMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  const [activeRole, setActiveRole] = useState<TopRole>("athlete");
  const [activeAthleteTab, setActiveAthleteTab] = useState<AthleteTab>("expertise");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: prof, error: profErr }, { data: usData }, { data: coachesData }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", id).single(),
          supabase.from("user_sports").select("id, metadata, sports(name)").eq("user_id", id),
          supabase.from("coach_profiles").select("*").eq("user_id", id).neq("status", "hidden") // 只抓公開的教練名片
        ]);
        if (profErr || !prof) { setIsNotFound(true); return; }
        setProfile(prof);
        if (usData) setUserSports(usData as unknown as UserSport[]);
        if (coachesData) setCoachProfiles(coachesData);
        
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
  }, [id, supabase]);

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
                <div className="w-full h-full rounded-full bg-slate-800 border-2 border-slate-700/50 shadow-xl overflow-hidden bg-cover bg-center" style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : "none" }}>{!avatarSrc && <div className="w-full h-full flex items-center justify-center text-4xl font-black text-zinc-600">PRO</div>}</div>
                <div className="absolute -bottom-3 flex justify-center w-full z-10">
                  {activeRole === "athlete" && <StatusBadge tag={profile.status_tag} type="athlete" />}
                  {activeRole === "physio" && <StatusBadge tag={profile.physio_status} type="physio" />}
                </div>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight mb-1">{profile.full_name}</h1>
              <p className="text-blue-400 font-mono text-sm mb-4">@{profile.handle || id.slice(0,8)}</p>
              <p className="text-sm font-bold text-zinc-400 mb-4">{profile.headline || "專注於每一次場上表現。"}</p>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                <span className="bg-slate-800/80 text-zinc-300 text-[10px] font-black px-3 py-1 rounded-full border border-slate-700">👤 運動員</span>
                {hasPublicCoach && <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-3 py-1 rounded-full border border-amber-500/20">🎓 教練</span>}
                {hasPublicPhysio && <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-500/20">⚕️ 運動/物理治療</span>}
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed text-left bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50 mb-6">{profile.bio || "這位運動員很低調，還沒有留下詳細的自介。"}</p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500 font-medium"><span>📍 {profile.location || "地點未公開"}</span></div>
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
                      {userSports.length === 0 ? <div className="md:col-span-2 text-center py-10 border border-dashed border-slate-800 rounded-2xl text-zinc-500 text-sm font-bold">尚未宣告專業項目。</div> : (
                        userSports.map((us) => (
                          <div key={us.id} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                            <span className="text-xl font-black text-white mb-4 block relative z-10">{us.sports?.name}</span>
                            <div className="space-y-2 relative z-10">
                              {Object.entries(us.metadata || {}).map(([key, val]) => (
                                <div key={key} className="flex justify-between text-sm pb-1 border-b border-slate-800/50 last:border-0"><span className="text-zinc-500 font-bold capitalize">{key}</span><span className="text-blue-400 font-black">{val as string}</span></div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeAthleteTab === "highlights" && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-4">
                      {galleryMedia.length === 0 ? <div className="col-span-3 text-center py-10 border border-dashed border-slate-800 rounded-2xl text-zinc-500 text-sm font-bold">相簿空空如也。</div> : (
                        galleryMedia.map(m => (<div key={m.id} className="aspect-square bg-slate-900 rounded-xl overflow-hidden cursor-pointer group relative"><img src={m.url} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt="Highlight" /></div>))
                      )}
                    </div>
                  )}

                  {activeAthleteTab === "feed" && (
                    <div className="space-y-6 pt-4 animate-fadeIn max-w-3xl">
                      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
                        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-slate-800 bg-cover bg-center" style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : "none" }} /><div><h4 className="text-sm font-black text-white">{profile.full_name}</h4><span className="text-[10px] text-zinc-500 uppercase">剛剛發布</span></div></div>
                        <p className="text-sm text-zinc-300 font-medium leading-relaxed">持續訓練，準備迎接下一個賽季！目前的技術儲備已經到位，期待能在友誼賽中驗證成果。🔥</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 教練專區（渲染多張名片） */}
              {activeRole === "coach" && (
                <div className="space-y-8 animate-fadeIn">
                  {coachProfiles.map(coach => (
                    <div key={coach.id} className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-8 flex flex-col md:flex-row gap-8 justify-between items-center">
                      <div className="flex-1 text-center md:text-left">
                        <span className="text-amber-400 text-sm font-black block mb-2">{coach.sport} 指導</span>
                        <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
                          <span className="text-4xl font-black text-white">HK$ {coach.rate} <span className="text-lg text-zinc-500 font-medium">/ hr</span></span>
                          <StatusBadge tag={coach.status} type="coach" />
                        </div>
                        <p className="text-zinc-400 text-sm font-medium">📍 {coach.region ? `${coach.region}, ${coach.country}` : "地點未提供"}</p>
                      </div>
                      <button className="bg-amber-600 hover:bg-amber-500 text-white font-black py-3 px-8 rounded-full transition shadow-[0_0_15px_rgba(217,119,6,0.3)] w-full md:w-auto">聯繫教練</button>
                    </div>
                  ))}
                </div>
              )}

              {activeRole === "physio" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-8">
                    <h2 className="text-xl font-black text-emerald-400 mb-6">服務資訊</h2>
                    <span className="text-xs text-zinc-500 font-bold uppercase block mb-1">所屬診所 / 工作室</span>
                    <span className="text-lg font-black text-white block mb-6">{profile.clinic_name || "獨立接案防護員"}</span>
                    <span className="text-xs text-zinc-500 font-bold uppercase block mb-1">單次服務參考收費</span>
                    <span className="text-4xl font-black text-white">HK$ {profile.physio_rate} <span className="text-lg text-zinc-500 font-medium">/ 次</span></span>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center text-2xl mb-4">📅</div>
                    <h3 className="text-white font-bold mb-2">需要運動/物理治療？</h3>
                    <p className="text-zinc-400 text-sm mb-6 max-w-xs">加速身體修復，讓你更快回到場上。</p>
                    <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-8 rounded-full transition shadow-[0_0_15px_rgba(16,185,129,0.3)]">預約看診</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}