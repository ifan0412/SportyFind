"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";
import { ListingPageHeader } from "@/components/listing/ListingPageHeader";
import { LISTING_PAGE_MAX_WIDTH, LISTING_PAGE_SHELL_PADDING } from "@/lib/listing-sections";
import type { SportCategory } from "@/types/team";
import { SPORT_CATEGORIES } from "@/lib/sports-categories";
import {
  buildTeamCardTags,
  getTeamCardBio,
  isTeamMetaValueEmpty,
  metadataSearchText,
} from "@/lib/team-metadata-fields";
import { stripHtml } from "@/lib/content/body";
import { ListingFilterBar } from "@/components/filters/ListingFilterBar";
import { ScrollRevealFilterShell } from "@/components/filters/ScrollRevealFilterShell";
import { MobileFilterSheet } from "@/components/filters/MobileFilterSheet";
import { useMobileFilterDraft } from "@/components/filters/useMobileFilterDraft";
import {
  countActiveMobileFilters,
  multiSelectCategory,
} from "@/components/filters/filter-helpers";
import type { MobileFilterValues } from "@/components/filters/types";
import {
  clearTeamListingState,
  readTeamListingState,
  saveTeamListingState,
  setTeamDetailBack,
} from "@/lib/team-listing-state";

const SPORT_OPTIONS: { value: SportCategory; emoji: string; labelEn: string; labelZh: string }[] = SPORT_CATEGORIES.map((s) => ({
  value: s.id as SportCategory,
  emoji: s.emoji,
  labelEn: s.labelEn,
  labelZh: s.labelZh,
}));

function getSportOption(category: string) {
  return SPORT_OPTIONS.find((s) => s.value.toLowerCase() === category?.toLowerCase());
}

interface TeamProfile {
  id: string;
  name_en: string;
  name_zh: string | null;
  sport_category: string;
  recruitment_status: string;
  bio: string | null;
  logo_url: string | null;
  location_region: string | null;
  sport_metadata: Record<string, unknown> | null;
}

function TeamStatusBadge({ tag }: { tag: string | null }) {
  if (tag === "open")
    return (
      <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 公開招募
      </div>
    );
  if (tag === "invite_only")
    return (
      <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" /> 邀請制
      </div>
    );
  if (tag === "closed")
    return (
      <div className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-zinc-500 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-500" /> 暫停招募
      </div>
    );
  return null;
}

function TeamPageContent() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const urlBrowse = searchParams?.get("browse") === "1";
  const urlSport = searchParams?.get("sport")?.toLowerCase() || "";

  const [teams, setTeams] = useState<TeamProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterSports, setFilterSports] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [listingReady, setListingReady] = useState(false);

  const [visibleCount, setVisibleCount] = useState(12);
  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    supabase
      .from("teams")
      .select("id, name_en, name_zh, sport_category, recruitment_status, bio, logo_url, location_region, sport_metadata")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTeams((data as TeamProfile[]) ?? []);
        setIsLoading(false);
      });
  }, [supabase]);

  // Restore sport-picker vs filtered list from menu, URL, or saved session state.
  useEffect(() => {
    if (urlBrowse) {
      clearTeamListingState();
      if (urlSport) {
        setHasInteracted(true);
        setFilterSports([urlSport]);
        setFilterStatuses([]);
        setSearchTerm("");
      } else {
        setHasInteracted(false);
        setFilterSports([]);
        setFilterStatuses([]);
        setSearchTerm("");
      }
      setListingReady(true);
      return;
    }

    if (urlSport) {
      setHasInteracted(true);
      setFilterSports([urlSport]);
      setFilterStatuses([]);
      setSearchTerm("");
      setListingReady(true);
      return;
    }

    const saved = readTeamListingState();
    if (saved) {
      setHasInteracted(saved.hasInteracted);
      setFilterSports(saved.filterSports);
      setFilterStatuses(saved.filterStatuses);
      setSearchTerm(saved.searchTerm);
      setListingReady(true);
      return;
    }

    setHasInteracted(true);
    setFilterSports([]);
    setFilterStatuses([]);
    setSearchTerm("");
    setListingReady(true);
  }, [urlBrowse, urlSport]);

  useEffect(() => {
    if (!listingReady) return;
    if (hasInteracted) {
      saveTeamListingState({
        hasInteracted,
        filterSports,
        filterStatuses,
        searchTerm,
      });
    }
  }, [listingReady, hasInteracted, filterSports, filterStatuses, searchTerm]);

  const persistListingState = () => {
    saveTeamListingState({
      hasInteracted: true,
      filterSports,
      filterStatuses,
      searchTerm,
    });
  };

  const openTeamDetail = (teamId: string) => {
    persistListingState();
    setTeamDetailBack("listing");
    router.push(`/team/${teamId}`);
  };

  const activeCategories = useMemo(
    () => [...new Set(teams.map((t) => t.sport_category.toLowerCase()))],
    [teams]
  );

  const mobileFilterCategories = useMemo(() => {
    const sportOpts = SPORT_OPTIONS.filter((s) =>
      activeCategories.includes(s.value.toLowerCase())
    ).map((s) => ({
      id: s.value.toLowerCase(),
      label: `${s.emoji} ${s.labelZh}`,
    }));
    return [
      multiSelectCategory("sports", "項目", sportOpts),
      multiSelectCategory("statuses", "狀態", [
        { id: "open", label: "🟢 公開招募" },
        { id: "invite_only", label: "🔵 邀請制" },
        { id: "closed", label: "🔴 暫停招募" },
      ]),
    ];
  }, [activeCategories]);

  const appliedMobileFilters: MobileFilterValues = useMemo(
    () => ({ sports: filterSports, statuses: filterStatuses }),
    [filterSports, filterStatuses]
  );

  const mobileFilters = useMobileFilterDraft(appliedMobileFilters);

  const applyMobileFilters = () => {
    const d = mobileFilters.draft;
    setHasInteracted(true);
    setFilterSports(Array.isArray(d.sports) ? d.sports : []);
    setFilterStatuses(Array.isArray(d.statuses) ? d.statuses : []);
    mobileFilters.close();
  };

  const filteredTeams = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return teams.filter((t) => {
      const name = t.name_en || t.name_zh || "";
      const metaText = metadataSearchText(t.sport_metadata);
      const bioText = stripHtml(t.bio ?? "");
      const matchesSearch =
        !q ||
        name.toLowerCase().includes(q) ||
        bioText.toLowerCase().includes(q) ||
        metaText.includes(q);
      const matchesSport =
        filterSports.length === 0 || filterSports.includes(t.sport_category.toLowerCase());
      const matchesStatus =
        filterStatuses.length === 0 || filterStatuses.includes(t.recruitment_status);
      return matchesSearch && matchesSport && matchesStatus;
    });
  }, [teams, searchTerm, filterSports, filterStatuses]);

  const visibleTeams = filteredTeams.slice(0, visibleCount);

  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.scrollY > 400);
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        setVisibleCount((prev) => Math.min(prev + 12, filteredTeams.length));
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [filteredTeams.length]);

  useEffect(() => { setVisibleCount(12); }, [searchTerm, filterSports, filterStatuses]);

  const toggleSport = (sportId: string) => {
    setHasInteracted(true);
    setFilterSports((prev) =>
      prev.includes(sportId) ? prev.filter((s) => s !== sportId) : [...prev, sportId]
    );
  };

  const toggleStatus = (statusId: string) => {
    setHasInteracted(true);
    setFilterStatuses((prev) =>
      prev.includes(statusId) ? prev.filter((s) => s !== statusId) : [...prev, statusId]
    );
  };

  const isInitialState = listingReady && !hasInteracted && searchTerm === "";

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-blue-500/30 pb-24 relative">
      <div className={`${LISTING_PAGE_MAX_WIDTH} mx-auto px-4 sm:px-6 lg:px-8 ${LISTING_PAGE_SHELL_PADDING}`}>
        <BackButton label="返回首頁" href="/" />

        <div className="mb-4 md:mb-6 flex flex-col lg:flex-row lg:items-start justify-between gap-1 lg:gap-4">
          <ListingPageHeader section="team" className="mb-0 flex-1 min-w-0" />
          <div className="flex flex-row flex-wrap items-center justify-start gap-2 shrink-0 w-full lg:w-auto lg:justify-end lg:pt-1">
            <Link
              href="/profile?tab=teams"
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-zinc-300 transition cursor-pointer text-center whitespace-nowrap"
            >
              📋 我的團隊
            </Link>
          </div>
        </div>

        <ScrollRevealFilterShell className="mb-6">
          {!isInitialState ? (
            <>
              <ListingFilterBar
                searchValue={searchTerm}
                onSearchChange={(v) => { setHasInteracted(true); setSearchTerm(v); }}
                searchPlaceholder="搜尋團隊名稱或簡介..."
                onFilterOpen={mobileFilters.open}
                hasActiveFilters={countActiveMobileFilters(mobileFilterCategories, appliedMobileFilters) > 0}
                accent="purple"
                mobileTrailing={
                  <button
                    onClick={() => router.push("/team/create")}
                    className="shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black shadow-[0_0_15px_rgba(168,85,247,0.25)] transition active:scale-95"
                    aria-label="建立隊伍"
                  >
                    ＋
                  </button>
                }
              >
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">🔍</span>
                    <input
                      type="text"
                      placeholder="搜尋團隊名稱或簡介..."
                      value={searchTerm}
                      onChange={(e) => { setHasInteracted(true); setSearchTerm(e.target.value); }}
                      className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <button
                    onClick={() => router.push("/team/create")}
                    className="shrink-0 flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-black px-5 py-3 rounded-2xl shadow-[0_0_15px_rgba(168,85,247,0.25)] transition-all active:scale-95 whitespace-nowrap"
                  >
                    <span className="text-base leading-none">＋</span>
                    <span>建立隊伍/團體</span>
                  </button>
                </div>
              </ListingFilterBar>

              <div className="hidden md:block bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-3xl mt-4 shadow-lg space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest whitespace-nowrap mr-1">項目</span>
                  <button
                    onClick={() => { setHasInteracted(true); setFilterSports([]); }}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition ${
                      filterSports.length === 0
                        ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                        : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500 hover:text-white"
                    }`}
                  >
                    全部
                  </button>
                  {SPORT_OPTIONS.filter((s) => activeCategories.includes(s.value.toLowerCase())).map((sport) => (
                    <button
                      key={sport.value}
                      onClick={() => toggleSport(sport.value.toLowerCase())}
                      className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition ${
                        filterSports.includes(sport.value.toLowerCase())
                          ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                          : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500 hover:text-white"
                      }`}
                    >
                      {sport.emoji} {sport.labelZh}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest whitespace-nowrap mr-1">狀態</span>
                  <button
                    onClick={() => { setHasInteracted(true); setFilterStatuses([]); }}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition ${
                      filterStatuses.length === 0
                        ? "bg-slate-100 border-slate-200 text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                        : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500 hover:text-white"
                    }`}
                  >
                    全部
                  </button>
                  {[
                    { id: "open",        label: "🟢 公開招募" },
                    { id: "invite_only", label: "🔵 邀請制" },
                    { id: "closed",      label: "🔴 暫停招募" },
                  ].map((status) => (
                    <button
                      key={status.id}
                      onClick={() => toggleStatus(status.id)}
                      className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition ${
                        filterStatuses.includes(status.id)
                          ? "bg-slate-100 border-slate-200 text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                          : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500 hover:text-white"
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex gap-3">
              <div className="relative flex-1 min-w-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">🔍</span>
                <input
                  type="text"
                  placeholder="搜尋團隊名稱或簡介..."
                  value={searchTerm}
                  onChange={(e) => { setHasInteracted(true); setSearchTerm(e.target.value); }}
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <button
                onClick={() => router.push("/team/create")}
                className="shrink-0 flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-black px-5 py-3 rounded-2xl shadow-[0_0_15px_rgba(168,85,247,0.25)] transition-all active:scale-95 whitespace-nowrap"
              >
                <span className="text-base leading-none">＋</span>
                <span className="hidden sm:inline">建立隊伍/團體</span>
              </button>
            </div>
          )}
        </ScrollRevealFilterShell>

        <div>
          {isLoading ? (
            <div className="py-20 text-center text-zinc-500 font-mono text-sm">搜尋各方戰力中...</div>
          ) : isInitialState ? (
            <div className="py-12 md:py-5 text-center animate-fadeIn">
              <h2 className="text-2xl md:text-3xl font-black text-white mb-3">你要尋找哪個項目的團隊？</h2>
              <p className="text-zinc-400 mb-10 max-w-md mx-auto">選擇你想參與或約戰的體育項目</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
                {SPORT_OPTIONS.map((sport) => (
                  <button
                    key={sport.value}
                    onClick={() => toggleSport(sport.value.toLowerCase())}
                    className="bg-slate-900/50 hover:bg-blue-600/20 border border-slate-800 hover:border-blue-500 rounded-2xl p-5 text-center transition duration-300"
                  >
                    <span className="block text-3xl mb-2">{sport.emoji}</span>
                    <span className="block text-sm font-black text-white mb-0.5">{sport.labelZh}</span>
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{sport.labelEn}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-700/50 rounded-3xl py-20 text-center px-4">
              <p className="text-zinc-400 font-bold text-sm">沒有符合條件的團隊。</p>
              <button
                onClick={() => { setSearchTerm(""); setFilterSports([]); setFilterStatuses([]); }}
                className="mt-4 text-sm text-blue-400 hover:text-blue-300 font-bold px-4 py-2 bg-blue-500/10 rounded-lg"
              >
                清除所有篩選
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 px-1 flex justify-between items-center">
                <span className="text-sm font-bold text-zinc-500">
                  顯示 <span className="text-white">{filteredTeams.length}</span> 支隊伍
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 animate-fadeIn">
                {visibleTeams.map((t) => {
                  const sport = getSportOption(t.sport_category);
                  const displayName = t.name_en || t.name_zh || "未命名球隊";
                  const cardTags = buildTeamCardTags(t.sport_metadata);
                  const cardBio = getTeamCardBio(t.sport_metadata);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => openTeamDetail(t.id)}
                      className="bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 rounded-3xl p-6 transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-xl flex flex-col text-left cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="relative shrink-0">
                          <div
                            className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-xl font-black text-zinc-600 bg-cover bg-center"
                            style={{ backgroundImage: t.logo_url ? `url(${t.logo_url})` : "none" }}
                          >
                            {!t.logo_url && (displayName[0] || "T")}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 min-w-0">
                          {sport && (
                            <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black px-3 py-1 rounded-full whitespace-nowrap">
                              {sport.emoji} {sport.labelZh}
                            </span>
                          )}
                          <TeamStatusBadge tag={t.recruitment_status} />
                        </div>
                      </div>

                      <h3 className="text-lg font-black text-white group-hover:text-purple-300 transition line-clamp-2 mb-1">
                        {displayName}
                      </h3>
                      {t.name_zh && t.name_en && (
                        <p className="text-xs text-zinc-500 font-bold mb-2 truncate">{t.name_zh}</p>
                      )}

                      {cardBio ? (
                        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-3">{cardBio}</p>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-1.5 mb-4">
                        {cardTags.map((tag) => (
                          <span
                            key={`${tag.icon}-${tag.label}`}
                            className="bg-slate-950/60 border border-slate-800 text-zinc-300 text-[10px] font-bold px-2.5 py-1 rounded-lg"
                          >
                            {tag.icon} {tag.label}
                          </span>
                        ))}
                        {t.location_region && !isTeamMetaValueEmpty(t.location_region) && (
                          <span className="bg-slate-950/50 border border-slate-800/80 text-zinc-400 text-[10px] font-bold px-2.5 py-1 rounded-lg truncate max-w-[140px]">
                            📍 {t.location_region}
                          </span>
                        )}
                      </div>

                      <div className="mt-auto pt-4 border-t border-slate-800/80">
                        <span className="block w-full text-center bg-slate-800 group-hover:bg-purple-600 text-white text-sm font-black py-2.5 rounded-xl transition duration-300">
                          查看團隊專頁
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <MobileFilterSheet
        isOpen={mobileFilters.isOpen}
        categories={mobileFilterCategories}
        values={mobileFilters.draft}
        onChange={mobileFilters.setDraft}
        onCancel={mobileFilters.cancel}
        onApply={applyMobileFilters}
        accent="purple"
      />

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-8 right-8 bg-purple-600 hover:bg-purple-500 text-white w-12 h-12 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center text-xl z-50 transition-all duration-300 transform ${
          showTopBtn ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"
        }`}
      >
        ↑
      </button>
    </div>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">系統準備中...</div>}>
      <TeamPageContent />
    </Suspense>
  );
}