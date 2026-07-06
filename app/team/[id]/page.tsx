"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SportCategory, RecruitmentStatus } from "@/types/team";
import { SPORT_CATEGORIES } from "@/lib/sports-categories";

interface TeamData {
  id: string;
  name_en: string;
  name_zh: string | null;
  sport_category: SportCategory;
  recruitment_status: RecruitmentStatus;
  est_year: number | null;
  location_region: string | null;
  logo_url: string | null;
  cover_url: string | null;
  bio: string | null;
  social_links: { phone?: string; email?: string; ig?: string; fb?: string; youtube?: string } | null;
  sport_metadata: Record<string, string | boolean | number | string[]> | null;
}

interface MemberProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface TeamMemberRow {
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: MemberProfile | null;
}

interface Achievement {
  id: string;
  year: number;
  title: string;
  description: string | null;
}

const SPORT_OPTIONS = SPORT_CATEGORIES.map((s) => ({
  value: s.id as SportCategory,
  emoji: s.emoji,
  label: s.labelEn.charAt(0) + s.labelEn.slice(1).toLowerCase(),
  labelZh: s.labelZh,
}));

const META_LABELS: Record<string, string> = {
  league_name:        "聯賽 / 組別",
  location_regions:   "活動地區",
  training_frequency: "訓練頻率",
  avg_skill_level:    "技術水平",
  play_style:         "比賽形式",
  court_surface:      "場地類型",
  equipment_provided: "提供器材",
  primary_focus:      "訓練重點",
  home_base:          "集合地點",
  avg_pace:           "平均配速",
  required_gear:      "必備裝備",
};

const PLAY_STYLE_LABELS: Record<string, string> = {
  singles: "單打 Singles",
  doubles: "雙打 Doubles",
  mixed:   "混雙 Mixed",
  all:     "皆可 All",
};

function formatMetaValue(key: string, value: string | boolean | number | string[]): string {
  if (key === "equipment_provided") return value ? "✅ 是" : "❌ 否";
  if (key === "play_style" && typeof value === "string") return PLAY_STYLE_LABELS[value] ?? value;
  if (Array.isArray(value)) return value.join("、");
  return String(value);
}

function isMetaValueEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function RecruitBadge({ status }: { status: RecruitmentStatus }) {
  const map: Record<RecruitmentStatus, { cls: string; label: string }> = {
    open:        { cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", label: "🟢 公開招募" },
    invite_only: { cls: "bg-blue-500/10 border-blue-500/30 text-blue-400",         label: "🔵 邀請制" },
    closed:      { cls: "bg-slate-800 border-slate-700 text-zinc-500",             label: "🔴 暫停招募" },
  };
  const { cls, label } = map[status] || map.open;
  return (
    <span className={`inline-flex items-center border text-[10px] font-black px-3 py-1 rounded-full tracking-widest ${cls}`}>
      {label}
    </span>
  );
}

function Avatar({ src, name, size = "md" }: { src: string | null; name: string | null; size?: "sm" | "md" | "lg" }) {
  const dim = { sm: "w-9 h-9 text-sm", md: "w-12 h-12 text-base", lg: "w-20 h-20 text-3xl" }[size];
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <div
      className={`${dim} rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center font-black text-zinc-400 overflow-hidden flex-shrink-0 bg-cover bg-center`}
      style={{ backgroundImage: src ? `url(${src})` : undefined }}
    >
      {!src && initials}
    </div>
  );
}

function roleBadge(role: string) {
  if (role === "admin")   return <span className="text-[10px] font-black text-amber-400  bg-amber-500/10  border border-amber-500/20  px-2 py-0.5 rounded-full">管理員</span>;
  if (role === "coach")   return <span className="text-[10px] font-black text-blue-400   bg-blue-500/10   border border-blue-500/20   px-2 py-0.5 rounded-full">教練</span>;
  if (role === "captain") return <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">隊長</span>;
  if (role === "pending") return <span className="text-[10px] font-black text-zinc-500   bg-slate-800     border border-slate-700     px-2 py-0.5 rounded-full">待審核</span>;
  return null;
}

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [team, setTeam] = useState<TeamData | null>(null);
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [joinState, setJoinState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("teams").select("*").eq("id", id).single(),
      supabase
        .from("team_members")
        .select("team_id, user_id, role, joined_at, profiles(id, full_name, avatar_url, bio)")
        .eq("team_id", id),
      supabase
        .from("team_achievements")
        .select("id, year, title, description")
        .eq("team_id", id)
        .order("year", { ascending: false }),
      supabase.auth.getUser(),
    ]).then(([{ data: teamData }, { data: membersData }, { data: achData }, { data: authData }]) => {
      if (teamData) setTeam(teamData as TeamData);
      if (membersData) setMembers(membersData as unknown as TeamMemberRow[]);
      if (achData)     setAchievements(achData as Achievement[]);
      setCurrentUserId(authData?.user?.id ?? null);
      setIsLoading(false);
    });
  }, [id, supabase]);

  const myMembership = members.find((m) => m.user_id === currentUserId);
  const isAdmin   = myMembership?.role === "admin";
  const isMember  = !!myMembership && myMembership.role !== "pending";
  const isPending = myMembership?.role === "pending";

  const adminsAndLeads = members.filter((m) => ["admin", "coach", "captain"].includes(m.role));
  const regularMembers = members.filter((m) => m.role === "player");

  // 🔥 修正版：加入 team_id 欄位
  const handleJoin = async () => {
    if (!currentUserId) { router.push("/auth"); return; }
    setJoinState("loading");
    setJoinError(null);

    // 1. 寫入加入請求
    const { error: insertError } = await supabase
      .from("team_members")
      .insert({ team_id: id, user_id: currentUserId, role: "pending" });

    if (insertError) {
      setJoinError(insertError.message);
      setJoinState("error");
      return;
    }

    // 2. 發送通知給 Admin
    const adminMember = members.find(m => m.role === "admin");
    if (adminMember) {
      await supabase.from("notifications").insert({
        user_id: adminMember.user_id,
        sender_id: currentUserId,
        type: "team_join_request",
        team_id: id,
        is_read: false
      });
    }

    setJoinState("done");
    setMembers((prev) => [
      ...prev,
      { team_id: id, user_id: currentUserId, role: "pending", joined_at: new Date().toISOString(), profiles: null },
    ]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono text-sm">
        載入戰隊資訊中...
      </div>
    );
  }
  if (!team) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-400 font-bold">找不到團隊</p>
        <Link href="/team" className="text-sm text-blue-400 hover:underline">← 返回團隊列表</Link>
      </div>
    );
  }

  const sport       = SPORT_OPTIONS.find((s) => s.value.toLowerCase() === team.sport_category.toLowerCase());
  const displayName = team.name_en || team.name_zh || "Unnamed";

  const metaEntries = Object.entries(team.sport_metadata ?? {}).filter(
    ([, v]) => !isMetaValueEmpty(v)
  ) as [string, string | boolean | number | string[]][];

  const socialLinks = team.social_links ?? {};
  const hasContactInfo = socialLinks.phone || socialLinks.email || socialLinks.ig || socialLinks.fb || socialLinks.youtube;

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-blue-500/30 pb-24">
      <div
        className="w-full h-44 md:h-56 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden"
        style={team.cover_url ? { backgroundImage: `url(${team.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
      </div>

      <div className="w-full max-w-4xl md:max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="-mt-36 md:-mt-44 mb-6 relative z-30">
          <Link
            href="/team"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 text-sm font-black text-amber-400 hover:text-amber-300 backdrop-blur-md transition shadow-lg"
          >
            ← 返回團隊列表
          </Link>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 mb-8 mt-4 relative z-20 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
            <div
              className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-4xl font-black text-zinc-500 flex-shrink-0 overflow-hidden bg-cover bg-center shadow-lg"
              style={team.logo_url ? { backgroundImage: `url(${team.logo_url})` } : undefined}
            >
              {!team.logo_url && (displayName[0] || "T")}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-black text-white leading-tight truncate">{displayName}</h1>
              {team.name_zh && team.name_en && (
                <p className="text-sm text-zinc-400 font-bold mt-0.5">{team.name_zh}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {sport && (
                  <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black px-3 py-1 rounded-full">
                    {sport.emoji} {sport.labelZh} {sport.label}
                  </span>
                )}
                <RecruitBadge status={team.recruitment_status} />
                {team.est_year && (
                  <span className="text-[10px] text-zinc-500 font-bold bg-slate-800 border border-slate-700 px-3 py-1 rounded-full">
                    📅 {team.est_year} 年成立
                  </span>
                )}
                {team.location_region && (
                  <span className="text-[10px] text-zinc-500 font-bold bg-slate-800 border border-slate-700 px-3 py-1 rounded-full">
                    📍 {team.location_region}
                  </span>
                )}
              </div>
            </div>

            <div className="sm:ml-auto flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
              {isAdmin ? (
                <Link
                  href={`/team/${id}/admin`}
                  className="block text-center sm:inline-block bg-amber-600 hover:bg-amber-500 text-white text-sm font-black px-6 py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(217,119,6,0.3)] active:scale-95"
                >
                  ⚙️ 管理團隊
                </Link>
              ) : isMember ? (
                <span className="block text-center sm:inline-block bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-black px-5 py-3.5 rounded-xl">
                  ✅ 您是成員
                </span>
              ) : isPending ? (
                <span className="block text-center sm:inline-block bg-slate-800 border border-slate-700 text-zinc-400 text-sm font-black px-5 py-3.5 rounded-xl">
                  ⏳ 申請審核中
                </span>
              ) : team.recruitment_status === "open" ? (
                joinState === "done" ? (
                  <span className="block text-center sm:inline-block bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-black px-5 py-3.5 rounded-xl">
                    ✅ 申請已送出！
                  </span>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={joinState === "loading"}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-black px-6 py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95"
                  >
                    {joinState === "loading" ? "送出中..." : "🚀 申請加入群組"}
                  </button>
                )
              ) : null}
            </div>
          </div>

          {joinError && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl p-3">
              ❌ {joinError}
            </div>
          )}
        </div>

        {/* ── 1. Bio & Contact Info ── */}
        {(team.bio || hasContactInfo) && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 mb-6">
            {team.bio && (
              <div className={hasContactInfo ? "mb-6 pb-6 border-b border-slate-800/80" : ""}>
                <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">關於我們</h2>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{team.bio}</p>
              </div>
            )}

            {/* ✅ 渲染聯絡資訊區塊 */}
            {hasContactInfo && (
              <div>
                <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">聯絡與社群資訊</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {socialLinks.phone && (
                    <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800/80 px-4 py-3 rounded-2xl">
                      <span className="text-xl">📞</span>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase">聯絡電話 / WhatsApp</p>
                        <p className="text-sm font-black text-white">{socialLinks.phone}</p>
                      </div>
                    </div>
                  )}
                  {socialLinks.email && (
                    <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800/80 px-4 py-3 rounded-2xl">
                      <span className="text-xl">✉️</span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase">公開聯絡 Email</p>
                        <a href={`mailto:${socialLinks.email}`} className="text-sm font-black text-amber-400 hover:underline truncate block">{socialLinks.email}</a>
                      </div>
                    </div>
                  )}
                </div>

                {(socialLinks.ig || socialLinks.fb || socialLinks.youtube) && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-800/80">
                    {socialLinks.ig && (
                      <a href={socialLinks.ig} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-slate-950/50 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 rounded-full px-4 py-1.5 text-xs font-bold text-zinc-300 hover:text-white transition">
                        📷 Instagram
                      </a>
                    )}
                    {socialLinks.fb && (
                      <a href={socialLinks.fb} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-slate-950/50 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 rounded-full px-4 py-1.5 text-xs font-bold text-zinc-300 hover:text-white transition">
                        👥 Facebook
                      </a>
                    )}
                    {socialLinks.youtube && (
                      <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-slate-950/50 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 rounded-full px-4 py-1.5 text-xs font-bold text-zinc-300 hover:text-white transition">
                        ▶️ YouTube
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {achievements.length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 mb-6">
            <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-6">🏆 成就與榮譽榜</h2>
            <div className="relative">
              <div className="absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-amber-500/40 via-slate-700 to-transparent" />
              <div className="space-y-5 pl-10">
                {achievements.map((ach) => (
                  <div key={ach.id} className="relative">
                    <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-slate-950 shadow-[0_0_8px_rgba(217,119,6,0.6)]" />
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl px-5 py-4">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                          {ach.year}
                        </span>
                        <h3 className="text-sm font-black text-white">{ach.title}</h3>
                      </div>
                      {ach.description && (
                        <p className="text-xs text-zinc-400 leading-relaxed">{ach.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {metaEntries.length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 mb-6">
            <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">
              {sport?.emoji} 群組規格資訊
            </h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              {metaEntries.map(([key, value]) => (
                <div key={key} className="flex flex-col gap-0.5 min-w-0">
                  <dt className="text-[10px] font-black text-zinc-600 uppercase tracking-wider truncate">
                    {META_LABELS[key] ?? key}
                  </dt>
                  <dd className="text-sm font-bold text-white leading-snug break-words">
                    {formatMetaValue(key, value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {members.filter((m) => m.role !== "pending").length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 mb-6">
            <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-6">群組成員</h2>

            {adminsAndLeads.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] font-black text-amber-400/80 uppercase tracking-widest mb-3 pl-1">管理員與領隊</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {adminsAndLeads.map((m) => (
                    <div key={m.user_id} className="flex items-center gap-3 bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-3">
                      <Avatar src={m.profiles?.avatar_url ?? null} name={m.profiles?.full_name ?? null} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white truncate">{m.profiles?.full_name ?? "成員"}</p>
                        {roleBadge(m.role)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {regularMembers.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 pl-1">
                  群組成員 ({regularMembers.length})
                </p>
                <div className="flex flex-wrap gap-3">
                  {regularMembers.map((m) => (
                    <div key={m.user_id} className="flex items-center gap-2 bg-slate-950/50 border border-slate-800 rounded-full pl-1.5 pr-4 py-1.5">
                      <Avatar src={m.profiles?.avatar_url ?? null} name={m.profiles?.full_name ?? null} size="sm" />
                      <span className="text-xs font-bold text-zinc-300 whitespace-nowrap">
                        {m.profiles?.full_name ?? "成員"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}