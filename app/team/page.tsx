"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";

// 在 return 的最上方加入：
<BackButton label="返回列表" />

// ==========================================
// Types
// ==========================================
interface TeamProfile {
  id: string;
  name: string;
  sport: string;
  location: string;
  status_tag: string;
  headline: string;
  avatar_url: string | null;
}

// 💡 專屬球隊假資料 (Mock Data)
const MOCK_TEAMS: TeamProfile[] = [
  { id: "t1", name: "Kowloon Dunkers", sport: "Basketball", location: "九龍", status_tag: "recruiting", headline: "業餘聯賽常客，目前急缺中鋒與控衛。", avatar_url: null },
  { id: "t2", name: "Victoria Spikers", sport: "Volleyball", location: "港島", status_tag: "scrimmage", headline: "每週二四穩定練球，歡迎各大甲組球隊約戰。", avatar_url: null },
  { id: "t3", name: "Shatin Aces", sport: "Tennis", location: "新界", status_tag: "full", headline: "NTRP 4.0+ 俱樂部，目前滿員穩定訓練中。", avatar_url: null },
  { id: "t4", name: "Mongkok Hoops", sport: "Basketball", location: "九龍", status_tag: "scrimmage", headline: "主打快攻跑轟戰術，尋求週末友誼賽。", avatar_url: null },
  { id: "t5", name: "Tsuen Wan Blockers", sport: "Volleyball", location: "新界", status_tag: "recruiting", headline: "新成立球隊，熱血招募各位置新手與老手。", avatar_url: null },
];

// ==========================================
// Sub-components
// ==========================================
function TeamStatusBadge({ tag }: { tag: string | null }) {
  if (tag === "recruiting")
    return (
      <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 招募新血
      </div>
    );
  if (tag === "scrimmage")
    return (
      <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> 尋找約戰
      </div>
    );
  return null;
}

// ==========================================
// Inner Content Component
// ==========================================
function TeamPageContent() {
  const searchParams = useSearchParams();
  const initialSport = searchParams.get("sport");

  // 💡 解決 Hydration Error 的核心：確保 Client 和 Server 初次渲染一致
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [teams, setTeams] = useState<TeamProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterSports, setFilterSports] = useState<string[]>(initialSport ? [initialSport] : []);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);

  const [visibleCount, setVisibleCount] = useState(12);
  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setTeams(MOCK_TEAMS);
      setIsLoading(false);
    }, 500); 
  }, []);

  const filteredTeams = teams.filter((t) => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.headline.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSport = filterSports.length === 0 || filterSports.includes(t.sport);
    const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(t.status_tag);

    return matchesSearch && matchesSport && matchesStatus;
  });

  const visibleTeams = filteredTeams.slice(0, visibleCount);

  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.scrollY > 400);
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        setVisibleCount(prev => Math.min(prev + 12, filteredTeams.length));
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [filteredTeams.length]);

  useEffect(() => { setVisibleCount(12); }, [searchTerm, filterSports, filterStatuses]);

  const toggleSport = (sportId: string) => {
    setFilterSports(prev => prev.includes(sportId) ? prev.filter(s => s !== sportId) : [...prev, sportId]);
  };

  const toggleStatus = (statusId: string) => {
    setFilterStatuses(prev => prev.includes(statusId) ? prev.filter(s => s !== statusId) : [...prev, statusId]);
  };

  // 💡 安全防護：在組件掛載前，不渲染依賴 URL 的複雜結構
  if (!isMounted) {
    return (
      <div className="bg-slate-950 min-h-screen flex items-center justify-center text-zinc-500 font-mono text-sm">
        系統載入中...
      </div>
    );
  }

  const isInitialState = filterSports.length === 0 && searchTerm === "";

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-blue-500/30 pb-24 relative">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        
        {/* 💡 把它放在這裡！這樣它就會完美對齊左側，而且不會被 Navbar 遮住 */}
        <BackButton label="返回上一頁" />

        {/* Header */}
        <div className="mb-6 md:mb-8 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">戰隊總部 🛡️</h1>
          <p className="text-zinc-400 text-sm md:text-base font-medium">尋找你的歸屬、發起友誼賽、建立無敵陣容。</p>
        </div>

        {/* ── Top Filter Bar (只有選擇了運動後才顯示) ── */}
        {!isInitialState && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-3xl mb-8 relative z-30 shadow-lg space-y-4 animate-fadeIn">
            <div className="relative">
              <span className="absolute left-3 top-3 text-zinc-500">🔍</span>
              <input 
                type="text" 
                placeholder="搜尋球隊名稱或所在地區..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest whitespace-nowrap mr-1">項目</span>
              <button
                onClick={() => setFilterSports([])}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition ${
                  filterSports.length === 0 ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500 hover:text-white"
                }`}
              >
                全部
              </button>
              {[
                { id: "Basketball", label: "🏀 籃球" },
                { id: "Volleyball", label: "🏐 排球" },
                { id: "Tennis", label: "🎾 網球" }
              ].map(sport => (
                <button
                  key={sport.id}
                  onClick={() => toggleSport(sport.id)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition ${
                    filterSports.includes(sport.id) ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500 hover:text-white"
                  }`}
                >
                  {sport.label}
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
                { id: "recruiting", label: "🟢 招募新血" },
                { id: "scrimmage", label: "🟡 尋找約戰" }
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
        )}

        {/* ── Main Area: Team Grid or Initial Selection ── */}
        <div>
          {isLoading ? (
            <div className="py-20 text-center text-zinc-500 font-mono text-sm">搜尋各方戰力中...</div>
          ) : isInitialState ? (
            
            // 💡 初始引導畫面
            <div className="py-12 md:py-20 text-center animate-fadeIn">
              <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">🎯</div>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-3">你要尋找哪個項目的球隊？</h2>
              <p className="text-zinc-400 mb-10 max-w-md mx-auto">請先選擇一個你想參與或約戰的體育項目，系統將為你列出所有登錄的隊伍。</p>
              
              <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
                {[
                  { id: "Basketball", label: "🏀 籃球", desc: "Basketball" },
                  { id: "Volleyball", label: "🏐 排球", desc: "Volleyball" },
                  { id: "Tennis", label: "🎾 網球", desc: "Tennis" }
                ].map(sport => (
                  <button 
                    key={sport.id}
                    onClick={() => toggleSport(sport.id)}
                    className="w-full sm:w-[200px] bg-slate-900/50 hover:bg-blue-600/20 border border-slate-800 hover:border-blue-500 rounded-2xl p-6 text-center transition duration-300 group"
                  >
                    <span className="block text-2xl mb-2">{sport.label.split(' ')[0]}</span>
                    <span className="block text-lg font-black text-white mb-1">{sport.label.split(' ')[1]}</span>
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{sport.desc}</span>
                  </button>
                ))}
              </div>
            </div>

          ) : filteredTeams.length === 0 ? (
            
            <div className="bg-slate-900/40 border border-dashed border-slate-700/50 rounded-3xl py-20 text-center px-4">
              <p className="text-zinc-400 font-bold text-sm">沒有符合條件的球隊。</p>
              <button onClick={() => {setSearchTerm(""); setFilterSports([]); setFilterStatuses([]);}} className="mt-4 text-sm text-blue-400 hover:text-blue-300 font-bold px-4 py-2 bg-blue-500/10 rounded-lg">清除所有篩選</button>
            </div>

          ) : (
            
            <>
              <div className="mb-4 px-1 flex justify-between items-center">
                <span className="text-sm font-bold text-zinc-500">
                  顯示 <span className="text-white">{filteredTeams.length}</span> 支隊伍
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 animate-fadeIn">
                {visibleTeams.map((t) => (
                  <div key={t.id} className="bg-slate-900/50 border border-slate-800 hover:border-slate-600 rounded-2xl p-6 flex flex-col items-center text-center transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-xl relative overflow-hidden">
                    
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 opacity-0 group-hover:opacity-100 transition duration-300" />
                    
                    <div className="relative w-20 h-20 md:w-24 md:h-24 mb-5 mt-2">
                      <div 
                        className="w-full h-full rounded-2xl bg-slate-800 border-2 border-slate-700/50 overflow-hidden flex items-center justify-center text-3xl font-black text-zinc-600 bg-cover bg-center shadow-inner"
                        style={{ backgroundImage: t.avatar_url ? `url(${t.avatar_url})` : "none" }}
                      >
                        {!t.avatar_url && (t.name?.[0] || "T")}
                      </div>
                      <div className="absolute -bottom-3 flex justify-center w-full">
                        <TeamStatusBadge tag={t.status_tag} />
                      </div>
                    </div>

                    <h3 className="text-lg font-black text-white tracking-tight mb-1 truncate w-full">{t.name}</h3>
                    <p className="text-xs md:text-sm text-zinc-400 font-medium mb-5 line-clamp-2 h-8 md:h-10 leading-snug">
                      {t.headline}
                    </p>
                    
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-6 w-full">
                      <div className="bg-slate-950/50 border border-slate-800/80 text-zinc-400 text-xs font-bold px-3 py-1.5 rounded-lg truncate max-w-[140px]">
                        📍 {t.location}
                      </div>
                      <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-black px-3 py-1.5 rounded-lg truncate">
                        {t.sport === "Basketball" ? "🏀 籃球" : t.sport === "Volleyball" ? "🏐 排球" : "🎾 網球"}
                      </div>
                    </div>

                    <div className="mt-auto w-full pt-4 border-t border-slate-800/80">
                      <Link href={`/t/${t.id}`} className="block w-full bg-slate-800 hover:bg-amber-600 text-white text-sm font-black py-3 rounded-xl transition duration-300">
                        查看球隊專頁
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-8 right-8 bg-amber-600 hover:bg-amber-500 text-white w-12 h-12 rounded-full shadow-[0_0_20px_rgba(217,119,6,0.4)] flex items-center justify-center text-xl z-50 transition-all duration-300 transform ${
          showTopBtn ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"
        }`}
      >
        ↑
      </button>
    </div>
  );
}

// ==========================================
// Main Export
// ==========================================
export default function TeamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">系統準備中...</div>}>
      <TeamPageContent />
    </Suspense>
  );
}