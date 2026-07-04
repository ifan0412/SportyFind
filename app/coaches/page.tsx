"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";
import { SportFilterModal } from "@/components/SportFilterModal";
import { LocationFilterModal } from "@/components/LocationFilterModal";
import { MapPin, DollarSign, User as UserIcon } from "lucide-react";

interface CoachServiceRow {
  id: string;
  coach_id: string;
  sport_category: string;
  title: string;
  description: string | null;
  location: string | null;
  hourly_rate: number;
  profiles: {
    full_name: string | null;
    headline: string | null;
    avatar_url: string | null;
  } | null;
}

export default function CoachesPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [services, setServices] = useState<CoachServiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);
  
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || null;

      // 🔥 核心改版：直接讀取 active 的 coach_services 課程，並關聯教練 profiles
      let query = supabase
        .from("coach_services")
        .select(`
          id, coach_id, sport_category, title, description, location, hourly_rate,
          profiles!coach_id (full_name, headline, avatar_url)
        `)
        .eq("is_active", true);

      if (currentUserId) {
        query = query.neq("coach_id", currentUserId);
      }

      const { data, error } = await query;
      if (!error && data) setServices(data as unknown as CoachServiceRow[]);
      setIsLoading(false);
    };
    fetchCourses();
  }, [supabase]);

  // 動態取出目前所有課程擁有的專項與區域
  const uniqueSports = Array.from(new Set(services.map(c => c.sport_category).filter(Boolean))) as string[];
  
  // 提供與後台下拉完美吻合的標準區域
  const standardLocations = [
    "港島區 (Hong Kong Island)",
    "九龍區 (Kowloon)",
    "新界區 (New Territories)",
    "離島區 (Outlying Islands)",
    "全港 / 現場可議"
  ];

  const filteredServices = services.filter(srv => {
    const matchSearch = 
      (srv.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (srv.profiles?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchSport = selectedSports.length === 0 ? true : selectedSports.includes(srv.sport_category);
    const matchLocation = selectedLocations.length === 0 ? true : selectedLocations.includes(srv.location || "");
    
    return matchSearch && matchSport && matchLocation;
  });

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-amber-500/30 pb-24 relative">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        
        <BackButton label="返回上一頁" />

        <div className="mb-6 md:mb-8 text-center md:text-left mt-2">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">教練課程名師榜 🎓</h1>
          <p className="text-zinc-400 text-sm md:text-base font-medium">嚴選各項目的專業導師與獨立訓練課程，突破你的競技天花板。</p>
        </div>

        {/* ── 篩選器 ── */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 md:p-5 rounded-3xl mb-8 shadow-lg flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:flex-1">
            <span className="absolute left-3.5 top-3.5 text-zinc-500">🔍</span>
            <input
              type="text"
              placeholder="搜尋課程名稱或教練名字..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-amber-500 transition"
            />
          </div>
          
          <button
            onClick={() => setIsSportModalOpen(true)}
            className={`w-full md:w-auto flex items-center justify-between gap-3 px-5 py-3 rounded-xl border text-sm font-bold transition flex-shrink-0 cursor-pointer ${
              selectedSports.length > 0
                ? "bg-amber-600/10 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"
            }`}
          >
            <span>專項 {selectedSports.length > 0 ? `(${selectedSports.length})` : "(全部)"}</span>
            <span className="text-[10px]">▼</span>
          </button>

          <button
            onClick={() => setIsLocationModalOpen(true)}
            className={`w-full md:w-auto flex items-center justify-between gap-3 px-5 py-3 rounded-xl border text-sm font-bold transition flex-shrink-0 cursor-pointer ${
              selectedLocations.length > 0
                ? "bg-amber-600/10 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"
            }`}
          >
            <span>地區 {selectedLocations.length > 0 ? `(${selectedLocations.length})` : "(全區)"}</span>
            <span className="text-[10px]">▼</span>
          </button>
        </div>

        {/* ── 課程列表展示 ── */}
        <div>
          <div className="mb-4 px-1 flex justify-between items-center">
            <span className="text-sm font-bold text-zinc-500">
              顯示 <span className="text-white">{filteredServices.length}</span> 項專業訓練課程
            </span>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-zinc-500 font-mono text-sm">搜尋各方名師與課程中...</div>
          ) : filteredServices.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-700/50 rounded-3xl py-20 text-center px-4">
              <p className="text-zinc-400 font-bold text-sm">沒有找到符合條件的課程。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 animate-fadeIn">
              {filteredServices.map((srv) => (
                <div
                  key={srv.id}
                  className="bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-6 flex flex-col justify-between transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-2xl relative overflow-hidden"
                >
                  <div className="space-y-4">
                    {/* 上方：專項與報價標籤 */}
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {srv.sport_category}
                      </span>
                      <span className="text-lg font-black text-emerald-400 flex items-center">
                        HK$ {srv.hourly_rate} <span className="text-xs text-zinc-500 font-normal ml-0.5">/小時</span>
                      </span>
                    </div>

                    {/* 課程標題與簡述 */}
                    <div>
                      <Link href={`/coaches/services/${srv.id}`} className="block">
                        <h3 className="text-lg font-black text-white tracking-tight group-hover:text-amber-400 transition line-clamp-1">
                          {srv.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-zinc-400 font-medium mt-1 line-clamp-2 h-8 leading-snug">
                        {srv.description || "點擊查看完整授課大綱與學員評價。"}
                      </p>
                    </div>

                    {/* 授課區域徽章 */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{srv.location || "港九新界 / 地點可商議"}</span>
                    </div>
                  </div>

                  {/* 底部：教練檔案連結與預約 CTA */}
                  <div className="pt-4 mt-5 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    <Link
                      href={`/p/${srv.coach_id}?tab=coach`}
                      className="flex items-center gap-2 group/coach min-w-0"
                    >
                      <div
                        className="w-8 h-8 rounded-full bg-slate-800 bg-cover bg-center shrink-0 border border-slate-700 flex items-center justify-center"
                        style={srv.profiles?.avatar_url ? { backgroundImage: `url(${srv.profiles.avatar_url})` } : undefined}
                      >
                        {!srv.profiles?.avatar_url && <UserIcon className="w-4 h-4 text-zinc-500" />}
                      </div>
                      <span className="text-xs font-bold text-zinc-300 group-hover/coach:text-white truncate">
                        {srv.profiles?.full_name || "專業教練"}
                      </span>
                    </Link>

                    <Link
                      href={`/coaches/services/${srv.id}`}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs rounded-xl transition shadow-md shrink-0 active:scale-95"
                    >
                      預約 / 詳情 →
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
        allSports={uniqueSports}
        selectedSports={selectedSports}
        onApply={setSelectedSports}
      />
      
      <LocationFilterModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        allLocations={standardLocations}
        selectedLocations={selectedLocations}
        onApply={setSelectedLocations}
      />
    </div>
  );
}