import type { SitePopupAnnouncement } from "@/lib/announcements/types";

export function normalizePathname(pathname: string): string {
  if (pathname === "/") return "/";
  return pathname.replace(/\/$/, "") || "/";
}

export function pathMatchesTarget(pathname: string, targetPages: string[]): boolean {
  const path = normalizePathname(pathname);
  return targetPages.some((target) => normalizePathname(target) === path);
}

export function isAnnouncementActive(
  announcement: SitePopupAnnouncement,
  now: Date = new Date()
): boolean {
  if (announcement.status !== "published") return false;

  const nowMs = now.getTime();
  const startsMs = announcement.starts_at
    ? new Date(announcement.starts_at).getTime()
    : null;
  const endsMs = announcement.ends_at
    ? new Date(announcement.ends_at).getTime()
    : null;

  if (announcement.activation_mode === "manual") {
    if (!announcement.is_live) return false;
    if (startsMs !== null && startsMs > nowMs) return false;
    if (endsMs !== null && endsMs <= nowMs) return false;
    return true;
  }

  if (startsMs === null || startsMs > nowMs) return false;
  if (endsMs !== null && endsMs <= nowMs) return false;
  return true;
}

export function filterActiveAnnouncementsForPath(
  announcements: SitePopupAnnouncement[],
  pathname: string,
  now: Date = new Date()
): SitePopupAnnouncement[] {
  return announcements
    .filter(
      (a) =>
        pathMatchesTarget(pathname, a.target_pages) && isAnnouncementActive(a, now)
    )
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
}
