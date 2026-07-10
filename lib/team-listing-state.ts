export type TeamDetailBackTarget = "profile" | "listing";

export interface TeamListingState {
  hasInteracted: boolean;
  filterSports: string[];
  filterStatuses: string[];
  filterRegions: string[];
  searchTerm: string;
}

const LISTING_KEY = "sportyfind-team-listing";
const BACK_KEY = "sportyfind-team-detail-back";

export function saveTeamListingState(state: TeamListingState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(LISTING_KEY, JSON.stringify(state));
}

export function readTeamListingState(): TeamListingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LISTING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TeamListingState;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      hasInteracted: !!parsed.hasInteracted,
      filterSports: Array.isArray(parsed.filterSports) ? parsed.filterSports : [],
      filterStatuses: Array.isArray(parsed.filterStatuses) ? parsed.filterStatuses : [],
      filterRegions: Array.isArray(parsed.filterRegions) ? parsed.filterRegions : [],
      searchTerm: typeof parsed.searchTerm === "string" ? parsed.searchTerm : "",
    };
  } catch {
    return null;
  }
}

export function clearTeamListingState() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(LISTING_KEY);
}

export function setTeamDetailBack(target: TeamDetailBackTarget) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(BACK_KEY, target);
}

export function readTeamDetailBack(): TeamDetailBackTarget {
  if (typeof window === "undefined") return "listing";
  return sessionStorage.getItem(BACK_KEY) === "profile" ? "profile" : "listing";
}

export function buildTeamListingHref(): string {
  return "/team";
}
