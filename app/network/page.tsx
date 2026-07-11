"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";
import { ListingPageHeader } from "@/components/listing/ListingPageHeader";
import { LISTING_PAGE_MAX_WIDTH, LISTING_PAGE_SHELL_PADDING } from "@/lib/listing-sections";
import { SportFilterModal } from "@/components/SportFilterModal";
import { sportMatchesFilter } from "@/lib/sports-categories";
import {
  getPositionOptionsForSports,
  metadataMatchesPositionFilter,
  positionsFromMetadata,
} from "@/lib/sport-positions";
import { useProfileReturnTo } from "@/lib/use-profile-return-to";
import { type ProfileGender, PROFILE_GENDER_LABELS } from "@/lib/gender";
import { useAuth } from "@/components/SupabaseProvider";
import {
  PlayerNetworkCard,
  type PlayerFriendshipStatus,
} from "@/components/network/PlayerNetworkCard";
import { ListingFilterBar } from "@/components/filters/ListingFilterBar";
import { ScrollRevealFilterShell } from "@/components/filters/ScrollRevealFilterShell";
import { MobileFilterSheet } from "@/components/filters/MobileFilterSheet";
import { useMobileFilterDraft } from "@/components/filters/useMobileFilterDraft";
import {
  countActiveMobileFilters,
  multiSelectCategory,
  singleSelectCategory,
  sportFilterCategory,
} from "@/components/filters/filter-helpers";
import type { MobileFilterValues } from "@/components/filters/types";

interface ProfileRow {
  id: string;
  handle?: string | null;
  full_name: string | null;
  location: string | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  status_tag: string | null;
  gender: ProfileGender | null;
  display_sports: string[] | null;
  height_cm: number | null;
  weight_kg: number | null;
  show_physical_stats: boolean | null;
  age: number | null;
  show_age: boolean | null;
  is_coach: boolean | null;
  coach_status: string | null;
  is_physio: boolean | null;
  physio_status: string | null;
  phone_verified_at?: string | null;
  all_sport_names?: string[];
  user_sports?: { sports?: { name: string } | null; metadata?: Record<string, unknown> }[];
}

type FriendshipMap = Record<string, { status: PlayerFriendshipStatus; friendshipId: string }>;

export default function NetworkPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono text-sm">搜尋體育人才中...</div>}>
      <NetworkPageContent />
    </Suspense>
  );
}

function NetworkPageContent() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { user, isLoading: authLoading } = useAuth();
  const returnTo = useProfileReturnTo();

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [friendshipMap, setFriendshipMap] = useState<FriendshipMap>({});
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterGender, setFilterGender] = useState<"" | ProfileGender>("");
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [isPositionFilterExpanded, setIsPositionFilterExpanded] = useState(false);
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);

  const positionOptions = useMemo(
    () => getPositionOptionsForSports(selectedSports),
    [selectedSports]
  );
  const showPositionFilter = selectedSports.length > 0 && positionOptions.length > 0;

  const appliedMobileFilters: MobileFilterValues = useMemo(
    () => ({
      sports: selectedSports,
      gender: filterGender,
      positions: selectedPositions,
    }),
    [selectedSports, filterGender, selectedPositions]
  );

  const mobileFilters = useMobileFilterDraft(appliedMobileFilters);

  const mobileFilterCategories = useMemo(() => {
    const draftSports = Array.isArray(mobileFilters.draft.sports)
      ? mobileFilters.draft.sports
      : [];
    const draftPosOpts = getPositionOptionsForSports(draftSports);
    const cats = [
      sportFilterCategory("sports", "項目"),
      singleSelectCategory("gender", "性別", [
        { id: "", label: "全部性別" },
        { id: "male", label: `♂ ${PROFILE_GENDER_LABELS.male}` },
        { id: "female", label: `♀ ${PROFILE_GENDER_LABELS.female}` },
      ]),
    ];
    if (draftSports.length > 0 && draftPosOpts.length > 0) {
      cats.push(
        multiSelectCategory(
          "positions",
          "場上位置",
          draftPosOpts.map((p) => ({ id: p, label: p }))
        )
      );
    }
    return cats;
  }, [mobileFilters.draft.sports]);

  const applyMobileFilters = () => {
    const d = mobileFilters.draft;
    const sports = Array.isArray(d.sports) ? d.sports : [];
    setSelectedSports(sports);
    setFilterGender(typeof d.gender === "string" ? (d.gender as "" | ProfileGender) : "");
    setSelectedPositions(Array.isArray(d.positions) ? d.positions : []);
    setIsPositionFilterExpanded(false);
    mobileFilters.close();
  };

  const authUserId = authLoading ? undefined : (user?.id ?? null);

  useEffect(() => {
    if (authUserId === undefined) return;

    let cancelled = false;

    const fetchData = async () => {
      let profilesQuery = supabase
        .from("profiles")
        .select(
          `
          id, full_name, location, headline, bio, avatar_url, status_tag, gender, handle, display_sports, is_coach, coach_status, is_physio, physio_status, phone_verified_at,
          height_cm, weight_kg, show_physical_stats, age, show_age, user_sports (
            metadata,
            sports ( name )
          )
        `
        )
        .or("is_player.is.null,is_player.eq.true")
        .order("full_name", { ascending: true });

      if (authUserId) {
        profilesQuery = profilesQuery.neq("id", authUserId);
      }

      const { data: profilesData, error: profilesError } = await profilesQuery;

      if (cancelled) return;

      if (!profilesError && profilesData) {
        const formattedProfiles = profilesData.map((p: any) => ({
          ...p,
          all_sport_names: p.user_sports?.map((us: any) => us.sports?.name).filter(Boolean) || [],
        }));
        setProfiles(formattedProfiles as ProfileRow[]);
      }

      setIsLoading(false);
    };

    fetchData().catch(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [supabase, authUserId]);

  useEffect(() => {
    if (!authUserId) {
      setFriendshipMap({});
      return;
    }

    let cancelled = false;

    supabase
      .from("friendships")
      .select("id, status, sender_id, receiver_id")
      .or(`sender_id.eq.${authUserId},receiver_id.eq.${authUserId}`)
      .then(({ data }) => {
        if (cancelled) return;
        const map: FriendshipMap = {};
        for (const row of data || []) {
          const peerId = row.sender_id === authUserId ? row.receiver_id : row.sender_id;
          if (row.status === "accepted") {
            map[peerId] = { status: "accepted", friendshipId: row.id };
          } else if (row.status === "pending") {
            map[peerId] = {
              status: row.sender_id === authUserId ? "pending_sent" : "pending_received",
              friendshipId: row.id,
            };
          }
        }
        setFriendshipMap(map);
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, authUserId]);

  const handleFriendshipChange = (
    profileId: string,
    status: PlayerFriendshipStatus,
    friendshipId: string | null
  ) => {
    setFriendshipMap((prev) => {
      const next = { ...prev };
      if (status === "none" || !friendshipId) {
        delete next[profileId];
      } else {
        next[profileId] = { status, friendshipId };
      }
      return next;
    });
  };

  const filteredProfiles = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return profiles.filter((p) => {
      const positionLabels = (p.user_sports || []).flatMap((us) => positionsFromMetadata(us.metadata));
      const matchSearch =
        !q ||
        (p.full_name || "").toLowerCase().includes(q) ||
        (p.location || "").toLowerCase().includes(q) ||
        positionLabels.some((pos) => pos.toLowerCase().includes(q));
      const matchSport =
        selectedSports.length === 0
          ? true
          : (p.all_sport_names || []).some((name) => sportMatchesFilter(name, selectedSports));
      const matchPosition =
        !showPositionFilter || selectedPositions.length === 0
          ? true
          : (p.user_sports || []).some(
              (us) =>
                sportMatchesFilter(us.sports?.name, selectedSports) &&
                metadataMatchesPositionFilter(us.metadata, selectedPositions)
            );
      const matchGender = filterGender ? p.gender === filterGender : true;
      return matchSearch && matchSport && matchPosition && matchGender;
    });
  }, [profiles, searchTerm, selectedSports, selectedPositions, showPositionFilter, filterGender]);

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-blue-500/30 pb-24 relative">
      <div className={`${LISTING_PAGE_MAX_WIDTH} mx-auto px-4 sm:px-6 lg:px-8 ${LISTING_PAGE_SHELL_PADDING}`}>
        <BackButton label="返回首頁" href="/" />

        <ListingPageHeader section="network" />

        <ScrollRevealFilterShell className="mb-6">
        <ListingFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="搜尋運動員或地區..."
          onFilterOpen={mobileFilters.open}
          hasActiveFilters={countActiveMobileFilters(mobileFilterCategories, appliedMobileFilters) > 0}
          accent="blue"
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-3 rounded-3xl mb-6 shadow-lg"
        >
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 md:p-5 rounded-3xl mb-8 shadow-lg flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:flex-1">
              <span className="absolute left-3.5 top-3.5 text-zinc-500">🔍</span>
              <input type="text" placeholder="搜尋運動員名稱或所在地區..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition" />
            </div>

            <button onClick={() => setIsSportModalOpen(true)} className={`w-full md:w-auto flex items-center justify-between gap-3 px-5 py-3 rounded-xl border text-sm font-bold transition flex-shrink-0 cursor-pointer ${selectedSports.length > 0 ? "bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.2)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>
              <span>項目 {selectedSports.length > 0 ? `(${selectedSports.length})` : "(全部)"}</span>
              <span className="text-[10px]">▼</span>
            </button>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden w-full md:w-auto">
              <button onClick={() => setFilterGender("")} className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${!filterGender ? "bg-slate-100 border-slate-200 text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>全部性別</button>
              <button onClick={() => setFilterGender("male")} className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${filterGender === "male" ? "bg-slate-100 border-slate-200 text-black" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>♂ {PROFILE_GENDER_LABELS.male}</button>
              <button onClick={() => setFilterGender("female")} className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${filterGender === "female" ? "bg-slate-100 border-slate-200 text-black" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>♀ {PROFILE_GENDER_LABELS.female}</button>
            </div>
          </div>
        </ListingFilterBar>

        {showPositionFilter && (
          <div className="hidden md:block mt-4 px-1 animate-fadeIn">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setIsPositionFilterExpanded((v) => !v)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition cursor-pointer ${
                  isPositionFilterExpanded || selectedPositions.length > 0
                    ? "bg-blue-600/5 border-b border-slate-800/80"
                    : "hover:bg-slate-900/80"
                }`}
              >
                <span className="text-sm font-bold text-zinc-300">
                  場上位置{" "}
                  <span className={selectedPositions.length > 0 ? "text-blue-400" : "text-zinc-500"}>
                    {selectedPositions.length > 0 ? `(${selectedPositions.length})` : "(全部)"}
                  </span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  {selectedPositions.length > 0 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPositions([]);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedPositions([]);
                        }
                      }}
                      className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition"
                    >
                      清除
                    </span>
                  )}
                  <span className={`text-[10px] text-zinc-500 transition-transform duration-200 ${isPositionFilterExpanded ? "rotate-180" : ""}`}>
                    ▼
                  </span>
                </span>
              </button>

              {isPositionFilterExpanded && (
                <div className="px-4 pb-3.5 pt-3">
                  <div className="flex flex-wrap gap-2">
                    {positionOptions.map((pos) => {
                      const active = selectedPositions.includes(pos);
                      return (
                        <button
                          key={pos}
                          type="button"
                          onClick={() =>
                            setSelectedPositions((prev) =>
                              active ? prev.filter((p) => p !== pos) : [...prev, pos]
                            )
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            active
                              ? "bg-blue-600/20 border-blue-500 text-blue-300"
                              : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"
                          }`}
                        >
                          {pos}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </ScrollRevealFilterShell>

        <div>
          <div className="mb-4 px-1 flex justify-between items-center">
            <span className="text-sm font-bold text-zinc-500">顯示 <span className="text-white">{filteredProfiles.length}</span> 位運動員</span>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-zinc-500 font-mono text-sm">搜尋體育人才中...</div>
          ) : filteredProfiles.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-700/50 rounded-3xl py-20 text-center px-4"><p className="text-zinc-400 font-bold text-sm">沒有符合條件的運動員檔案。</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 animate-fadeIn">
              {filteredProfiles.map((p) => {
                const friendship = friendshipMap[p.id];
                return (
                  <PlayerNetworkCard
                    key={p.id}
                    profile={p}
                    returnTo={returnTo}
                    currentUserId={authUserId ?? null}
                    friendshipStatus={friendship?.status ?? "none"}
                    friendshipId={friendship?.friendshipId ?? null}
                    onFriendshipChange={handleFriendshipChange}
                  />
                );
              })}
            </div>
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
        accent="blue"
      />

      <SportFilterModal isOpen={isSportModalOpen} onClose={() => setIsSportModalOpen(false)} selectedSports={selectedSports} onApply={(sports) => { setSelectedSports(sports); setSelectedPositions([]); setIsPositionFilterExpanded(false); }} />
    </div>
  );
}