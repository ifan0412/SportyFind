"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AthleteCard } from "@/components/ui/AthleteCard";
import { FilterDropdown } from "@/components/ui/FilterDropdown";

// ==========================================
// Types
// ==========================================
interface Sport {
  id: string;
  name: string;
}

interface UserSport {
  sport_id: string;
  metadata: { position?: string; [key: string]: unknown };
  sports: { name: string } | null;
}

interface AthleteProfile {
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

const INTENT_OPTIONS = [
  { id: "ALL", name: "👥 All Athletes", value: "ALL" },
  { id: "open_to_team", name: "🟢 Open to Team", value: "open_to_team" },
  { id: "looking_for_sub", name: "🟡 Available as Sub", value: "looking_for_sub" },
  { id: "COACH", name: "🏆 Certified Coaches", value: "COACH" },
];

const PAGE_SIZE = 12;

// ==========================================
// Main Component
// ==========================================
function NetworkPageContent() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [activeIntentTab, setActiveIntentTab] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination whenever filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, selectedSports, activeIntentTab]);

  // ==========================================
  // Data Fetching
  // ==========================================
  const {
    data: athletes = [],
    isLoading: isLoadingAthletes,
    isError: isAthletesError,
  } = useQuery({
    queryKey: ["athletes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          headline,
          bio,
          location,
          avatar_url,
          is_coach,
          coach_rate,
          status_tag,
          user_sports (
            sport_id,
            metadata,
            sports (name)
          )
        `)
        .order("updated_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as AthleteProfile[];
    },
    staleTime: 60_000,
  });

  const {
    data: allSports = [],
    isLoading: isLoadingSports,
    isError: isSportsError,
  } = useQuery({
    queryKey: ["sports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sports")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as Sport[];
    },
  });

  const isLoading = isLoadingAthletes || isLoadingSports;
  const isError = isAthletesError || isSportsError;

  // ==========================================
  // Filter Engine
  // ==========================================
  const filteredAthletes = useMemo(() => {
    const q = searchQuery.toLowerCase();

    return athletes.filter((item) => {
      const matchQ =
        q === "" ||
        item.full_name?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        item.headline?.toLowerCase().includes(q);

      const matchS =
        selectedSports.length === 0 ||
        item.user_sports?.some(
          (us) => us.sports?.name && selectedSports.includes(us.sports.name)
        );

      let matchI = true;
      if (activeIntentTab === "open_to_team")
        matchI = item.status_tag === "open_to_team";
      if (activeIntentTab === "looking_for_sub")
        matchI = item.status_tag === "looking_for_sub";
      if (activeIntentTab === "COACH") matchI = item.is_coach === true;

      return matchQ && matchS && matchI;
    });
  }, [athletes, searchQuery, selectedSports, activeIntentTab]);

  const displayedAthletes = filteredAthletes.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAthletes.length;
  const remaining = filteredAthletes.length - visibleCount;

  const handleReset = () => {
    setSearchQuery("");
    setSelectedSports([]);
    setActiveIntentTab("ALL");
  };

  const handleSportToggle = (val: string) => {
    setSelectedSports((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
    );
  };

  // ==========================================
  // Render States
  // ==========================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 space-y-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-bold">Loading athlete network...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 space-y-3 px-4">
        <span className="text-4xl">⚠️</span>
        <p className="text-white font-bold text-lg">Something went wrong</p>
        <p className="text-slate-400 text-sm text-center">
          Could not load athlete data. Please check your connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition"
        >
          Retry
        </button>
      </div>
    );
  }

  // ==========================================
  // Main UI
  // ==========================================
  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 font-sans pb-24 antialiased selection:bg-blue-600 selection:text-white">

      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/40 pt-10 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-blue-400 font-black text-[10px] tracking-widest uppercase bg-blue-950 border border-blue-800/60 px-2.5 py-1 rounded">
              PRO DIRECTORY
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2.5">
              Athlete & Coach Network
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Discover athletes and coaches in Hong Kong
            </p>
          </div>
          <div className="text-left md:text-right font-mono">
            <span className="text-2xl font-black text-blue-400">
              {filteredAthletes.length}
            </span>
            <span className="text-xs text-slate-500 ml-1.5 font-bold font-sans">
              {filteredAthletes.length === 1 ? "athlete found" : "athletes found"}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">

        {/* Filter Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, sport, or location..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pl-11 pr-4 py-3.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition font-bold"
            />
            <span className="absolute left-4 top-3.5 text-slate-500 text-sm">
              🔍
            </span>
          </div>

          {/* Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-1">

            {/* Sport Filter */}
            <div className="lg:col-span-5">
              <FilterDropdown
                label="Sport (multi-select)"
                displayText={
                  selectedSports.length === 0
                    ? "🏆 All Sports"
                    : `🏆 ${selectedSports.length} sport${selectedSports.length > 1 ? "s" : ""} selected`
                }
                options={allSports}
                selectedValues={selectedSports}
                isMultiSelect={true}
                onToggle={handleSportToggle}
              />
            </div>

            {/* Intent Filter */}
            <div className="lg:col-span-5">
              <FilterDropdown
                label="Availability & License"
                displayText={
                  INTENT_OPTIONS.find((o) => o.value === activeIntentTab)
                    ?.name ?? "👥 All Athletes"
                }
                options={INTENT_OPTIONS}
                selectedValues={[activeIntentTab]}
                isMultiSelect={false}
                onToggle={(val) => setActiveIntentTab(val)}
              />
            </div>

            {/* Reset */}
            <div className="lg:col-span-2 flex items-end">
              <button
                onClick={handleReset}
                className="w-full bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 h-[46px] cursor-pointer"
              >
                <span>↺</span> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Athlete Grid */}
        {athletes.length === 0 ? (
          // Database is genuinely empty
          <div className="py-24 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl space-y-3">
            <p className="text-4xl">🏟️</p>
            <p className="text-white font-bold text-lg">No athletes yet</p>
            <p className="text-slate-400 text-sm">
              Be the first to create a profile and join the network!
            </p>
          </div>
        ) : filteredAthletes.length === 0 ? (
          // Filters returned no results
          <div className="py-24 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl space-y-3">
            <p className="text-4xl">🔍</p>
            <p className="text-white font-bold text-lg">No athletes match your filters</p>
            <p className="text-slate-400 text-sm">
              Try adjusting your search or filters
            </p>
            <button
              onClick={handleReset}
              className="mt-2 px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg transition"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {displayedAthletes.map((athlete) => (
                <AthleteCard
                  key={athlete.id}
                  card={athlete}
                  onClick={() => router.push(`/p/${athlete.id}`)}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-6 pb-12">
                <button
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="bg-slate-900 hover:bg-slate-800 text-blue-400 font-bold py-3.5 px-8 rounded-full transition-all shadow-lg shadow-blue-900/20 border border-slate-700 hover:border-blue-500 flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-lg">↓</span>
                  <span>Load more athletes</span>
                  <span className="text-slate-500 ml-1">
                    ({remaining} remaining)
                  </span>
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