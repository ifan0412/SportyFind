"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// ==========================================
// 1. Interfaces
// ==========================================
interface Profile {
  id: string;
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  is_coach: boolean | null;
  coach_rate: number | null;
  status_tag: string | null;
}

interface UserSport {
  id: string;
  metadata: Record<string, any>;
  sports: { name: string } | null;
}

interface MediaItem {
  id: string;
  sportName: string;
  url: string;
  createdAt: string;
}

// ==========================================
// 2. Static data (outside component)
// ==========================================
const TABS = [
  { id: "about", icon: "👤", label: "個人檔案" },
  { id: "arsenal", icon: "📋", label: "專長規格" },
  { id: "highlights", icon: "🎞️", label: "賽事影音" },
  { id: "feed", icon: "📰", label: "產業動態" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const FALLBACK_PROFILE: Profile = {
  id: "fallback",
  full_name: "測試運動員",
  headline: "現役甲組選手",
  bio: "此為測試帳號，請在後台填寫完整資料以供球探查閱。",
  location: "未設定",
  avatar_url: null,
  is_coach: false,
  coach_rate: 0,
  status_tag: "inactive",
};

// ==========================================
// 3. Sub-components
// ==========================================
function StatusBadge({ tag }: { tag: string | null }) {
  if (tag === "recruiting")
    return (
      <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.2)]">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 招生中
      </div>
    );
  if (tag === "seeking_team")
    return (
      <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest shadow-[0_0_10px_rgba(59,130,246,0.2)]">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> 尋找隊伍
      </div>
    );
  if (tag === "open_to_match")
    return (
      <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest shadow-[0_0_10px_rgba(245,158,11,0.2)]">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> 開放約戰
      </div>
    );
  return (
    <div className="inline-flex items-center gap-1.5 bg-slate-800/50 border border-slate-700/50 text-zinc-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-500" /> 穩定狀態
    </div>
  );
};

// ==========================================
// 4. Main page component
// ==========================================
export default function PublicPlayerPage() {
  // Fix for Next.js 15: useParams safely unwraps the Promise in Client Components
  const params = useParams();
  const targetUserId = params?.id as string;
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userSports, setUserSports] = useState<UserSport[]>([]);
  const [gallery, setGallery] = useState<MediaItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("about");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<MediaItem | null>(null);

  const fetchData = useCallback(async () => {
    if (!targetUserId) return;

    try {
      // 1. Fetch live Profile and dynamic Sports metadata
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetUserId)
        .single();

      if (prof) {
        setProfile(prof);
        const { data: usData } = await supabase
          .from("user_sports")
          .select("id, metadata, sports ( name )")
          .eq("user_id", targetUserId);
        
        if (usData) setUserSports(usData as unknown as UserSport[]);

        // 2. Fetch live Highlights from Supabase Storage bucket
        const { data: files } = await supabase.storage.from("highlights").list(`${targetUserId}/`, {
          limit: 20,
          sortBy: { column: "created_at", order: "desc" }
        });

        if (files && files.length > 0) {
          const fetchedGallery = files
            .filter(f => f.name !== ".emptyFolderPlaceholder")
            .map(file => {
              const { data: urlData } = supabase.storage.from("highlights").getPublicUrl(`${targetUserId}/${file.name}`);
              return {
                id: file.id || file.name,
                sportName: "Highlight",
                url: urlData.publicUrl,
                createdAt: file.created_at ? new Date(file.created_at).toLocaleDateString() : "最近上傳"
              };
            });
          setGallery(fetchedGallery);
        }
      } else {
        setProfile(FALLBACK_PROFILE);
      }
    } catch (err) {
      console.error("Error fetching public profile:", err);
      setProfile(FALLBACK_PROFILE);
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-pro-slate-950 flex items-center justify-center text-zinc-500">
        載入選手名片中...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-pro-slate-950 flex items-center justify-center text-pro-slate-500">
        找不到此選手檔案
      </div>
    );
  }

  return (
    <div className="bg-pro-slate-950 min-h-screen text-zinc-200 font-sans pb-20 selection:bg-blue-500/30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left sidebar */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <div className="bg-pro-slate-900/40 backdrop-blur-xl border border-pro-slate-800/60 rounded-3xl p-6 lg:sticky lg:top-20 shadow-2xl relative">
              <div className="absolute top-4 right-4 text-[10px] font-black text-blue-500 tracking-widest uppercase border border-pro-blue-500/30 px-2 py-0.5 rounded-full bg-pro-blue-500/10">
                公開檔案
              </div>

              <div className="relative w-32 h-32 mx-auto mb-6 mt-4">
                <div
                  className="w-full h-full rounded-full bg-pro-slate-800 border-2 border-pro-slate-700/50 shadow-xl overflow-hidden flex items-center justify-center text-4xl font-black text-zinc-600 bg-cover bg-center"
                  style={{ backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : "none" }}
                >
                  {!profile.avatar_url && (profile.full_name?.[0] ?? "PRO")}
                </div>
                <div className="absolute -bottom-3 -right-6 z-20 flex justify-center w-full">
                  <StatusBadge tag={profile.status_tag} />
                </div>
              </div>

              <div className="text-center mt-2 space-y-3">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {profile.full_name}
                </h1>
                <p className="text-sm font-bold text-zinc-400">{profile.headline}</p>

                {profile.is_coach && (
                  <div className="inline-block bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 text-xs font-black px-4 py-1.5 rounded-full">
                    🏆 認證教練 ｜ HK$ {profile.coach_rate}/hr
                  </div>
                )}

                <p className="text-xs text-zinc-300 leading-relaxed text-left bg-pro-slate-900/30 p-4 rounded-2xl border border-pro-slate-800/50 mt-4">
                  {profile.bio || "這位運動員還沒有寫下任何簡介。"}
                </p>

                <div className="flex flex-col gap-3 pt-2">
                  <button className="w-full bg-pro-slate-50 text-black font-black py-3 rounded-xl transition hover:bg-pro-slate-200 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                    ＋ 關注選手
                  </button>
                  <button className="w-full bg-pro-slate-800 text-white font-bold py-3 rounded-xl transition hover:bg-pro-slate-700">
                    💬 傳送訊息
                  </button>
                </div>
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500 font-medium">
                  <span>📍 {profile.location ?? "未設定"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right content area */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col">

            {/* Tab bar */}
            <div className="bg-pro-slate-900/60 backdrop-blur-xl border border-pro-slate-800/80 p-1.5 rounded-2xl flex overflow-x-auto sticky top-16 z-30 mb-8 shadow-sm">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition ${
                    activeTab === t.id
                      ? "bg-pro-slate-50 text-black shadow-md"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 bg-pro-slate-900/20 border border-pro-slate-800/60 p-6 rounded-3xl min-h-[500px]">

              {activeTab === "about" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-pro-slate-900/40 border border-pro-slate-800/60 p-6 rounded-2xl">
                    <h3 className="text-sm font-black uppercase text-zinc-400 tracking-wider mb-3">
                      選手公開履歷簡介
                    </h3>
                    <p className="text-sm text-zinc-300 leading-relaxed">{profile.bio}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-pro-slate-900/30 p-4 rounded-xl border border-pro-slate-800">
                      <span className="text-[10px] text-zinc-500 font-bold block">主要訓練地</span>
                      <span className="text-sm font-bold text-white mt-1 block">
                        📍 {profile.location ?? "未設定"}
                      </span>
                    </div>
                    <div className="bg-pro-slate-900/30 p-4 rounded-xl border border-pro-slate-800">
                      <span className="text-[10px] text-zinc-500 font-bold block">系統認證</span>
                      <span className="text-sm font-bold text-emerald-400 mt-1 block">
                        🛡️ Verified Athlete
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "arsenal" && (
                <div className="space-y-4 animate-fadeIn">
                  <h3 className="text-sm font-black uppercase text-zinc-400 tracking-wider">
                    登錄認證技術規格
                  </h3>
                  {userSports.length === 0 ? (
                    <p className="text-zinc-500 text-xs text-center py-6">
                      該選手目前尚未在平台綁定具體體育專長指標。
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {userSports.map((us) => (
                        <div key={us.id} className="bg-pro-slate-900/50 border border-pro-slate-800 rounded-3xl p-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-pro-blue-500/5 rounded-bl-full -mr-4 -mt-4" />
                          <div className="flex items-center justify-between mb-4 relative z-10">
                            <span className="text-xl font-black text-white tracking-tight">{us.sports?.name}</span>
                          </div>
                          <div className="space-y-2 relative z-10">
                            {/* Dynamically render all schema keys */}
                            {Object.entries(us.metadata || {}).map(([key, val]) => (
                              <div key={key} className="flex justify-between items-center text-sm pb-1 border-b border-pro-slate-800/50 last:border-0">
                                <span className="text-zinc-500 font-bold capitalize">{key}</span>
                                <span className="text-pro-blue-400 font-black">{val as string}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "highlights" && (
                <div className="space-y-6 animate-fadeIn">
                  <h3 className="text-sm font-black uppercase text-zinc-400 tracking-wider mb-4">
                    核實賽事相片影音庫
                  </h3>
                  {gallery.length === 0 ? (
                    <p className="text-zinc-500 text-sm font-bold text-center py-10">尚無影像紀錄。</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1 md:gap-2">
                      {gallery.map(m => (
                        <div key={m.id} onClick={() => setSelectedPost(m)} className="relative group aspect-square overflow-hidden bg-pro-slate-900 cursor-pointer rounded-xl border border-pro-slate-800 shadow-md">
                          <img src={m.url} alt="highlight" loading="lazy" decoding="async" className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "feed" && (
                <div className="space-y-4 animate-fadeIn max-w-2xl mx-auto">
                  <div className="bg-pro-slate-900/40 border border-pro-slate-800/80 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full bg-pro-slate-800 bg-cover bg-center border border-pro-slate-700"
                        style={{ backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : "none" }}
                      />
                      <div>
                        <h4 className="text-sm font-bold text-white">{profile.full_name}</h4>
                        <span className="text-[10px] text-zinc-500">1天前 • 官方發佈</span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      很高興加入 Pro Sports 體育菁英網絡！我的個人檔案與專長技術規格已經公開核實，歡迎各大戰隊、教練或俱樂部隨時與我傳訊商談合作與約戰事宜！
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Instagram-Style Post Lightbox Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-0 md:p-8 animate-fadeIn">
          <button onClick={() => setSelectedPost(null)} className="absolute top-4 right-4 md:top-6 md:right-6 text-white text-3xl font-black z-50 hover:scale-110 transition">
            ×
          </button>
          <div className="w-full max-w-6xl max-h-[100dvh] md:max-h-[85vh] bg-pro-slate-950 md:rounded-3xl overflow-hidden flex flex-col md:flex-row border border-pro-slate-800 shadow-2xl relative">
            
            {/* Image Area */}
            <div className="w-full md:w-3/5 bg-black flex items-center justify-center relative min-h-[40vh] md:min-h-0">
              <img src={selectedPost.url} alt="Post highlight" className="max-w-full max-h-[85vh] object-contain" />
            </div>

            {/* Interaction Area */}
            <div className="w-full md:w-2/5 flex flex-col h-[60vh] md:h-full bg-pro-slate-950">
              <div className="p-4 border-b border-pro-slate-800 flex justify-between items-center bg-pro-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-pro-slate-700 bg-cover bg-center border border-pro-slate-600" style={{ backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : "none" }} />
                  <div>
                    <p className="text-sm font-black text-white">{profile.full_name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{selectedPost.createdAt}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                  {/* Empty Comment Space */}
              </div>
              
              <div className="p-4 border-t border-pro-slate-800 bg-pro-slate-950">
                <div className="flex gap-4 mb-3">
                  <button className="text-2xl hover:scale-110 transition grayscale hover:grayscale-0">❤️</button>
                  <button className="text-2xl hover:scale-110 transition grayscale hover:grayscale-0">💬</button>
                </div>
                <p className="text-sm font-bold text-white mb-3">0 likes</p>
                <div className="flex gap-2 relative">
                  <input type="text" placeholder="需登入以發表留言..." disabled className="w-full bg-pro-slate-900 border border-pro-slate-800 rounded-full py-3 pl-4 pr-16 text-sm text-zinc-500 cursor-not-allowed outline-none transition" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}