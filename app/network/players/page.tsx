"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { SPORT_CATEGORIES, getSportCategory } from "@/lib/sports-categories";

// ==========================================
// 1. Interfaces
// ==========================================
interface MockPlayer {
  id: string;
  name: string;
  avatar: string;
  primarySport: string;
  skillLevel: string;
  positionOrStyle: string;
  district: string;
  lookingFor: string;
  isAvailableThisWeekend: boolean;
}

interface OptionItem {
  label: string;
  value: string;
}

interface MultiSelectProps {
  title: string;
  options: OptionItem[];
  selected: string[];
  onChange: (next: string[]) => void;
}

// ==========================================
// 2. Static data (outside component)
// ==========================================
const MOCK_PLAYERS: MockPlayer[] = [
  {
    id: "p1",
    name: "Alex Chen",
    avatar: "⚡",
    primarySport: "tennis",
    skillLevel: "高階 Advanced",
    positionOrStyle: "底線型 / 慣用右手",
    district: "港島區 Island",
    lookingFor: "尋找平日晚上維園或中山紀念公園球友，可拉球一小時。",
    isAvailableThisWeekend: true,
  },
  {
    id: "p2",
    name: "Sarah Wong",
    avatar: "🏐",
    primarySport: "volleyball",
    skillLevel: "進階 Intermediate",
    positionOrStyle: "二傳手 (Setter)",
    district: "九龍區 Kowloon",
    lookingFor: "剛搬來九龍，想找週六下午的混排或女排歡樂場。",
    isAvailableThisWeekend: true,
  },
  {
    id: "p3",
    name: "Marcus Lau",
    avatar: "🏀",
    primarySport: "basketball",
    skillLevel: "校隊/專業 Pro",
    positionOrStyle: "控球後衛 (PG)",
    district: "新界區 N.T.",
    lookingFor: "全場 5v5 缺人可叫我，主攻組織與防守，不獨食。",
    isAvailableThisWeekend: false,
  },
  {
    id: "p4",
    name: "David Pak",
    avatar: "🎾",
    primarySport: "tennis",
    skillLevel: "進階 Intermediate",
    positionOrStyle: "發球上網型",
    district: "港島區 Island",
    lookingFor: "誠邀實力相當球友練習雙打走位。",
    isAvailableThisWeekend: true,
  },
  {
    id: "p5",
    name: "Elena Rostova",
    avatar: "🏸",
    primarySport: "badminton",
    skillLevel: "高階 Advanced",
    positionOrStyle: "單打 / 拉吊突擊",
    district: "九龍區 Kowloon",
    lookingFor: "尋找長期固定羽毛球夥伴，男女皆可，最重要準時。",
    isAvailableThisWeekend: true,
  },
  {
    id: "p6",
    name: "Kenji Sato",
    avatar: "⚽",
    primarySport: "soccer",
    skillLevel: "初學者 Beginner",
    positionOrStyle: "右後衛 (RB)",
    district: "港島區 Island",
    lookingFor: "新手求收留，體能好肯奔跑，主要想享受踢球樂趣。",
    isAvailableThisWeekend: false,
  },
];

const SPORT_OPTIONS: OptionItem[] = SPORT_CATEGORIES.map((s) => ({
  label: `${s.emoji} ${s.labelZh} ${s.labelEn}`,
  value: s.id,
}));

const LEVEL_OPTIONS: OptionItem[] = [
  { label: "初學者 Beginner", value: "Beginner" },
  { label: "進階 Intermediate", value: "Intermediate" },
  { label: "高階 Advanced", value: "Advanced" },
  { label: "校隊/專業 Pro", value: "Pro" },
];

const DISTRICT_OPTIONS: OptionItem[] = [
  { label: "港島區 Hong Kong Island", value: "Island" },
  { label: "九龍區 Kowloon", value: "Kowloon" },
  { label: "新界區 New Territories", value: "N.T." },
];

// ==========================================
// 3. CustomMultiSelect component
// ==========================================
function CustomMultiSelect({ title, options, selected, onChange }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const toggleOption = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((item) => item !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const getDisplayText = () => {
    if (selected.length === 0) return "所有 (All)";
    if (selected.length === 1) {
      const found = options.find((o) => o.value === selected[0]);
      return found ? found.label.split(" ")[0] : selected[0];
    }
    return `已選取 ${selected.length} 項`;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
        {title}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-pro-slate-900 border rounded-lg text-sm p-3 text-slate-200 text-left flex items-center justify-between font-medium transition-all outline-none ${
          isOpen
            ? "border-pro-blue-500 ring-1 ring-blue-500/50"
            : "border-pro-slate-700 hover:border-pro-slate-500"
        }`}
      >
        <span className="truncate pr-2 select-none">{getDisplayText()}</span>
        <span className="text-[10px] text-slate-500 font-mono">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-pro-slate-900 border border-pro-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto p-1.5 space-y-0.5">
          {options.map((opt) => {
            const isChecked = selected.includes(opt.value);
            return (
              <div
                key={opt.value}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOption(opt.value);
                }}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm cursor-pointer select-none transition-colors ${
                  isChecked
                    ? "bg-pro-blue-600/20 text-blue-400 font-bold"
                    : "hover:bg-pro-slate-800 text-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  readOnly
                  className="rounded border-pro-slate-600 bg-pro-slate-800 text-blue-500 focus:ring-0 mr-3 pointer-events-none w-4 h-4"
                />
                <span className="truncate">{opt.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 4. Main page component
// ==========================================
export default function PlayersPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);

  const filteredList = useMemo(() => {
    return MOCK_PLAYERS.filter((p) => {
      const matchSport = selectedSports.length === 0 || selectedSports.includes(p.primarySport);
      const matchLevel = selectedLevels.length === 0 || selectedLevels.some((lvl) => p.skillLevel.includes(lvl));
      const matchDistrict = selectedDistricts.length === 0 || selectedDistricts.some((dist) => p.district.includes(dist));
      return matchSport && matchLevel && matchDistrict;
    });
  }, [selectedSports, selectedLevels, selectedDistricts]);

  const resetFilters = () => {
    setSelectedSports([]);
    setSelectedLevels([]);
    setSelectedDistricts([]);
  };

  const hasAnyFilter =
    selectedSports.length > 0 || selectedLevels.length > 0 || selectedDistricts.length > 0;

  const filterControlsJSX = (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
      <CustomMultiSelect
        title="運動項目 Sport"
        options={SPORT_OPTIONS}
        selected={selectedSports}
        onChange={setSelectedSports}
      />
      <CustomMultiSelect
        title="技術程度 Level"
        options={LEVEL_OPTIONS}
        selected={selectedLevels}
        onChange={setSelectedLevels}
      />
      <CustomMultiSelect
        title="區域 District"
        options={DISTRICT_OPTIONS}
        selected={selectedDistricts}
        onChange={setSelectedDistricts}
      />
      <button
        onClick={resetFilters}
        disabled={!hasAnyFilter}
        className={`w-full py-3 px-4 rounded-lg text-sm font-bold transition-all ${
          hasAnyFilter
            ? "bg-pro-slate-800 hover:bg-pro-slate-700 text-white"
            : "bg-pro-slate-900 text-slate-600 cursor-not-allowed border border-pro-slate-800"
        }`}
      >
        ↻ 重置條件 Reset
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-pro-slate-950 text-slate-100 pb-24 font-sans">

      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <Link
          href="/network"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← 返回人脈網絡大廳 Back to Network
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between mt-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex flex-col gap-1">
              <span>球友探索名錄</span>
              <span className="text-xl text-slate-500 font-bold">Find Players</span>
            </h1>
            <p className="mt-2 text-slate-400 text-sm leading-relaxed">
              找到與你實力相當、出沒地區相同的運動夥伴。
              <br />
              <span className="text-xs text-slate-500">
                Discover sports partners with similar skills in your area.
              </span>
            </p>
          </div>
          <div className="mt-4 md:mt-0 text-sm font-medium text-slate-500 bg-pro-slate-900 px-4 py-2 rounded-lg border border-pro-slate-800">
            符合條件 Matches：
            <span className="text-blue-500 font-bold text-base ml-1">{filteredList.length}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8">

        {/* Mobile filter trigger */}
        <button
          onClick={() => setIsFilterOpen(true)}
          className="md:hidden w-full py-3.5 bg-pro-slate-900 border border-pro-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg mb-6 hover:bg-pro-slate-800 active:scale-95 transition-all text-slate-200"
        >
          <span>⚙️</span> 進階篩選與區域 Filter & Area
          {hasAnyFilter && <span className="w-2 h-2 rounded-full bg-pro-blue-500 ml-1" />}
        </button>

        {/* Desktop filter panel */}
        <div className="hidden md:block bg-pro-slate-900/60 p-6 rounded-2xl border border-pro-slate-800 mb-8 relative z-30 shadow-sm">
          {filterControlsJSX}
        </div>

        {/* Mobile bottom sheet */}
        {isFilterOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center">
            <div
              className="absolute inset-0 bg-pro-slate-950/80 backdrop-blur-sm"
              onClick={() => setIsFilterOpen(false)}
            />
            <div className="relative w-full bg-pro-slate-950 border-t border-pro-slate-800 rounded-t-3xl p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 ease-out max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black text-xl text-white flex items-center gap-2">
                  篩選條件 <span className="text-sm font-medium text-slate-500">Filters</span>
                </h2>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="text-slate-400 hover:text-white p-2 text-sm font-bold bg-pro-slate-900 rounded-full w-8 h-8 flex items-center justify-center border border-pro-slate-800"
                >
                  ✕
                </button>
              </div>

              {filterControlsJSX}

              <button
                onClick={() => setIsFilterOpen(false)}
                className="w-full mt-8 py-4 bg-pro-blue-600 hover:bg-pro-blue-500 rounded-xl font-bold text-white shadow-lg shadow-blue-900/40 transition-all active:scale-95"
              >
                套用篩選 Apply ({filteredList.length})
              </button>
            </div>
          </div>
        )}

        {/* Results grid */}
        {filteredList.length === 0 ? (
          <div className="text-center py-20 bg-pro-slate-900/40 rounded-2xl border border-dashed border-pro-slate-800 relative z-0">
            <p className="text-4xl mb-4">📭</p>
            <h3 className="text-lg font-bold text-slate-300">
              找不到符合條件的球友 No matches found
            </h3>
            <button
              onClick={resetFilters}
              className="mt-4 text-xs font-bold text-blue-500 underline hover:text-blue-400"
            >
              清除所有篩選 Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-0">
            {filteredList.map((player) => (
              <div
                key={player.id}
                className="bg-pro-slate-900 border border-pro-slate-800 rounded-2xl p-5 hover:border-pro-slate-700 transition-colors relative flex flex-col justify-between group shadow-sm"
              >
                {player.isAvailableThisWeekend && (
                  <span className="absolute top-4 right-4 bg-pro-blue-900/30 text-blue-400 border border-pro-blue-800/50 text-[10px] font-bold px-2 py-1 rounded-md">
                    ⚡ 週末可約 Wknd
                  </span>
                )}

                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-3xl bg-pro-slate-950 p-3 rounded-xl border border-pro-slate-800 shadow-inner">
                      {player.avatar}
                    </span>
                    <div>
                      <h3 className="font-bold text-white text-lg">{player.name}</h3>
                      <p className="text-xs font-medium text-blue-400 mt-0.5">
                        {(() => {
                          const sport = getSportCategory(player.primarySport);
                          return sport ? `${sport.emoji} ${sport.labelZh}` : player.primarySport;
                        })()}{" "}
                        <span className="text-slate-500 font-normal ml-1">{player.skillLevel}</span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-pro-slate-950 rounded-xl p-3 my-4 border border-pro-slate-800 shadow-inner">
                    <p className="text-[11px] font-mono text-slate-500 mb-1.5">
                      戰術/位置 Style：{player.positionOrStyle}
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">「{player.lookingFor}」</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-pro-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <span>📍</span> {player.district}
                  </span>
                  <Link
                    href={`/p/${player.id}`}
                    className="bg-pro-slate-200 hover:bg-pro-slate-50 text-slate-900 text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <span>查看檔案 View</span>
                    <span className="text-[10px]">→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}