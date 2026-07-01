"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";
import { SportFilterModal } from "@/components/SportFilterModal";
import { LocationFilterModal } from "@/components/LocationFilterModal";

interface CoachProfileRow {
  id: string;
  sport: string;
  rate: number;
  status: string;
  region: string;
  user_id: string;
  profiles: { full_name: string; headline: string; avatar_url: string; };
}

function CoachStatusBadge({ tag }: { tag: string | null }) {
  if (tag === "recruiting") return <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> 招生中</div>;
  if (tag === "full") return <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap"><div className="w-1.5 h-1.5 rounded-full bg-red-400" /> 滿員</div>;
  return null;
}

export default function CoachesPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [coaches, setCoaches] = useState<CoachProfileRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // 💡 Modal 狀態與多選陣列
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);
  
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  useEffect(() => {
    const fetchCoaches = async () => {
      const { data, error } = await supabase
        .from("coach_profiles")
        .select("id, user_id, sport, rate, status, region, profiles(full_name, headline, avatar_url)")
        .neq("status", "hidden");
      if (!error && data) setCoaches(data as unknown as CoachProfileRow[]);
      setIsLoading(false);
    };
    fetchCoaches();
  }, [supabase]);

  const uniqueSports = Array.from(new Set(coaches.map(c => c.sport).filter(Boolean))) as string[];
  const uniqueLocations = Array.from(new Set(coaches.map(c => c.region).filter(Boolean))) as string[];

  // 💡 支援多選的過濾邏輯
  const filteredCoaches = coaches.filter(c => {
    const matchSearch = (c.profiles?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchSport = selectedSports.length === 0 ? true : selectedSports.includes(c.sport);
    const matchLocation = selectedLocations.length === 0 ? true : selectedLocations.includes(c.region);
    const matchStatus = filterStatus ? c.status === filterStatus : true;
    return matchSearch && matchSport && matchLocation && matchStatus;
  });

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-amber-500/30 pb-24 relative">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        
        <BackButton label="返回上一頁" />

        <div className="mb-6 md:mb-8 text-center md:text-left mt-2">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">教練名師榜 🎓</h1>
          <p className="text-zinc-400 text-sm md:text-base font-medium">尋找各項目的頂尖導師，突破你的競技天花板。</p>
        </div>

        {/* ── 篩選器 ── */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 md:p-5 rounded-3xl mb-8 shadow-lg flex flex-col md:flex-row gap-4 items-center">
          
          <div className="relative w-full md:flex-1">
            <span className="absolute left-3 top-3 text-zinc-500">🔍</span>
            <input type="text" placeholder="搜尋教練名稱..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-amber-500 transition" />
          </div>
          
          {/* 運動項目 Modal 按鈕 */}
          <button onClick={() => setIsSportModalOpen(true)} className={`w-full md:w-auto flex items-center justify-between gap-3 px-5 py-3 rounded-xl border text-sm font-bold transition flex-shrink-0 ${selectedSports.length > 0 ? "bg-amber-600/10 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>
            <span>專項 {selectedSports.length > 0 ? `(${selectedSports.length})` : "(全部)"}</span><span className="text-[10px]">▼</span>
          </button>

          {/* 地區 Modal 按鈕 */}
          <button onClick={() => setIsLocationModalOpen(true)} className={`w-full md:w-auto flex items-center justify-between gap-3 px-5 py-3 rounded-xl border text-sm font-bold transition flex-shrink-0 ${selectedLocations.length > 0 ? "bg-amber-600/10 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>
            <span>地區 {selectedLocations.length > 0 ? `(${selectedLocations.length})` : "(全區)"}</span><span className="text-[10px]">▼</span>
          </button>

          {/* 狀態過濾列 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden w-full md:w-auto">
            <button onClick={() => setFilterStatus("")} className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold border transition ${!filterStatus ? "bg-slate-100 border-slate-200 text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>全部狀態</button>
            <button onClick={() => setFilterStatus("recruiting")} className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold border transition ${filterStatus === "recruiting" ? "bg-slate-100 border-slate-200 text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>🟢 招生中</button>
            <button onClick={() => setFilterStatus("full")} className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold border transition ${filterStatus === "full" ? "bg-slate-100 border-slate-200 text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>🔴 滿員</button>
          </div>
        </div>

        {/* ── 列表展示 ── */}
        <div>
          <div className="mb-4 px-1 flex justify-between items-center"><span className="text-sm font-bold text-zinc-500">顯示 <span className="text-white">{filteredCoaches.length}</span> 項教練服務</span></div>
          {isLoading ? (
            <div className="py-20 text-center text-zinc-500 font-mono text-sm">搜尋各方名師中...</div>
          ) : filteredCoaches.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-700/50 rounded-3xl py-20 text-center px-4"><p className="text-zinc-400 font-bold text-sm">沒有符合條件的教練。</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 animate-fadeIn">
              {filteredCoaches.map((c) => (
                <div key={c.id} className="bg-slate-900/50 border border-slate-800 hover:border-slate-600 rounded-2xl p-6 flex flex-col items-center text-center transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 opacity-0 group-hover:opacity-100 transition duration-300" />
                  <div className="relative w-20 h-20 md:w-24 md:h-24 mb-5 mt-2">
                    <div className="w-full h-full rounded-full bg-slate-800 border-2 border-slate-700/50 overflow-hidden flex items-center justify-center text-3xl font-black text-zinc-600 bg-cover bg-center shadow-inner" style={{ backgroundImage: c.profiles?.avatar_url ? `url(${c.profiles.avatar_url})` : "none" }}>{!c.profiles?.avatar_url && (c.profiles?.full_name?.[0] || "C")}</div>
                    <div className="absolute -bottom-3 flex justify-center w-full"><CoachStatusBadge tag={c.status} /></div>
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight mb-1 truncate w-full">{c.profiles?.full_name || "教練名稱未設"}</h3>
                  <p className="text-xs md:text-sm text-zinc-400 font-medium mb-5 line-clamp-2 h-8 md:h-10 leading-snug">{c.profiles?.headline || "專注於每一次教學。"}</p>
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-6 w-full">
                    <div className="bg-slate-950/50 border border-slate-800/80 text-zinc-400 text-xs font-bold px-3 py-1.5 rounded-lg truncate max-w-[140px]">📍 {c.region || "地點未公開"}</div>
                    <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-black px-3 py-1.5 rounded-lg">{c.sport}</div>
                    <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-black px-3 py-1.5 rounded-lg truncate">HK$ {c.rate} / hr</div>
                  </div>
                  <div className="mt-auto w-full pt-4 border-t border-slate-800/80">
                    <Link href={`/p/${c.user_id}`} className="block w-full bg-slate-800 hover:bg-amber-600 text-white text-sm font-black py-3 rounded-xl transition duration-300">查看教練專頁</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SportFilterModal isOpen={isSportModalOpen} onClose={() => setIsSportModalOpen(false)} allSports={uniqueSports} selectedSports={selectedSports} onApply={setSelectedSports} />
      <LocationFilterModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} allLocations={uniqueLocations} selectedLocations={selectedLocations} onApply={setSelectedLocations} />
    </div>
  );
}