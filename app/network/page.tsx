"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";
import { SportFilterModal } from "@/components/SportFilterModal";

// ==========================================
// Types
// ==========================================
interface ProfileRow {
  id: string;
  full_name: string | null;
  location: string | null;
  headline: string | null;
  avatar_url: string | null;
  status_tag: string | null;
  display_sports: string[] | null;
  is_coach: boolean | null;
  coach_status: string | null;
  is_physio: boolean | null;
  physio_status: string | null;
  all_sport_names?: string[]; 
}

interface Sport {
  id: string;
  name: string;
}

// ==========================================
// Sub-components
// ==========================================
function PlayerStatusBadge({ tag }: { tag: string | null }) {
  if (tag === "recruiting") return <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 尋找新血</div>;
  if (tag === "seeking_team") return <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> 尋找隊伍</div>;
  if (tag === "open_to_match") return <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> 開放約戰</div>;
  return <div className="inline-flex items-center gap-1.5 bg-slate-800/50 border border-slate-700/50 text-zinc-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap"><div className="w-1.5 h-1.5 rounded-full bg-slate-500" /> 穩定狀態</div>;
}

// ==========================================
// Main Component
// ==========================================
export default function NetworkPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [allSports, setAllSports] = useState<Sport[]>([]); 
  const [isLoading, setIsLoading] = useState(true);

  // 篩選器 State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // 💡 步驟 1：先獲取目前正在瀏覽網頁的登入用戶 ID
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || null;

      // 💡 步驟 2：準備查詢全體球員檔案的 Query
      let profilesQuery = supabase
        .from("profiles")
        .select(`
          id, full_name, location, headline, avatar_url, status_tag, display_sports, is_coach, coach_status, is_physio, physio_status,
          user_sports (
            sports ( name )
          )
        `)
        .order("full_name", { ascending: true });

      // 🔥 核心修正：如果使用者有登入，在列表查詢中自動排除自己的 ID！
      if (currentUserId) {
        profilesQuery = profilesQuery.neq("id", currentUserId);
      }

      const [profilesRes, sportsRes] = await Promise.all([
        profilesQuery,
        supabase
          .from("sports")
          .select("id, name")
          .order("name", { ascending: true })
      ]);

      if (!profilesRes.error && profilesRes.data) {
        const formattedProfiles = profilesRes.data.map((p: any) => ({
          ...p,
          all_sport_names: p.user_sports?.map((us: any) => us.sports?.name).filter(Boolean) || []
        }));
        setProfiles(formattedProfiles as ProfileRow[]);
      }
      
      if (!sportsRes.error && sportsRes.data) {
        setAllSports(sportsRes.data as Sport[]);
      }
      
      setIsLoading(false);
    };
    fetchData();
  }, [supabase]);

  const sportNames = allSports.map(s => s.name);

  const filteredProfiles = profiles.filter(p => {
    const matchSearch = (p.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (p.location || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchSport = selectedSports.length === 0 
      ? true 
      : selectedSports.some(sport => p.all_sport_names?.includes(sport));
      
    const matchStatus = filterStatus ? p.status_tag === filterStatus : true;
    
    return matchSearch && matchSport && matchStatus;
  });

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-blue-500/30 pb-24 relative">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        
        <BackButton label="返回首頁" />

        <div className="mb-6 md:mb-8 text-center md:text-left mt-2">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">人脈網路 🌐</h1>
          <p className="text-zinc-400 text-sm md:text-base font-medium">探索全港運動員檔案，發掘你的下一個隊友或強敵。</p>
        </div>

        {/* ── 篩選器 ── */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 md:p-5 rounded-3xl mb-8 shadow-lg flex flex-col md:flex-row gap-4 items-center">
          
          <div className="relative w-full md:flex-1">
            <span className="absolute left-3 top-3 text-zinc-500">🔍</span>
            <input 
              type="text" 
              placeholder="搜尋運動員名稱或所在地區..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition" 
            />
          </div>

          <button 
            onClick={() => setIsSportModalOpen(true)}
            className={`w-full md:w-auto flex items-center justify-between gap-3 px-5 py-3 rounded-xl border text-sm font-bold transition flex-shrink-0 ${
              selectedSports.length > 0 
                ? "bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.2)]" 
                : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"
            }`}
          >
            <span>項目 {selectedSports.length > 0 ? `(${selectedSports.length})` : "(全部)"}</span>
            <span className="text-[10px]">▼</span>
          </button>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden w-full md:w-auto">
            <button onClick={() => setFilterStatus("")} className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold border transition ${!filterStatus ? "bg-slate-100 border-slate-200 text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>全部狀態</button>
            <button onClick={() => setFilterStatus("seeking_team")} className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold border transition ${filterStatus === "seeking_team" ? "bg-slate-100 border-slate-200 text-black" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>🔵 尋找隊伍</button>
            <button onClick={() => setFilterStatus("open_to_match")} className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold border transition ${filterStatus === "open_to_match" ? "bg-slate-100 border-slate-200 text-black" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>🟡 開放約戰</button>
            <button onClick={() => setFilterStatus("recruiting")} className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold border transition ${filterStatus === "recruiting" ? "bg-slate-100 border-slate-200 text-black" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>🟢 尋找新血</button>
          </div>
        </div>

        {/* ── 列表展示 ── */}
        <div>
          <div className="mb-4 px-1 flex justify-between items-center">
            <span className="text-sm font-bold text-zinc-500">顯示 <span className="text-white">{filteredProfiles.length}</span> 位運動員</span>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-zinc-500 font-mono text-sm">搜尋體育人才中...</div>
          ) : filteredProfiles.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-700/50 rounded-3xl py-20 text-center px-4">
              <p className="text-zinc-400 font-bold text-sm">沒有符合條件的運動員檔案。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 animate-fadeIn">
              {filteredProfiles.map((p) => (
                <div key={p.id} className="bg-slate-900/50 border border-slate-800 hover:border-slate-600 rounded-2xl p-6 flex flex-col items-center text-center transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-xl relative overflow-hidden">
                  
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition duration-300" />
                  
                  <div className="relative w-20 h-20 md:w-24 md:h-24 mb-5 mt-2">
                    <div className="w-full h-full rounded-2xl bg-slate-800 border-2 border-slate-700/50 overflow-hidden flex items-center justify-center text-3xl font-black text-zinc-600 bg-cover bg-center shadow-inner" style={{ backgroundImage: p.avatar_url ? `url(${p.avatar_url})` : "none" }}>
                      {!p.avatar_url && (p.full_name?.[0] || "PRO")}
                    </div>
                    <div className="absolute -bottom-3 flex justify-center w-full">
                      <PlayerStatusBadge tag={p.status_tag} />
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-white tracking-tight mb-1 w-full truncate">{p.full_name || "運動員"}</h3>
                  
                  <p className="text-xs md:text-sm text-zinc-400 font-medium mb-3 line-clamp-2 h-8 md:h-10 leading-snug">
                    {p.headline || "專注於每一次場上表現。"}
                  </p>

                  <div className="flex justify-center w-full mb-5">
                    <div className="bg-slate-950/50 border border-slate-800/80 text-zinc-400 text-[10px] font-bold px-3 py-1.5 rounded-full inline-block">
                      📍 {p.location || "地點未設"}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-6 w-full min-h-[28px]">
                    {p.display_sports && p.display_sports.map(sport => (
                      <span key={sport} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black px-2.5 py-1 rounded-full">
                        {sport}
                      </span>
                    ))}

                    {p.is_coach && p.coach_status !== "hidden" && (
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black px-2.5 py-1 rounded-full">
                        🎓 教練
                      </span>
                    )}

                    {p.is_physio && p.physio_status !== "hidden" && (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black px-2.5 py-1 rounded-full">
                        ⚕️ 物理治療
                      </span>
                    )}
                  </div>

                  <div className="mt-auto w-full pt-4 border-t border-slate-800/80">
                    <Link href={`/p/${p.id}`} className="block w-full bg-slate-800 hover:bg-blue-600 text-white text-sm font-black py-3 rounded-xl transition duration-300">
                      查看完整檔案
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SportFilterModal 
        isOpen={isSportModalOpen}
        onClose={() => setIsSportModalOpen(false)}
        allSports={sportNames}
        selectedSports={selectedSports}
        onApply={setSelectedSports}
      />
    </div>
  );
}