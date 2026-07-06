"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";
import { SportFilterModal } from "@/components/SportFilterModal";
import { LocationFilterModal } from "@/components/LocationFilterModal";
import {
  districtsForFilterModal,
  formatDistrictList,
  normalizeDistrictIds,
  serviceMatchesDistrictFilter,
} from "@/lib/hk-locations";
import { sportMatchesFilter } from "@/lib/sports-categories";
import { stripHtml } from "@/lib/content/body";
import { SportCategoryBadge } from "@/components/sports/SportCategoryBadge";
import { MapPin, User as UserIcon } from "lucide-react";

interface CoachServiceRow {
  id: string;
  coach_id: string;
  sport_category: string;
  title: string;
  description: string | null;
  location: string | null;
  districts: string[] | null;
  subdistricts: string[] | null;
  teaching_experience_years: number | null;
  hourly_rate: number;
  profiles: {
    full_name: string | null;
    headline: string | null;
    avatar_url: string | null;
    coach_teaching_experience_years: number | null;
  } | null;
}

function experienceYears(srv: CoachServiceRow): number | null {
  return srv.teaching_experience_years ?? srv.profiles?.coach_teaching_experience_years ?? null;
}

export default function CoachesPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [services, setServices] = useState<CoachServiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);

  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const locationOptions = useMemo(() => districtsForFilterModal(), []);

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || null;

      let query = supabase
        .from("coach_services")
        .select(`
          id, coach_id, sport_category, title, description, location,
          districts, subdistricts, teaching_experience_years, hourly_rate,
          profiles!coach_id (
            full_name, headline, avatar_url, coach_teaching_experience_years
          )
        `)
        .eq("is_active", true);

      if (currentUserId) query = query.neq("coach_id", currentUserId);

      const { data, error } = await query;
      if (!error && data) setServices(data as unknown as CoachServiceRow[]);
      setIsLoading(false);
    };
    fetchCourses();
  }, [supabase]);


  const filteredServices = services.filter((srv) => {
    const matchSearch =
      (srv.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (srv.profiles?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchSport = sportMatchesFilter(srv.sport_category, selectedSports);

    const districts = normalizeDistrictIds(srv.districts, srv.location);
    const matchLocation = serviceMatchesDistrictFilter(districts, srv.location, selectedDistricts);

    return matchSearch && matchSport && matchLocation;
  });

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-amber-500/30 pb-24 relative">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <BackButton label="返回上一頁" />

        <div className="mb-6 md:mb-8 text-center md:text-left mt-2">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
            教練課程名師榜 🎓
          </h1>
          <p className="text-zinc-400 text-sm md:text-base font-medium">
            嚴選各項目的專業導師與獨立訓練課程，突破你的競技天花板。
          </p>
        </div>

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
            type="button"
            onClick={() => setIsSportModalOpen(true)}
            className={`w-full md:w-auto flex items-center justify-between gap-3 px-5 py-3 rounded-xl border text-sm font-bold transition flex-shrink-0 cursor-pointer ${
              selectedSports.length > 0
                ? "bg-amber-600/10 border-amber-500 text-amber-400"
                : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"
            }`}
          >
            <span>專項 {selectedSports.length > 0 ? `(${selectedSports.length})` : "(全部)"}</span>
            <span className="text-[10px]">▼</span>
          </button>

          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className={`w-full md:w-auto flex items-center justify-between gap-3 px-5 py-3 rounded-xl border text-sm font-bold transition flex-shrink-0 cursor-pointer ${
              selectedDistricts.length > 0
                ? "bg-amber-600/10 border-amber-500 text-amber-400"
                : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"
            }`}
          >
            <span>地區 {selectedDistricts.length > 0 ? `(${selectedDistricts.length})` : "(全港)"}</span>
            <span className="text-[10px]">▼</span>
          </button>
        </div>

        <div>
          <div className="mb-4 px-1">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8">
              {filteredServices.map((srv) => {
                const districts = normalizeDistrictIds(srv.districts, srv.location);
                const districtLabel = formatDistrictList(districts, 2) || "全港 / 地點可商議";
                const exp = experienceYears(srv);

                return (
                  <div
                    key={srv.id}
                    className="bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-6 flex flex-col justify-between transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-2xl"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <SportCategoryBadge category={srv.sport_category} variant="amber" size="md" />
                        <span className="text-base font-black text-emerald-400 shrink-0">
                          HK$ {srv.hourly_rate}
                          <span className="text-xs text-zinc-500 font-normal ml-0.5">/小時</span>
                        </span>
                      </div>

                      <Link
                        href={`/p/${srv.coach_id}?tab=coach`}
                        className="flex items-center gap-3 group/coach"
                      >
                        <div
                          className="w-14 h-14 rounded-full bg-slate-800 bg-cover bg-center shrink-0 border-2 border-slate-700 flex items-center justify-center overflow-hidden"
                          style={
                            srv.profiles?.avatar_url
                              ? { backgroundImage: `url(${srv.profiles.avatar_url})` }
                              : undefined
                          }
                        >
                          {!srv.profiles?.avatar_url && (
                            <UserIcon className="w-6 h-6 text-zinc-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-zinc-500 uppercase font-bold leading-none mb-0.5">
                            授課導師
                          </div>
                          <div className="text-lg font-black text-white group-hover/coach:text-amber-400 transition truncate leading-tight">
                            {srv.profiles?.full_name || "專業教練"}
                          </div>
                        </div>
                      </Link>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-300 bg-slate-950/60 px-2.5 py-1 rounded-full border border-slate-800">
                          <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                          {districtLabel}
                        </span>
                        {exp != null && exp > 0 && (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {exp} 年經驗
                          </span>
                        )}
                      </div>

                      <div>
                        <Link href={`/coaches/services/${srv.id}`} className="block">
                          <h3 className="text-sm font-bold text-zinc-300 group-hover:text-amber-400 transition line-clamp-2 leading-snug">
                            {srv.title || "未命名課程"}
                          </h3>
                        </Link>
                        {srv.description && (
                          <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2 leading-snug">
                            {stripHtml(srv.description)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 mt-5 border-t border-slate-800/80 grid grid-cols-2 gap-2.5">
                      <Link
                        href={`/p/${srv.coach_id}?tab=coach`}
                        className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-zinc-200 hover:text-white font-bold text-xs text-center transition"
                      >
                        了解教練
                      </Link>
                      <Link
                        href={`/coaches/services/${srv.id}`}
                        className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs text-center transition flex items-center justify-center gap-1"
                      >
                        課程詳情 →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <SportFilterModal
        isOpen={isSportModalOpen}
        onClose={() => setIsSportModalOpen(false)}
        selectedSports={selectedSports}
        onApply={setSelectedSports}
      />

      <LocationFilterModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        allLocations={locationOptions}
        selectedLocations={selectedDistricts}
        onApply={setSelectedDistricts}
      />
    </div>
  );
}
