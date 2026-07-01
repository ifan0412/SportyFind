"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// ==========================================
// Types
// ==========================================
interface Profile {
  id: string;
  full_name: string | null;
  headline: string | null;
  location: string | null;
  avatar_url: string | null;
  is_coach: boolean | null;
  coach_rate: number | null;
  status_tag: string | null;
}

// ==========================================
// Sub-components
// ==========================================
function StatusBadge({ tag }: { tag: string | null }) {
  if (tag === "recruiting")
    return (
      <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 招生中
      </div>
    );
  if (tag === "seeking_team")
    return (
      <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> 尋找隊伍
      </div>
    );
  if (tag === "open_to_match")
    return (
      <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> 開放約戰
      </div>
    );
  return null; 
}

// ==========================================
// Main Component
// ==========================================
export default function NetworkPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  
  // Data State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRoles, setFilterRoles] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);

  // Pagination & UI State
  const [visibleCount, setVisibleCount] = useState(12); // 初次只載入 12 筆
  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    const fetchNetwork = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, headline, location, avatar_url, is_coach, coach_rate, status_tag")
          .order("full_name", { ascending: true });

        if (error) throw error;
        if (data) setProfiles(data);
      } catch (err) {
        console.error("Error fetching network:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNetwork();
  }, [supabase]);

  // Derived State: Apply Filters
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch = 
      (p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) || 
      (p.headline?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const pRole = p.is_coach ? "coach" : "athlete";
    const matchesRole = filterRoles.length === 0 || filterRoles.includes(pRole);
    const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(p.status_tag || "");

    return matchesSearch && matchesRole && matchesStatus;
  });

  // 只取前 visibleCount 筆資料來渲染 (效能優化)
  const visibleProfiles = filteredProfiles.slice(0, visibleCount);

  // Scroll Listener for "Back to Top" and "Infinite Scroll"
  useEffect(() => {
    const handleScroll = () => {
      // 顯示/隱藏 回到頂部按鈕
      if (window.scrollY > 400) {
        setShowTopBtn(true);
      } else {
        setShowTopBtn(false);
      }

      // 無限滾動：當滑動到接近底部時，增加顯示數量
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        setVisibleCount(prev => Math.min(prev + 12, filteredProfiles.length));
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [filteredProfiles.length]);

  // 當篩選條件改變時，重置顯示數量
  useEffect(() => {
    setVisibleCount(12);
  }, [searchTerm, filterRoles, filterStatuses]);

  const toggleRole = (roleId: string) => {
    setFilterRoles(prev => prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]);
  };

  const toggleStatus = (statusId: string) => {
    setFilterStatuses(prev => prev.includes(statusId) ? prev.filter(s => s !== statusId) : [...prev, statusId]);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-blue-500/30 pb-24 relative">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        
        {/* Header */}
        <div className="mb-6 md:mb-8 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">人脈網路 🌐</h1>
          <p className="text-zinc-400 text-sm md:text-base font-medium">發掘運動員、尋找教練、組建你的最強戰隊。</p>
        </div>

        {/* ── Filter Bar (改為 relative，不再擋住畫面) ── */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-3xl mb-8 relative z-30 shadow-lg space-y-4">
          
          <div className="relative">
            <span className="absolute left-3 top-3 text-zinc-500">🔍</span>
            <input 
              type="text" 
              placeholder="搜尋姓名或關鍵字..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest whitespace-nowrap mr-1">身分</span>
            <button
              onClick={() => setFilterRoles([])}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition ${
                filterRoles.length === 0 ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500 hover:text-white"
              }`}
            >
              全部
            </button>
            {[
              { id: "athlete", label: "🏅 運動員" },
              { id: "coach", label: "🏆 認證教練" }
            ].map(role => (
              <button
                key={role.id}
                onClick={() => toggleRole(role.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition ${
                  filterRoles.includes(role.id) ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500 hover:text-white"
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest whitespace-nowrap mr-1">狀態</span>
            <button
              onClick={() => setFilterStatuses([])}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition ${
                filterStatuses.length === 0 ? "bg-slate-100 border-slate-200 text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500 hover:text-white"
              }`}
            >
              全部
            </button>
            {[
              { id: "recruiting", label: "🟢 招生中" },
              { id: "seeking_team", label: "🔵 尋找隊伍" },
              { id: "open_to_match", label: "🟡 開放約戰" }
            ].map(status => (
              <button
                key={status.id}
                onClick={() => toggleStatus(status.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition ${
                  filterStatuses.includes(status.id) ? "bg-slate-100 border-slate-200 text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500 hover:text-white"
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main Area: Player Grid ── */}
        <div>
          <div className="mb-4 px-1 flex justify-between items-center">
            <span className="text-sm font-bold text-zinc-500">
              顯示 <span className="text-white">{filteredProfiles.length}</span> 筆結果
            </span>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-zinc-500 font-mono text-sm">載入資料庫中...</div>
          ) : filteredProfiles.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-700/50 rounded-3xl py-20 text-center px-4">
              <p className="text-zinc-400 font-bold text-sm">沒有符合條件的檔案。</p>
              <button onClick={() => {setSearchTerm(""); setFilterRoles([]); setFilterStatuses([]);}} className="mt-4 text-sm text-blue-400 hover:text-blue-300 font-bold px-4 py-2 bg-blue-500/10 rounded-lg">清除所有篩選</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8">
                {visibleProfiles.map((p) => (
                  <div key={p.id} className="bg-slate-900/50 border border-slate-800 hover:border-slate-600 rounded-2xl p-6 flex flex-col items-center text-center transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-xl relative overflow-hidden">
                    
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition duration-300" />
                    
                    <div className="relative w-20 h-20 md:w-24 md:h-24 mb-5 mt-2">
                      <div 
                        className="w-full h-full rounded-full bg-slate-800 border-2 border-slate-700/50 overflow-hidden flex items-center justify-center text-3xl font-black text-zinc-600 bg-cover bg-center"
                        style={{ backgroundImage: p.avatar_url ? `url(${p.avatar_url})` : "none" }}
                      >
                        {!p.avatar_url && (p.full_name?.[0] || "U")}
                      </div>
                      <div className="absolute -bottom-3 flex justify-center w-full">
                        <StatusBadge tag={p.status_tag} />
                      </div>
                    </div>

                    <h3 className="text-lg font-black text-white tracking-tight mb-1 truncate w-full">{p.full_name || "Unknown"}</h3>
                    <p className="text-xs md:text-sm text-zinc-400 font-medium mb-5 line-clamp-2 h-8 md:h-10 leading-snug">
                      {p.headline || "尚無簡介"}
                    </p>
                    
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-6 w-full">
                      <div className="bg-slate-950/50 border border-slate-800/80 text-zinc-400 text-xs font-bold px-3 py-1.5 rounded-lg truncate max-w-[140px]">
                        📍 {p.location?.split(',')[0] || "位置未公開"}
                      </div>
                      {p.is_coach ? (
                        <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-black px-3 py-1.5 rounded-lg truncate">
                          🏆 教練 (HK${p.coach_rate})
                        </div>
                      ) : (
                        <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-black px-3 py-1.5 rounded-lg truncate">
                          🏅 認證運動員
                        </div>
                      )}
                    </div>

                    <div className="mt-auto w-full pt-4 border-t border-slate-800/80">
                      <Link href={`/p/${p.id}`} className="block w-full bg-slate-800 hover:bg-blue-600 text-white text-sm font-black py-3 rounded-xl transition duration-300">
                        查看名片
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* 手動載入更多按鈕 (以防無限滾動在某些極端螢幕上沒有觸發) */}
              {visibleCount < filteredProfiles.length && (
                <div className="text-center mt-12">
                  <button 
                    onClick={() => setVisibleCount(prev => Math.min(prev + 12, filteredProfiles.length))}
                    className="bg-slate-900 border border-slate-700 hover:border-slate-500 text-zinc-300 font-bold py-3 px-8 rounded-full transition"
                  >
                    載入更多 ↓
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Back to Top Button ── */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-500 text-white w-12 h-12 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center text-xl z-50 transition-all duration-300 transform ${
          showTopBtn ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"
        }`}
      >
        ↑
      </button>

    </div>
  );
}