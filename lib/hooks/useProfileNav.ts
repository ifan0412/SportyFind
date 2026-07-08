"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ProfileNavData } from "@/components/NavbarProfileMenu";

const EMPTY: ProfileNavData = { is_coach: false, is_physio: false, adminTeams: [] };

export function useProfileNav(userId: string | undefined) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [profileNav, setProfileNav] = useState<ProfileNavData>(EMPTY);

  const fetchProfileNav = useCallback(
    async (uid: string) => {
      const [{ data: prof }, { data: teamRows }] = await Promise.all([
        supabase.from("profiles").select("is_coach, is_physio").eq("id", uid).maybeSingle(),
        supabase
          .from("team_members")
          .select("teams(id, name_en, name_zh)")
          .eq("user_id", uid)
          .eq("role", "admin"),
      ]);

      const adminTeams = (teamRows ?? [])
        .map((row) => {
          const team = row.teams as unknown as {
            id: string;
            name_en: string | null;
            name_zh: string | null;
          } | null;
          if (!team?.id) return null;
          return {
            id: team.id,
            name: team.name_zh || team.name_en || "我的團隊",
          };
        })
        .filter((t): t is { id: string; name: string } => t !== null);

      setProfileNav({
        is_coach: !!prof?.is_coach,
        is_physio: !!prof?.is_physio,
        adminTeams,
      });
    },
    [supabase]
  );

  useEffect(() => {
    if (!userId) {
      setProfileNav(EMPTY);
      return;
    }
    fetchProfileNav(userId).catch(() => {});
  }, [userId, fetchProfileNav]);

  return profileNav;
}
