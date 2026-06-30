"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// 引入強大的共用組件
import { AthleteCard } from "@/components/ui/AthleteCard";
import { FilterDropdown } from "@/components/ui/FilterDropdown";

// ==========================================
// 1. 型別宣告
// ==========================================
interface Sport {
  id: string;
  name: string;
}

interface UserSport {
  sport_id: string;
  metadata: { position?: string; [key: string]: any; };
  sports: { name: string; } | null;
}

interface AthleteCardProps {
  id: string;
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  is_coach: boolean | null;
  coach_rate: number | null;
  status_tag: string | null;
  user_sports: UserSport[];
}

function NetworkPageContent() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  // ==========================================
  // 2. 狀態管理
  // ==========================================
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [activeIntentTab, setActiveIntentTab] = useState<string>("ALL");
  
  // 💡 [新增] 渲染切片狀態：控制畫面上顯示的卡片數量
  const [visibleCount, setVisibleCount] = useState(12);

  // 💡 [新增] 智慧重置：只要使用者改變了任何過濾條件，顯示數量就重置回第一頁 (12張)
  useEffect(() => {
    setVisibleCount(12);
  }, [searchQuery, selectedSports, activeIntentTab]);

  // ==========================================
  // 3. 數據抓取 (使用 React Query 快取)
  // ==========================================
  const { data: athletes = [], isLoading: isLoadingAthletes } = useQuery({
    queryKey: ['athletes'],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select(`
          id, full_name, headline, bio, location, avatar_url, is_coach, coach_rate, status_tag,
          user_sports (sport_id, metadata, sports (name))
        `)
        .order("updated_at", { ascending: false });
      return (data || []) as AthleteCardProps[];
    },
    staleTime: 60000 
  });

  const { data: allSports = [], isLoading: isLoadingSports } = useQuery({
    queryKey: ['sports'],
    queryFn: async () => {
      const { data } = await supabase.from("sports").select("*");
      return (data || []) as Sport[];
    }
  });

  const isLoading = isLoadingAthletes || isLoadingSports;

  // ==========================================
  // 4. 過濾引擎
  // ==========================================
  const filteredAthletes = useMemo(() => {
    return athletes.filter((item) => {
      const matchQ =
        searchQuery === "" ||
        (item.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (item.location?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (item.headline?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchS =
        selectedSports.length === 0 ||
        item.user_sports?.some((us) => us.sports?.name && selectedSports.includes(us.sports.name));

      let matchI = true;
      if (activeIntentTab === "open_to_team") matchI = item.status_tag === "open_to_team";
      if (activeIntentTab === "looking_for_sub") matchI = item.status_tag === "looking_for_sub";
      if (activeIntentTab === "COACH") matchI = item.is_coach === true;

      return matchQ && matchS && matchI;
    });
  }, [athletes, searchQuery, selectedSports, activeIntentTab]);

  // 💡 [新增] 取得目前應該渲染在畫面上的切片資料
  const displayedAthletes = filteredAthletes.slice(0, visibleCount);

  // 定義招募意向的選項
  const intentOptions = [
    { id: "ALL", name: "👥 全部意向選手", value: "ALL" },
    { id: "open_to_team", name: "🟢 尋找球隊招募中", value: "open_to_team" },
    { id: "looking_for_sub", name: "🟡 可接受客串替補", value: "looking_for_sub" },
    { id: "COACH", name: "🏆 官方認證執業教練", value: "COACH" }
  ];

  // ==========================================
  // 5. UI 渲染
  // ==========================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 font-mono space-y-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>同步全球運動員網路中...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 font-sans pb-24 antialiased selection:bg-blue-600 selection:text-white">
      
      {/* 頂部 Header */}
      <div className="border-b border-slate-800 bg-slate-900/40 pt-10 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-blue-400 font-black text-[10px] tracking-widest uppercase bg-blue-950 border border-blue-800/60 px-2.5 py-1 rounded">
              PRO DIRECTORY
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2.5">
              探索運動員與教練網路
            </h1>
          </div>
          <div className="text-left md:text-right font-mono">
            <span className="text-2xl font-black text-blue-400">{filteredAthletes.length}</span>
            <span className="text-xs text-slate-500 ml-1.5 font-bold font-sans">位符合條件選手</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        
        {/* 控制台過濾區 */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
          
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋姓名、技術關鍵字或地區 (例如: 長跑、九龍)..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pl-11 pr-4 py-3.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition font-bold"
            />
            <span className="absolute left-4 top-4 text-slate-500 text-sm">🔍</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-1">
            
            {/* 1. 體育項目多選選單 */}
            <div className="lg:col-span-5 relative">
              <FilterDropdown 
                label="1. 選擇體育項目 (可多選)"
                displayText={selectedSports.length === 0 ? "🏆 所有體育項目 (All Sports)" : `🏆 已篩選 ${selectedSports.length} 個項目`}
                options={allSports}
                selectedValues={selectedSports}
                isMultiSelect={true}
                onToggle={(val) => setSelectedSports(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val])}
              />
            </div>

            {/* 2. 招募意向選單 */}
            <div className="lg:col-span-5 relative">
              <FilterDropdown 
                label="2. 選擇招募意向與執照"
                displayText={intentOptions.find(o => o.value === activeIntentTab)?.name || "👥 全部意向選手"}
                options={intentOptions}
                selectedValues={[activeIntentTab]}
                isMultiSelect={false}
                onToggle={(val) => setActiveIntentTab(val)}
              />
            </div>

            {/* 重置 */}
            <div className="lg:col-span-2 flex items-end">
              <button
                onClick={() => { setSearchQuery(""); setSelectedSports([]); setActiveIntentTab("ALL"); }}
                className="w-full bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 h-[46px] cursor-pointer"
              >
                <span>↺</span> 重置
              </button>
            </div>
          </div>
        </div>

        {/* 選手網格清單 */}
        {filteredAthletes.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl space-y-3">
            <p className="text-slate-400 text-sm font-bold">雷達範圍內查無相符運動員</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {/* 💡 [修改] 這裡改用 displayedAthletes 來渲染，防止畫面爆炸 */}
              {displayedAthletes.map((athlete) => (
                <AthleteCard 
                  key={athlete.id} 
                  card={athlete} 
                  onClick={() => router.push(`/p/${athlete.id}`)} 
                />
              ))}
            </div>

            {/* 💡 [新增] 載入更多按鈕 */}
            {visibleCount < filteredAthletes.length && (
              <div className="flex justify-center pt-6 pb-12">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 12)}
                  className="bg-slate-900 hover:bg-slate-800 text-blue-400 font-bold py-3.5 px-8 rounded-full transition-all shadow-lg shadow-blue-900/20 border border-slate-700 hover:border-blue-500 flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-lg">↓</span> 
                  <span>載入更多運動員</span>
                  <span className="text-slate-500 ml-1">({filteredAthletes.length - visibleCount} 位等待顯示)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(NetworkPageContent), { ssr: false });