"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { filterActiveAnnouncementsForPath } from "@/lib/announcements/active";
import { dismissPopup, isPopupDismissed } from "@/lib/announcements/dismiss";
import type { SitePopupAnnouncement } from "@/lib/announcements/types";
import { SiteAnnouncementPopup } from "@/components/announcements/SiteAnnouncementPopup";

export function SiteAnnouncementHost() {
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [announcements, setAnnouncements] = useState<SitePopupAnnouncement[]>([]);
  const [tempHiddenIds, setTempHiddenIds] = useState<Set<string>>(new Set());
  const [queueIndex, setQueueIndex] = useState(0);

  useEffect(() => {
    setTempHiddenIds(new Set());
    setQueueIndex(0);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("site_popup_announcements")
        .select("*")
        .eq("status", "published");

      if (cancelled || error) return;
      setAnnouncements((data as SitePopupAnnouncement[]) || []);
    };

    load();
    const interval = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [supabase]);

  const eligible = useMemo(() => {
    return filterActiveAnnouncementsForPath(announcements, pathname).filter((a) => {
      if (a.dismiss_mode === "until_end") {
        return !tempHiddenIds.has(a.id);
      }
      return !isPopupDismissed(a.id, a.dismiss_mode);
    });
  }, [announcements, pathname, tempHiddenIds]);

  const current = eligible[queueIndex] ?? null;

  const handleClose = useCallback(() => {
    if (!current) return;

    if (current.dismiss_mode === "until_end") {
      setTempHiddenIds((prev) => new Set(prev).add(current.id));
    } else {
      dismissPopup(current.id, current.dismiss_mode);
    }

    setQueueIndex(0);
  }, [current]);

  useEffect(() => {
    if (queueIndex >= eligible.length) {
      setQueueIndex(0);
    }
  }, [eligible.length, queueIndex]);

  if (!current) return null;

  return <SiteAnnouncementPopup announcement={current} onClose={handleClose} />;
}
