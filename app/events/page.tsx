"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Calendar, MapPin, Shield, Trophy,
  Plus, Loader2, User as UserIcon, Clock,
} from "lucide-react";
import Link from "next/link";
import { getSportCategory, sportMatchesFilter } from "@/lib/sports-categories";
import { SportFilterModal } from "@/components/SportFilterModal";
import { LocationFilterModal } from "@/components/LocationFilterModal";
import { BackButton } from "@/components/BackButton";
import { ListingPageHeader } from "@/components/listing/ListingPageHeader";
import { LISTING_PAGE_MAX_WIDTH, LISTING_PAGE_SHELL_PADDING } from "@/lib/listing-sections";
import {
  districtsForFilterModal,
  formatDistrictList,
  normalizeDistrictIds,
  serviceMatchesDistrictFilter,
} from "@/lib/hk-locations";
import { ListingFilterBar } from "@/components/filters/ListingFilterBar";
import { ScrollRevealFilterShell } from "@/components/filters/ScrollRevealFilterShell";
import { MobileFilterSheet } from "@/components/filters/MobileFilterSheet";
import { useMobileFilterDraft } from "@/components/filters/useMobileFilterDraft";
import {
  countActiveMobileFilters,
  locationFilterCategory,
  singleSelectCategory,
  sportFilterCategory,
} from "@/components/filters/filter-helpers";
import type { MobileFilterValues } from "@/components/filters/types";
import { ShareMenu } from "@/components/share/ShareMenu";
import type { SharePayload } from "@/lib/share-payload";
import { formatEventPeriod } from "@/lib/event-datetime";

const REG_TYPE_OPTIONS = [
  { id: "all", label: "全部" },
  { id: "individual", label: "個人" },
  { id: "team", label: "團隊" },
];

const AVAILABILITY_OPTIONS = [
  { id: "all", label: "全部狀態" },
  { id: "available", label: "🟢 報名開放中" },
  { id: "full", label: "🔴 額滿開放候補" },
];

export default function EventsLobbyPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedRegType, setSelectedRegType] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("all");

  const locationOptions = useMemo(() => districtsForFilterModal(), []);

  const mobileFilterCategories = useMemo(
    () => [
      sportFilterCategory("sports", "項目"),
      locationFilterCategory(locationOptions, "districts", "地區"),
      singleSelectCategory("regType", "模式", REG_TYPE_OPTIONS),
      singleSelectCategory("availability", "名額", AVAILABILITY_OPTIONS),
    ],
    [locationOptions]
  );

  const appliedMobileFilters: MobileFilterValues = useMemo(
    () => ({
      sports: selectedSports,
      districts: selectedDistricts,
      regType: selectedRegType,
      availability: selectedAvailability,
    }),
    [selectedSports, selectedDistricts, selectedRegType, selectedAvailability]
  );

  const mobileFilters = useMobileFilterDraft(appliedMobileFilters);

  const applyMobileFilters = () => {
    const d = mobileFilters.draft;
    setSelectedSports(Array.isArray(d.sports) ? d.sports : []);
    setSelectedDistricts(Array.isArray(d.districts) ? d.districts : []);
    setSelectedRegType(typeof d.regType === "string" ? d.regType : "all");
    setSelectedAvailability(typeof d.availability === "string" ? d.availability : "all");
    mobileFilters.close();
  };

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("events")
        .select(`
          *,
          organizer_team:teams!organizer_team_id (id, name_zh, name_en, logo_url),
          creator_profile:profiles!creator_id (id, full_name, avatar_url),
          event_registrations (id, status, companion_count)
        `)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      if (selectedRegType !== "all") {
        query = query.eq("registration_type", selectedRegType);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      console.error("載入賽事失敗:", err.message || err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, selectedRegType]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = useMemo(() => events.filter(ev => {
    if (selectedSports.length > 0 && !sportMatchesFilter(ev.sport_category, selectedSports)) {
      return false;
    }

    const eventDistricts = normalizeDistrictIds(ev.districts, null);
    if (
      selectedDistricts.length > 0 &&
      !serviceMatchesDistrictFilter(eventDistricts, null, selectedDistricts)
    ) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ev.title?.toLowerCase().includes(q);
      const matchLocation = ev.location_name?.toLowerCase().includes(q);
      const matchTeamZh = ev.organizer_team?.name_zh?.toLowerCase().includes(q);
      const matchTeamEn = ev.organizer_team?.name_en?.toLowerCase().includes(q);
      const matchCreator = ev.creator_profile?.full_name?.toLowerCase().includes(q);

      if (!matchTitle && !matchLocation && !matchTeamZh && !matchTeamEn && !matchCreator) {
        return false;
      }
    }

    const validRegs = (ev.event_registrations || []).filter(
      (r: any) => ["going", "confirmed", "accepted"].includes(String(r.status || "").toLowerCase())
    );
    const filledCount = validRegs.reduce(
      (acc: number, curr: any) => acc + (ev.registration_type === "individual" ? (1 + (curr.companion_count || 0)) : 1),
      0
    );
    const isFull = ev.max_capacity ? filledCount >= ev.max_capacity : false;

    if (selectedAvailability === "available" && isFull) return false;
    if (selectedAvailability === "full" && !isFull) return false;

    return true;
  }), [events, selectedSports, selectedDistricts, searchQuery, selectedAvailability]);

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString("zh-HK", {
      month: "short", day: "numeric", weekday: "short",
      hour: "numeric", minute: "2-digit", hour12: true
    });
  };

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-red-500/30 pb-24 relative">
      <div className={`${LISTING_PAGE_MAX_WIDTH} mx-auto px-4 sm:px-6 lg:px-8 ${LISTING_PAGE_SHELL_PADDING}`}>
        <BackButton label="返回首頁" href="/" />

        <div className="mb-6 md:mb-8 flex flex-col lg:flex-row lg:items-start justify-between gap-1 lg:gap-4">
          <ListingPageHeader section="events" className="mb-0 flex-1 min-w-0" />
          <div className="flex flex-row flex-wrap items-center justify-start gap-2 shrink-0 w-full lg:w-auto lg:justify-end lg:pt-1">
            <Link
              href="/events/my"
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-zinc-300 transition cursor-pointer text-center whitespace-nowrap"
            >
              📋 我的賽事/活動
            </Link>
            <Link
              href="/events/new"
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" /> 發起新約戰/活動
            </Link>
          </div>
        </div>

        <ScrollRevealFilterShell className="mb-6">
        <ListingFilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="搜尋活動標題、場地、主辦..."
          onFilterOpen={mobileFilters.open}
          hasActiveFilters={countActiveMobileFilters(mobileFilterCategories, appliedMobileFilters) > 0}
          accent="blue"
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-3 rounded-3xl mb-4 shadow-lg"
        >
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 md:p-5 rounded-3xl mb-8 shadow-lg flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:flex-1">
              <span className="absolute left-3.5 top-3.5 text-zinc-500">🔍</span>
              <input
                type="text"
                placeholder="搜尋活動標題、場地、主辦球隊或發起人..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsSportModalOpen(true)}
              className={`w-full md:w-auto flex items-center justify-between gap-3 px-5 py-3 rounded-xl border text-sm font-bold transition flex-shrink-0 cursor-pointer ${
                selectedSports.length > 0
                  ? "bg-blue-600/10 border-blue-500 text-blue-400"
                  : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"
              }`}
            >
              <span>項目 {selectedSports.length > 0 ? `(${selectedSports.length})` : "(全部)"}</span>
              <span className="text-[10px]">▼</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className={`w-full md:w-auto flex items-center justify-between gap-3 px-5 py-3 rounded-xl border text-sm font-bold transition flex-shrink-0 cursor-pointer ${
                selectedDistricts.length > 0
                  ? "bg-blue-600/10 border-blue-500 text-blue-400"
                  : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"
              }`}
            >
              <span>地區 {selectedDistricts.length > 0 ? `(${selectedDistricts.length})` : "(全區)"}</span>
              <span className="text-[10px]">▼</span>
            </button>
          </div>
        </ListingFilterBar>

        <div className="hidden md:flex flex-col gap-2.5 mt-4 px-1">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
            <span className="text-[10px] font-bold text-zinc-500 uppercase shrink-0 w-8">模式</span>
            {REG_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedRegType(opt.id)}
                className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  selectedRegType === opt.id
                    ? "bg-slate-100 border-slate-200 text-black shadow-[0_0_10px_rgba(255,255,255,0.15)]"
                    : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"
                }`}
              >
                {opt.id === "individual" ? "👤 " : opt.id === "team" ? "🛡️ " : ""}{opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
            <span className="text-[10px] font-bold text-zinc-500 uppercase shrink-0 w-8">名額</span>
            {AVAILABILITY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedAvailability(opt.id)}
                className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  selectedAvailability === opt.id
                    ? "bg-slate-100 border-slate-200 text-black shadow-[0_0_10px_rgba(255,255,255,0.15)]"
                    : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        </ScrollRevealFilterShell>

        <div className="mb-4 px-1">
          <span className="text-sm font-bold text-zinc-500">
            顯示 <span className="text-white">{filteredEvents.length}</span> 場即將開打的賽事/活動
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-zinc-500 font-mono flex items-center justify-center gap-2 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> 正在尋找即將開打的賽事/活動...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-slate-900/40 border border-dashed border-slate-700/50 rounded-3xl py-20 text-center px-4 space-y-3">
            <Clock className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-zinc-400 font-bold text-sm">目前沒有符合條件的即將開打賽事/活動</p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              嘗試更換搜尋關鍵字、切換篩選條件，或是發起您的第一場公開約戰！
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8">
            {filteredEvents.map((ev) => {
              const validRegs = (ev.event_registrations || []).filter(
                (r: any) => ["going", "confirmed", "accepted"].includes(String(r.status || "").toLowerCase())
              );
              const filledCount = validRegs.reduce(
                (acc: number, curr: any) => acc + (ev.registration_type === "individual" ? (1 + (curr.companion_count || 0)) : 1),
                0
              );
              const isFull = ev.max_capacity && filledCount >= ev.max_capacity;

              const unitLabel = ev.registration_type === "individual" ? "人" : "隊";
              const countText = ev.max_capacity
                ? `${filledCount} / ${ev.max_capacity} ${unitLabel}`
                : `${filledCount} ${unitLabel}`;

              const organizerName = ev.organizer_team
                ? (ev.organizer_team.name_zh || ev.organizer_team.name_en || "未命名球隊")
                : (ev.creator_profile?.full_name || "個人主辦");
              const organizerAvatarUrl = ev.organizer_team?.logo_url || ev.creator_profile?.avatar_url || null;
              const isTeamOrganizer = Boolean(ev.organizer_team);

              const districtLabel = formatDistrictList(normalizeDistrictIds(ev.districts, null), 2);
              const venueName = (ev.location_name || "").trim();
              const locationLine = [districtLabel, venueName].filter(Boolean).join(" · ") || "地點待定";

              const sharePayload: SharePayload = {
                type: "event",
                id: ev.id,
                url:
                  typeof window !== "undefined"
                    ? `${window.location.origin}/events/${ev.id}`
                    : `/events/${ev.id}`,
                title: ev.title,
                subtitle: `${formatEventPeriod(ev.start_time, ev.end_time)} · ${venueName || locationLine}`,
                imageUrl: ev.cover_image_url || undefined,
              };

              return (
                <div
                  key={ev.id}
                  className="relative bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 rounded-3xl p-6 transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-xl flex flex-col justify-between"
                >
                  <Link
                    href={`/events/${ev.id}`}
                    className="absolute inset-0 z-0 rounded-3xl"
                    aria-label={`查看活動：${ev.title}`}
                  />

                  <div className="relative z-10 space-y-4 pointer-events-none">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black px-3 py-1 rounded-full">
                          {(() => {
                            const sport = getSportCategory(ev.sport_category);
                            return sport ? `${sport.emoji} ${sport.labelZh}` : "⚡ 運動";
                          })()}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                            ev.registration_type === "individual"
                              ? "bg-purple-950/40 text-purple-300 border-purple-500/30"
                              : "bg-red-950/40 text-red-300 border-red-500/30"
                          }`}
                        >
                          {ev.registration_type === "individual" ? "👤 個人" : "🛡️ 團隊"}
                        </span>
                      </div>
                      <div
                        className="pointer-events-auto shrink-0 -mt-0.5"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <ShareMenu payload={sharePayload} label="分享" />
                      </div>
                    </div>

                    <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition line-clamp-2">
                      {ev.title}
                    </h3>

                    <div className="space-y-2 text-xs text-zinc-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="font-bold text-zinc-200 truncate">{formatDateTime(ev.start_time)}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-snug">{locationLine}</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 pointer-events-none pt-4 mt-5 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden bg-cover bg-center"
                        style={organizerAvatarUrl ? { backgroundImage: `url(${organizerAvatarUrl})` } : undefined}
                      >
                        {!organizerAvatarUrl && (
                          isTeamOrganizer ? <Shield className="w-3 h-3 text-red-400" /> : <UserIcon className="w-3 h-3 text-blue-400" />
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 truncate">
                        {isTeamOrganizer ? "🛡️ " : "👤 "}
                        <span className="font-bold text-zinc-200">{organizerName}</span>
                      </span>
                    </div>

                    <div className="shrink-0">
                      {isFull ? (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-black bg-red-950/80 text-red-400 border border-red-500/40">
                          🔴 額滿 • {countText}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-black bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                          🟢 開放 • {countText}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MobileFilterSheet
        isOpen={mobileFilters.isOpen}
        categories={mobileFilterCategories}
        values={mobileFilters.draft}
        onChange={mobileFilters.setDraft}
        onCancel={mobileFilters.cancel}
        onApply={applyMobileFilters}
        accent="blue"
      />

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
