"use client";

import { toast } from "sonner";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, User as UserIcon } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { profileLink } from "@/lib/profile-links";
import { reopenOrSendFriendRequest } from "@/lib/friendships";
import { truncatePlainBio } from "@/lib/content/body";
import { type ProfileGender } from "@/lib/gender";
import { GenderAvatarBadge } from "@/components/profile/GenderBadge";
import { CoachRoleLabel, PhysioRoleLabel } from "@/components/profile/RoleBadges";
import { ProfilePhysicalStatsRow } from "@/components/profile/ProfilePhysicalStatsRow";
import { SportCategoryBadge } from "@/components/sports/SportCategoryBadge";
import { getSportCategory } from "@/lib/sports-categories";
import { cn } from "@/lib/utils";

export type PlayerFriendshipStatus = "none" | "pending_sent" | "pending_received" | "accepted";

export interface PlayerNetworkCardProfile {
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
  age: number | null;
  show_age: boolean | null;
  is_coach: boolean | null;
  coach_status: string | null;
  is_physio: boolean | null;
  physio_status: string | null;
  all_sport_names?: string[];
}

function PlayerStatusBadge({ tag }: { tag: string | null }) {
  if (tag === "recruiting")
    return (
      <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 尋找新血
      </span>
    );
  if (tag === "seeking_team")
    return (
      <span className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> 尋找隊伍
      </span>
    );
  if (tag === "open_to_match")
    return (
      <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> 開放約戰
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 text-zinc-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> 穩定狀態
    </span>
  );
}

function displaySports(profile: PlayerNetworkCardProfile): string[] {
  const fromDisplay = profile.display_sports?.filter(Boolean) ?? [];
  if (fromDisplay.length > 0) return fromDisplay;
  return profile.all_sport_names?.filter(Boolean) ?? [];
}

const AVATAR_PX = 88; // 5.5rem

function nameSizeClass(name: string | null | undefined): string {
  const len = (name || "").length;
  if (len > 22) return "text-sm";
  if (len > 14) return "text-base";
  return "text-lg";
}

function bioSizeClass(bio: string): string {
  if (bio.length > 90) return "text-[10px] leading-snug";
  if (bio.length > 45) return "text-[11px] leading-snug";
  return "text-xs leading-relaxed";
}

interface PlayerNetworkCardProps {
  profile: PlayerNetworkCardProfile;
  returnTo: string;
  currentUserId: string | null;
  friendshipStatus?: PlayerFriendshipStatus;
  friendshipId?: string | null;
  onFriendshipChange?: (
    profileId: string,
    status: PlayerFriendshipStatus,
    friendshipId: string | null
  ) => void;
}

export function PlayerNetworkCard({
  profile,
  returnTo,
  currentUserId,
  friendshipStatus = "none",
  friendshipId = null,
  onFriendshipChange,
}: PlayerNetworkCardProps) {
  const router = useRouter();
  const [friendLoading, setFriendLoading] = useState(false);
  const sports = displaySports(profile);
  const bioText = truncatePlainBio(profile.bio || "");

  const handleFriendAction = async () => {
    if (!currentUserId) {
      router.push("/auth");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    setFriendLoading(true);

    try {
      if (friendshipStatus === "accepted" || friendshipStatus === "pending_sent") {
        if (!friendshipId) return;
        const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
        if (error) throw error;
        onFriendshipChange?.(profile.id, "none", null);
        window.dispatchEvent(new CustomEvent("sync-friendship"));
        return;
      }

      if (friendshipStatus === "pending_received") {
        if (!friendshipId) return;
        const { error } = await supabase
          .from("friendships")
          .update({ status: "accepted" })
          .eq("id", friendshipId);
        if (error) throw error;
        onFriendshipChange?.(profile.id, "accepted", friendshipId);
        window.dispatchEvent(new CustomEvent("sync-friendship"));
        return;
      }

      const { friendshipId: newId, error } = await reopenOrSendFriendRequest(
        supabase,
        currentUserId,
        profile.id
      );
      if (error) throw error;
      onFriendshipChange?.(profile.id, "pending_sent", newId);
      window.dispatchEvent(new CustomEvent("sync-friendship"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "發生未知錯誤";
      toast.error(`操作失敗: ${message}`);
    } finally {
      setFriendLoading(false);
    }
  };

  const friendButtonLabel = (() => {
    if (friendLoading) return "處理中...";
    if (friendshipStatus === "accepted") return "✓ 已加好友";
    if (friendshipStatus === "pending_sent") return "⏳ 已發送";
    if (friendshipStatus === "pending_received") return "✓ 接受請求";
    return "+ 加好友";
  })();

  const friendButtonClass = cn(
    "py-2.5 rounded-xl font-black text-xs text-center transition flex items-center justify-center gap-1 disabled:opacity-60",
    friendshipStatus === "none" || friendshipStatus === "pending_received"
      ? "bg-blue-600 hover:bg-blue-500 text-white"
      : "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-zinc-300 hover:text-white"
  );

  return (
    <div className="bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-6 flex flex-col justify-between transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-2xl min-h-[280px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 min-h-[28px]">
          <PlayerStatusBadge tag={profile.status_tag} />
          <div className="flex items-center gap-1.5 shrink-0">
            {profile.is_coach && profile.coach_status !== "hidden" && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <CoachRoleLabel />
              </span>
            )}
            {profile.is_physio && profile.physio_status !== "hidden" && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <PhysioRoleLabel />
              </span>
            )}
          </div>
        </div>

        <div
          className="grid items-start gap-x-3"
          style={{ gridTemplateColumns: `minmax(0, 1fr) ${AVATAR_PX}px` }}
        >
          <div className="min-w-0">
            <h3
              className={cn(
                "font-black text-white group-hover:text-blue-400 transition leading-tight line-clamp-2 break-words",
                nameSizeClass(profile.full_name)
              )}
            >
              {profile.full_name || "運動員"}
            </h3>
            {profile.headline ? (
              <p className="text-xs text-blue-400 font-medium line-clamp-2 break-words mt-0.5 leading-snug">
                {profile.headline}
              </p>
            ) : null}

            <div className="mt-2 space-y-2">
              <ProfilePhysicalStatsRow
                age={profile.age}
                showAge={profile.show_age}
                heightCm={profile.height_cm}
                weightKg={profile.weight_kg}
                showPhysicalStats={profile.show_physical_stats}
                className="!justify-start w-fit max-w-full"
              />

              {sports.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {sports.slice(0, 3).map((sport) =>
                    getSportCategory(sport) ? (
                      <SportCategoryBadge key={sport} category={sport} variant="blue" size="xs" />
                    ) : (
                      <span
                        key={sport}
                        className="inline-flex items-center gap-1 rounded-full font-black uppercase border tracking-wider text-[10px] px-2 py-0.5 bg-blue-500/15 text-blue-400 border-blue-500/30"
                      >
                        {sport}
                      </span>
                    )
                  )}
                </div>
              ) : null}

              {profile.location ? (
                <span className="inline-flex max-w-full items-center gap-1 text-[10px] font-bold text-zinc-300 bg-slate-950/60 px-2.5 py-1 rounded-full border border-slate-800">
                  <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="truncate">{profile.location}</span>
                </span>
              ) : null}

              {bioText ? (
                <p className={cn("text-zinc-400 line-clamp-2 break-words", bioSizeClass(bioText))}>
                  {bioText}
                </p>
              ) : null}
            </div>
          </div>

          <Link
            href={profileLink(profile.id, returnTo)}
            className="relative shrink-0 justify-self-end group/avatar"
          >
            <div
              className="rounded-full bg-slate-800 bg-cover bg-center border-2 border-slate-700 flex items-center justify-center overflow-hidden"
              style={{
                width: AVATAR_PX,
                height: AVATAR_PX,
                ...(profile.avatar_url ? { backgroundImage: `url(${profile.avatar_url})` } : {}),
              }}
            >
              {!profile.avatar_url && <UserIcon className="w-8 h-8 text-zinc-500" />}
            </div>
            <GenderAvatarBadge gender={profile.gender} />
          </Link>
        </div>
      </div>

      <div className="pt-4 mt-5 border-t border-slate-800/80 grid grid-cols-2 gap-2.5">
        <Link
          href={profileLink(profile.id, returnTo)}
          className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-zinc-200 hover:text-white font-bold text-xs text-center transition"
        >
          查看檔案
        </Link>
        <button
          type="button"
          onClick={handleFriendAction}
          disabled={friendLoading || currentUserId === profile.id}
          className={friendButtonClass}
        >
          {friendButtonLabel}
        </button>
      </div>
    </div>
  );
}
