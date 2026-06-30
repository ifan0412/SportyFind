"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import {
  FilterPanel,
  type FilterField,
  type FilterOption,
} from "@/components/shared/FilterPanel";

const CoachesDirectory = dynamic(
  () => Promise.resolve(CoachesDirectoryComponent),
  { ssr: false },
);

interface MockCoach {
  id: string;
  name: string;
  avatar: string;
  sport: string;
  certifications: string[];
  hourlyRate: number;
  rating: number;
  reviewsCount: number;
  district: string;
  bio: string;
  isVerified: boolean;
  isAcceptingStudents: boolean;
}

function CoachesDirectoryComponent() {
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedRates, setSelectedRates] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);

  const mockCoaches: MockCoach[] = [
    {
      id: "c1",
      name: "Coach Mike",
      avatar: "👑",
      sport: "Tennis",
      certifications: ["PTR 國際認證", "前港隊成員"],
      hourlyRate: 650,
      rating: 4.9,
      reviewsCount: 34,
      district: "港島區 Island",
      bio: "專精底線抽擊與發球動作微調，適合想突破瓶頸的進階學員。",
      isVerified: true,
      isAcceptingStudents: true,
    },
    {
      id: "c2",
      name: "Constance Lee",
      avatar: "🏆",
      sport: "Volleyball",
      certifications: ["FIVB Level 2"],
      hourlyRate: 400,
      rating: 4.8,
      reviewsCount: 18,
      district: "九龍區 Kowloon",
      bio: "耐心教學，主攻二傳與防守步法，可接小班團體課。",
      isVerified: true,
      isAcceptingStudents: true,
    },
    {
      id: "c3",
      name: "Jason Wu",
      avatar: "💪",
      sport: "Basketball",
      certifications: ["FIBA 認證教練", "體能訓練師"],
      hourlyRate: 800,
      rating: 5.0,
      reviewsCount: 56,
      district: "全港 All",
      bio: "結合美式訓練法與重訓，專門針對爆發力與單打技巧提升。",
      isVerified: true,
      isAcceptingStudents: false,
    },
    {
      id: "c4",
      name: "Emma Wong",
      avatar: "🏸",
      sport: "Badminton",
      certifications: ["BWF 一級教練"],
      hourlyRate: 500,
      rating: 4.7,
      reviewsCount: 12,
      district: "新界區 N.T.",
      bio: "步伐訓練專家，糾正錯誤發力姿勢，預防運動傷害。",
      isVerified: false,
      isAcceptingStudents: true,
    },
  ];

  const sportOptions: FilterOption[] = [
    { label: "🎾 網球 Tennis", value: "Tennis" },
    { label: "🏐 排球 Volleyball", value: "Volleyball" },
    { label: "🏀 籃球 Basketball", value: "Basketball" },
    { label: "🏸 羽毛球 Badminton", value: "Badminton" },
  ];

  const rateOptions: FilterOption[] = [
    { label: "$400 以下 /hr", value: "low" },
    { label: "$400 - $600 /hr", value: "mid" },
    { label: "$600 以上 /hr", value: "high" },
  ];

  const districtOptions: FilterOption[] = [
    { label: "港島區 Hong Kong Island", value: "Island" },
    { label: "九龍區 Kowloon", value: "Kowloon" },
    { label: "新界區 New Territories", value: "N.T." },
    { label: "全港 All", value: "All" },
  ];

  const filteredList = useMemo(() => {
    return mockCoaches.filter((coach) => {
      const matchSport =
        selectedSports.length === 0 || selectedSports.includes(coach.sport);
      const matchDistrict =
        selectedDistricts.length === 0 ||
        selectedDistricts.some(
          (district) =>
            coach.district.includes(district) || coach.district === "全港 All",
        );
      const matchRate =
        selectedRates.length === 0 ||
        selectedRates.some((rate) => {
          if (rate === "low") return coach.hourlyRate < 400;
          if (rate === "mid")
            return coach.hourlyRate >= 400 && coach.hourlyRate <= 600;
          if (rate === "high") return coach.hourlyRate > 600;
          return true;
        });
      return matchSport && matchDistrict && matchRate;
    });
  }, [mockCoaches, selectedSports, selectedRates, selectedDistricts]);

  const hasActiveFilters =
    selectedSports.length > 0 ||
    selectedRates.length > 0 ||
    selectedDistricts.length > 0;

  const resetFilters = () => {
    setSelectedSports([]);
    setSelectedRates([]);
    setSelectedDistricts([]);
  };

  const filterFields: FilterField[] = [
    {
      type: "multi-select",
      id: "sport",
      label: "1. 專項運動 Sport",
      options: sportOptions,
      selected: selectedSports,
      onChange: setSelectedSports,
      placeholder: "🏆 所有運動項目 (All Sports)",
      colSpanClass: "lg:col-span-3",
    },
    {
      type: "multi-select",
      id: "rate",
      label: "2. 時薪預算 Rate",
      options: rateOptions,
      selected: selectedRates,
      onChange: setSelectedRates,
      placeholder: "💰 所有預算 (All Rates)",
      colSpanClass: "lg:col-span-3",
    },
    {
      type: "multi-select",
      id: "district",
      label: "3. 教學區域 Area",
      options: districtOptions,
      selected: selectedDistricts,
      onChange: setSelectedDistricts,
      placeholder: "📍 所有區域 (All Areas)",
      colSpanClass: "lg:col-span-3",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 pb-24 font-sans text-slate-100">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <Link
          href="/"
          className="text-xs text-slate-500 transition-colors hover:text-slate-300"
        >
          ← 返回首頁 Back to Home
        </Link>

        <div className="mt-4 flex flex-col justify-between md:flex-row md:items-end">
          <div>
            <h1 className="flex flex-col gap-1 text-3xl font-black tracking-tight text-white">
              <span>官方認證教練榜</span>
              {/* Updated: amber-400 for better dark bg contrast */}
              <span className="text-xl font-bold text-amber-400">
                Verified Coaches
              </span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              瀏覽透明評價與公開時薪，預約頂尖專業導師。
              <br />
              <span className="text-xs text-slate-500">
                Book top-tier professionals with transparent rates and reviews.
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-6xl px-4">
        <FilterPanel
          fields={filterFields}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
          resultCount={filteredList.length}
          mobileTitle="篩選教練 Filter Coaches"
          resetColSpanClass="lg:col-span-3"
        />

        {filteredList.length === 0 ? (
          // Updated: slate-800/50 border + bg for empty state
          <div className="relative z-0 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 py-20 text-center">
            <p className="mb-4 text-4xl">📭</p>
            <h3 className="text-lg font-bold text-slate-300">
              找不到符合預算的教練 No coaches found
            </h3>
            {/* Updated: blue-400 consistent with link variant */}
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 text-xs font-bold text-blue-400 underline hover:text-blue-300"
            >
              清除所有篩選 Clear all filters
            </button>
          </div>
        ) : (
          <div className="relative z-0 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredList.map((coach) => (
              // Updated: slate-800 card bg, slate-700 border + hover
              <div
                key={coach.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-700/50 bg-slate-800/60 p-6 shadow-lg transition-colors hover:border-slate-600"
              >
                <span className="absolute top-6 right-6 flex flex-col items-end leading-none text-lg font-black text-white">
                  {/* Updated: amber-400 for price on dark bg */}
                  <span className="font-mono text-amber-400">
                    ${coach.hourlyRate}
                  </span>
                  <span className="mt-1 font-sans text-[10px] font-medium uppercase text-slate-500">
                    HKD / hr
                  </span>
                </span>

                <div>
                  <div className="mb-4 flex items-center gap-4">
                    {/* Updated: slate-900 avatar bg, slate-700 border */}
                    <span className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-4xl shadow-inner">
                      {coach.avatar}
                    </span>
                    <div>
                      <h3 className="flex items-center gap-1.5 text-lg font-bold text-white">
                        {coach.name}
                        {coach.isVerified ? (
                          // Updated: blue-600 PRO badge consistent with brand colour
                          <span
                            className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-black text-white uppercase"
                            title="官方藍勾勾認證"
                          >
                            PRO
                          </span>
                        ) : null}
                      </h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-400">
                          {coach.sport}
                        </span>
                        {/* Updated: amber-400 stars consistent across app */}
                        <div className="flex items-center font-mono text-[11px] text-amber-400">
                          <span>★ {coach.rating}</span>
                          <span className="ml-1 text-slate-500">
                            ({coach.reviewsCount})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2">
                    {coach.certifications.map((cert, index) => (
                      // Updated: slate-900 bg, slate-700 border for cert tags
                      <span
                        key={index}
                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-bold text-slate-300"
                      >
                        🎓 {cert}
                      </span>
                    ))}
                  </div>

                  <p className="line-clamp-3 text-xs leading-relaxed text-slate-400">
                    {coach.bio}
                  </p>
                </div>

                {/* Updated: slate-700/50 divider */}
                <div className="mt-5 flex items-center justify-between border-t border-slate-700/50 pt-5">
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                    <span>📍</span> {coach.district}
                  </span>

                  {coach.isAcceptingStudents ? (
                    // Updated: amber-500 CTA, consistent amber shadow
                    <Link
                      href={`/p/${coach.id}`}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-900/30 transition-all hover:bg-amber-400 active:scale-95"
                    >
                      <span>預約 Book</span>
                    </Link>
                  ) : (
                    // Updated: slate-900 bg, slate-700 border, slate-600 text for disabled
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-600"
                    >
                      名額已滿 Full
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CoachesPage() {
  return <CoachesDirectory />;
}