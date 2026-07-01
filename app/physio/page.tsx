"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";

// ==========================================
// Types
// ==========================================
interface PhysioProfile {
  id: string;
  name: string;
  role: string;
  location: string;
  status_tag: string;
  headline: string;
  rate: number;
  avatar_url: string | null;
}

// 💡 專屬防護員假資料 (Mock Data)
const MOCK_PHYSIOS: PhysioProfile[] = [
  { id: "p1", name: "Dr. Sarah Lee", role: "物理治療師", location: "中環", status_tag: "available", headline: "專精十字韌帶(ACL)術後復健與回歸賽場評估。", rate: 800, avatar_url: null },
  { id: "p2", name: "Jason Wong", role: "運動按摩師", location: "旺角", status_tag: "busy", headline: "深層筋膜放鬆，有效舒緩賽後肌肉緊繃與發炎。", rate: 500, avatar_url: null },
  { id: "p3", name: "Dr. Alan Chen", role: "防護員 (AT)", location: "銅鑼灣", status_tag: "available", headline: "隨隊防護經驗豐富，提供賽前貼紮與場邊緊急處理。", rate: 600, avatar_url: null },
  { id: "p4", name: "Emily Cheung", role: "物理治療師", location: "尖沙咀", status_tag: "available", headline: "專注於肩頸與腰椎運動傷害，結合彼拉提斯訓練。", rate: 750, avatar_url: null },
  { id: "p5", name: "Mike Davis", role: "運動按摩師", location: "新界", status_tag: "busy", headline: "提供到府或賽場支援服務，專業高強度恢復按摩。", rate: 450, avatar_url: null },
];

// ==========================================
// Sub-components
// ==========================================
function PhysioStatusBadge({ tag }: { tag: string | null }) {
  if (tag === "available")
    return (
      <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 開放預約
      </div>
    );
  if (tag === "busy")
    return (
      <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400" /> 滿診中
      </div>
    );
  return null;
}

// ==========================================
// Main Component
// ==========================================
export default function PhysioPage() {
  const [physios, setPhysios] = useState<PhysioProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRoles, setFilterRoles] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);

  const [visibleCount, setVisibleCount] = useState(12);
  const [showTopBtn, setShowTopBtn] = useState(false);

  // 模擬讀取資料庫
  useEffect(() => {
    // ⚠️ 未來請換成真實的 Supabase 請求
    setTimeout(() => {
      setPhysios(MOCK_PHYSIOS);
      setIsLoading(false);
    }, 500); 
  }, []);

  const filteredPhysios = physios.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.headline.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRoles.length === 0 || filterRoles.includes(p.role);
    const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(p.status_tag);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const visiblePhysios = filteredPhysios.slice(0, visibleCount);

  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.scrollY > 400);
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        setVisibleCount(prev => Math.min(prev + 12, filteredPhysios.length));
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [filteredPhysios.length]);

  useEffect(() => { setVisibleCount(12); }, [searchTerm, filterRoles, filterStatuses]);

  const toggleRole = (roleId: string) => {
    setFilterRoles(prev => prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]);
  };

  const toggleStatus = (statusId: string) => {
    setFilterStatuses(prev => prev.includes(statusId) ? prev.filter(s => s !== statusId) : [...prev, statusId]);
  };

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-emerald-500/30 pb-24 relative">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <BackButton label="返回上一頁" />
        {/* Header */}
        <div className="mb-6 md:mb-8 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">醫療防護室 ⚕️</h1>
          <p className="text-zinc-400 text-sm md:text-base font-medium">尋找專業物理治療師與運動按摩，加速你的賽後恢復。</p>
        </div>

        {/* ── Top Filter Bar ── */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-3xl mb-8 relative z-30 shadow-lg space-y-4">
          <div className="relative">
            <span className="absolute left-3 top-3 text-zinc-500">🔍</span>
            <input 
              type="text" 
              placeholder="搜尋專家姓名或專長部位..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest whitespace-nowrap mr-1">專業</span>
            <button
              onClick={() => setFilterRoles([])}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition ${
                filterRoles.length === 0 ? "bg-emerald-600 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500 hover:text-white"
              }`}
            >
              全部
            </button>
            {[
              { id: "物理治療師", label: "⚕️ 物理治療師" },
              { id: "運動按摩師", label: "💆 運動按摩師" },
              { id: "防護員 (AT)", label: "🩹 隨隊防護員" }
            ].map(role => (
              <button
                key={role.id}
                onClick={() => toggleRole(role.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition ${
                  filterRoles.includes(role.id) ? "bg-emerald-600 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500 hover:text-white"
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
              { id: "available", label: "🟢 開放預約" },
              { id: "busy", label: "🔴 滿診中" }
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

        {/* ── Main Area: Physio Grid ── */}
        <div>
          <div className="mb-4 px-1 flex justify-between items-center">
            <span className="text-sm font-bold text-zinc-500">
              顯示 <span className="text-white">{filteredPhysios.length}</span> 位專家
            </span>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-zinc-500 font-mono text-sm">搜尋醫療資源庫中...</div>
          ) : filteredPhysios.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-700/50 rounded-3xl py-20 text-center px-4">
              <p className="text-zinc-400 font-bold text-sm">沒有符合條件的防護專家。</p>
              <button onClick={() => {setSearchTerm(""); setFilterRoles([]); setFilterStatuses([]);}} className="mt-4 text-sm text-emerald-400 hover:text-emerald-300 font-bold px-4 py-2 bg-emerald-500/10 rounded-lg">清除所有篩選</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8">
                {visiblePhysios.map((p) => (
                  <div key={p.id} className="bg-slate-900/50 border border-slate-800 hover:border-slate-600 rounded-2xl p-6 flex flex-col items-center text-center transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-xl relative overflow-hidden">
                    
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition duration-300" />
                    
                    <div className="relative w-20 h-20 md:w-24 md:h-24 mb-5 mt-2">
                      <div 
                        className="w-full h-full rounded-full bg-slate-800 border-2 border-slate-700/50 overflow-hidden flex items-center justify-center text-3xl font-black text-zinc-600 bg-cover bg-center shadow-inner"
                        style={{ backgroundImage: p.avatar_url ? `url(${p.avatar_url})` : "none" }}
                      >
                        {!p.avatar_url && (p.name?.[0] || "P")}
                      </div>
                      <div className="absolute -bottom-3 flex justify-center w-full">
                        <PhysioStatusBadge tag={p.status_tag} />
                      </div>
                    </div>

                    <h3 className="text-lg font-black text-white tracking-tight mb-1 truncate w-full">{p.name}</h3>
                    <p className="text-xs md:text-sm text-zinc-400 font-medium mb-5 line-clamp-2 h-8 md:h-10 leading-snug">
                      {p.headline}
                    </p>
                    
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-6 w-full">
                      <div className="bg-slate-950/50 border border-slate-800/80 text-zinc-400 text-xs font-bold px-3 py-1.5 rounded-lg truncate max-w-[140px]">
                        📍 {p.location}
                      </div>
                      <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black px-3 py-1.5 rounded-lg truncate">
                        {p.role} (HK${p.rate})
                      </div>
                    </div>

                    <div className="mt-auto w-full pt-4 border-t border-slate-800/80">
                      <Link href={`/physio/${p.id}`} className="block w-full bg-slate-800 hover:bg-emerald-600 text-white text-sm font-black py-3 rounded-xl transition duration-300">
                        查看防護專頁
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {visibleCount < filteredPhysios.length && (
                <div className="text-center mt-12">
                  <button 
                    onClick={() => setVisibleCount(prev => Math.min(prev + 12, filteredPhysios.length))}
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

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-8 right-8 bg-emerald-600 hover:bg-emerald-500 text-white w-12 h-12 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center text-xl z-50 transition-all duration-300 transform ${
          showTopBtn ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"
        }`}
      >
        ↑
      </button>

    </div>
  );
}