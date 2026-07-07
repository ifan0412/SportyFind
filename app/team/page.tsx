"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";
import { ListingPageHeader } from "@/components/listing/ListingPageHeader";
import { LISTING_PAGE_MAX_WIDTH } from "@/lib/listing-sections";
import type { SportCategory } from "@/types/team";
import { SPORT_CATEGORIES } from "@/lib/sports-categories";
import {
  TEAM_META_LABELS,
  TEAM_GENDER_LABELS,
  formatTeamMetaValue,
  buildTeamCardTags,
  isTeamMetaValueEmpty,
  listFilledTeamMetaEntries,
  metadataSearchText,
} from "@/lib/team-metadata-fields";
import { stripHtml } from "@/lib/content/body";

const SPORT_OPTIONS: { value: SportCategory; emoji: string; label: string; labelZh: string }[] = SPORT_CATEGORIES.map((s) => ({
  value: s.id as SportCategory,
  emoji: s.emoji,
  label: s.labelZh,
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
  const urlSport = searchParams?.get("sport")?.toLowerCase() || "";

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [teams, setTeams] = useState<TeamProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(!!urlSport);

  const [searchTerm, setSearchTerm] = useState("");
  // 🔥 關鍵修正：直接同步 URL 帶過來的 sport 參數
  const [filterSports, setFilterSports] = useState<string[]>(urlSport ? [urlSport] : []);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);

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

  // 監聽網址參數變化（當使用者在該頁面點擊 Navbar 其他運動時自動變更篩選）
  useEffect(() => {
    if (urlSport) {
      setFilterSports([urlSport]);
      setHasInteracted(true);
    }
  }, [urlSport]);

  const activeCategories = useMemo(
    () => [...new Set(teams.map((t) => t.sport_category.toLowerCase()))],
    [teams]
  );

  const filteredTeams = teams.filter((t) => {
    const name = t.name_en || t.name_zh || "";
    const metaText = metadataSearchText(t.sport_metadata);
    const bioText = stripHtml(t.bio ?? "");
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bioText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      metaText.includes(searchTerm.toLowerCase());
    
    // 🔥 統一轉小寫精準比對
    const matchesSport =
      filterSports.length === 0 || filterSports.includes(t.sport_category.toLowerCase());
    const matchesStatus =
      filterStatuses.length === 0 || filterStatuses.includes(t.recruitment_status);
    return matchesSearch && matchesSport && matchesStatus;
  });

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

  if (!isMounted) {
    return (
      <div className="bg-slate-950 min-h-screen flex items-center justify-center text-zinc-500 font-mono text-sm">
        系統載入中...
      </div>
    );
  }

  const isInitialState = !hasInteracted && searchTerm === "";

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-blue-500/30 pb-24 relative">
      <div className={`${LISTING_PAGE_MAX_WIDTH} mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10`}>
        <BackButton label="返回上一頁" />

        <ListingPageHeader section="team" />

        <div className="flex gap-3 mb-6">
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
            className="flex-shrink-0 flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-black px-5 py-3 rounded-2xl shadow-[0_0_15px_rgba(217,119,6,0.25)] transition-all active:scale-95 whitespace-nowrap"
          >
            <span className="text-base leading-none">＋</span>
            <span className="hidden sm:inline">Create Team</span>
          </button>
        </div>

        {!isInitialState && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-3xl mb-8 relative z-30 shadow-lg space-y-4 animate-fadeIn">
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
        )}

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
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{sport.label}</span>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 animate-fadeIn">
                {visibleTeams.map((t) => {
                  const sport = getSportOption(t.sport_category);
                  const displayName = t.name_en || t.name_zh || "Unnamed Team";
                  const cardTags = buildTeamCardTags(t.sport_metadata);
                  return (
                    <div
                      key={t.id}
                      className="bg-slate-900/50 border border-slate-800 hover:border-slate-600 rounded-2xl p-6 flex flex-col items-center text-center transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-xl relative overflow-hidden"
                    >
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 opacity-0 group-hover:opacity-100 transition duration-300" />
                      <div className="relative w-20 h-20 md:w-24 md:h-24 mb-5 mt-2">
                        <div
                          className="w-full h-full rounded-2xl bg-slate-800 border-2 border-slate-700/50 overflow-hidden flex items-center justify-center text-3xl font-black text-zinc-600 bg-cover bg-center shadow-inner"
                          style={{ backgroundImage: t.logo_url ? `url(${t.logo_url})` : "none" }}
                        >
                          {!t.logo_url && (displayName[0] || "T")}
                        </div>
                        <div className="absolute -bottom-3 flex justify-center w-full">
                          <TeamStatusBadge tag={t.recruitment_status} />
                        </div>
                      </div>

                      <h3 className="text-lg font-black text-white tracking-tight mb-0.5 truncate w-full">{displayName}</h3>
                      {t.name_zh && t.name_en && (
                        <p className="text-xs text-zinc-500 font-bold mb-2">{t.name_zh}</p>
                      )}

                      {cardTags.length > 0 ? (
                        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-5 min-h-[2rem]">
                          {cardTags.map((tag) => (
                            <span
                              key={`${tag.icon}-${tag.label}`}
                              className="bg-slate-950/60 border border-slate-800 text-zinc-300 text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-lg"
                            >
                              {tag.icon} {tag.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mb-5 min-h-[2rem]" />
                      )}

                      <div className="flex flex-wrap items-center justify-center gap-2 mb-6 w-full">
                        {t.location_region && !isTeamMetaValueEmpty(t.location_region) && (
                          <div className="bg-slate-950/50 border border-slate-800/80 text-zinc-400 text-xs font-bold px-3 py-1.5 rounded-lg truncate max-w-[140px]">
                            📍 {t.location_region}
                          </div>
                        )}
                        {sport && (
                          <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-black px-3 py-1.5 rounded-lg">
                            {sport.emoji} {sport.labelZh}
                          </div>
                        )}
                      </div>

                      <div className="mt-auto w-full pt-4 border-t border-slate-800/80">
                        <Link
                          href={`/team/${t.id}`}
                          className="block w-full bg-slate-800 hover:bg-amber-600 text-white text-sm font-black py-3 rounded-xl transition duration-300"
                        >
                          查看團隊專頁
                        </Link>
                      </div>
                    </div>
                  );
                })}
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

export default function TeamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">系統準備中...</div>}>
      <TeamPageContent />
    </Suspense>
  );
}