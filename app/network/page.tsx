"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";
import { ListingPageHeader } from "@/components/listing/ListingPageHeader";
import { LISTING_PAGE_MAX_WIDTH } from "@/lib/listing-sections";
import { SportFilterModal } from "@/components/SportFilterModal";
import { sportMatchesFilter } from "@/lib/sports-categories";
import {
  getPositionOptionsForSports,
  metadataMatchesPositionFilter,
  positionsFromMetadata,
} from "@/lib/sport-positions";
import { profileLink } from "@/lib/profile-links";
import { useProfileReturnTo } from "@/lib/use-profile-return-to";
import { truncatePlainBio } from "@/lib/content/body";
import { type ProfileGender, PROFILE_GENDER_LABELS } from "@/lib/gender";
import { GenderAvatarBadge } from "@/components/profile/GenderBadge";

interface ProfileRow {
  id: string;
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
  is_coach: boolean | null;
  coach_status: string | null;
  is_physio: boolean | null;
  physio_status: string | null;
  all_sport_names?: string[];
  user_sports?: { sports?: { name: string } | null; metadata?: Record<string, unknown> }[];
}

function PlayerStatusBadge({ tag }: { tag: string | null }) {
  if (tag === "recruiting")
    return <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap shadow"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 尋找新血</div>;
  if (tag === "seeking_team")
    return <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap shadow"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> 尋找隊伍</div>;
  if (tag === "open_to_match")
    return <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap shadow"><div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> 開放約戰</div>;
  return <div className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 text-zinc-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap shadow"><div className="w-1.5 h-1.5 rounded-full bg-slate-500" /> 穩定狀態</div>;
}

export default function NetworkPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono text-sm">搜尋體育人才中...</div>}>
      <NetworkPageContent />
    </Suspense>
  );
}

function NetworkPageContent() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const returnTo = useProfileReturnTo();

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
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

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || null;

      let profilesQuery = supabase
        .from("profiles")
        .select(
          `
          id, full_name, location, headline, bio, avatar_url, status_tag, gender, display_sports, is_coach, coach_status, is_physio, physio_status,
          height_cm, weight_kg, show_physical_stats, user_sports (
            metadata,
            sports ( name )
          )
        `
        )
        .or("is_player.is.null,is_player.eq.true")
        .order("full_name", { ascending: true });

      if (currentUserId) {
        profilesQuery = profilesQuery.neq("id", currentUserId);
      }

      const { data: profilesData, error: profilesError } = await profilesQuery;

      if (!profilesError && profilesData) {
        const formattedProfiles = profilesData.map((p: any) => ({
          ...p,
          all_sport_names: p.user_sports?.map((us: any) => us.sports?.name).filter(Boolean) || [],
        }));
        setProfiles(formattedProfiles as ProfileRow[]);
      }

      setIsLoading(false);
    };
    fetchData();
  }, [supabase]);

  const filteredProfiles = profiles.filter((p) => {
    const positionLabels = (p.user_sports || []).flatMap((us) => positionsFromMetadata(us.metadata));
    const matchSearch =
      (p.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.location || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      positionLabels.some((pos) => pos.toLowerCase().includes(searchTerm.toLowerCase()));
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

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-blue-500/30 pb-24 relative">
      <div className={`${LISTING_PAGE_MAX_WIDTH} mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10`}>
        <BackButton label="返回首頁" href="/" />

        <ListingPageHeader section="network" />

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

        {showPositionFilter && (
          <div className="mb-6 px-1 animate-fadeIn">
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
              {filteredProfiles.map((p) => (
                <div key={p.id} className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 flex flex-col justify-between transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-2xl relative overflow-hidden">
                  {p.is_coach && p.coach_status !== "hidden" && (
                    <span className="absolute top-4 left-4 z-10 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm flex items-center gap-1.5">
                      🎓 教練
                    </span>
                  )}
                  {p.is_physio && p.physio_status !== "hidden" && (
                    <span className="absolute top-4 right-4 z-10 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm flex items-center gap-1.5">
                      ⚕️ 物理治療
                    </span>
                  )}

                  <div className="flex flex-col items-center text-center mt-4">
                    <div className="relative w-20 h-20 md:w-24 md:h-24 mb-4">
                      <div className="w-full h-full rounded-2xl bg-slate-800 border-2 border-slate-700/60 flex items-center justify-center text-3xl font-black text-zinc-600 overflow-hidden bg-cover bg-center shadow-lg" style={p.avatar_url ? { backgroundImage: `url(${p.avatar_url})` } : undefined}>
                        {!p.avatar_url && (p.full_name?.[0] || "P")}
                      </div>
                      <GenderAvatarBadge gender={p.gender} />
                      <div className="absolute -bottom-3 flex justify-center w-full"><PlayerStatusBadge tag={p.status_tag} /></div>
                    </div>

                    <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition mt-1 truncate max-w-full">{p.full_name || "運動員"}</h3>
                    <p className="text-xs md:text-sm text-blue-400 font-medium truncate max-w-full mb-2">{p.headline || "熱愛運動與交流"}</p>
                    
                    {p.show_physical_stats && (p.height_cm || p.weight_kg) && (
                      <div className="inline-flex items-center justify-center gap-2.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[10px] md:text-xs font-mono text-zinc-400 mb-3 shadow-inner">
                        {p.height_cm && <span>📏 {p.height_cm} cm</span>}
                        {p.weight_kg && <span className={p.height_cm ? "border-l border-slate-700 pl-2.5" : ""}>⚖️ {p.weight_kg} kg</span>}
                      </div>
                    )}

                    {p.location && <div className="inline-flex items-center gap-1 text-[11px] text-zinc-400 bg-slate-950/60 px-3 py-1 rounded-full border border-slate-800/80 mb-3"><span>📍</span> <span className="truncate max-w-[160px]">{p.location}</span></div>}
                    <p className="text-xs text-zinc-300 line-clamp-1 min-h-[1.25rem] leading-relaxed px-2 my-1">
                      {truncatePlainBio(p.bio || "") || "這位運動員很低調，尚未填寫自介。"}
                    </p>
                  </div>

                  <div className="space-y-4 pt-4 mt-2 border-t border-slate-800/80">
                    <div className="flex flex-wrap justify-center gap-1.5 min-h-[1.75rem]">
                      {p.display_sports && p.display_sports.length > 0 ? (
                        p.display_sports.slice(0, 3).map((sport: string) => <span key={sport} className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-950/40 text-blue-300 border border-blue-500/20">{sport}</span>)
                      ) : <span className="text-[10px] text-zinc-600 italic">尚未勾選專項</span>}
                    </div>
                    <Link href={profileLink(p.id, returnTo)} className="block w-full py-2.5 rounded-xl bg-slate-800 hover:bg-blue-600 text-zinc-200 hover:text-white text-xs font-black text-center transition duration-200 shadow active:scale-95">查看完整檔案</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SportFilterModal isOpen={isSportModalOpen} onClose={() => setIsSportModalOpen(false)} selectedSports={selectedSports} onApply={(sports) => { setSelectedSports(sports); setSelectedPositions([]); setIsPositionFilterExpanded(false); }} />
    </div>
  );
}