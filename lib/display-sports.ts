import {
  normalizeSportCategory,
  type SportCategoryId,
} from "@/lib/sports-categories";

type UserSportLike = {
  sports?: { name: string } | null;
};

/** Normalize a single stored display value → canonical slug (or drop). */
export function normalizeDisplaySportSlug(
  raw: string | null | undefined
): SportCategoryId | null {
  return normalizeSportCategory(raw);
}

/** Normalize a list for badges / filters — drops unknown legacy values like "SWIMMING". */
export function normalizeDisplaySportSlugs(
  displaySports: string[] | null | undefined
): SportCategoryId[] {
  const seen = new Set<SportCategoryId>();
  const out: SportCategoryId[] = [];
  for (const raw of displaySports ?? []) {
    const slug = normalizeDisplaySportSlug(raw);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= 3) break;
  }
  return out;
}

/**
 * Resolve sports to show on profile cards.
 * - Keeps only slugs the user still has in user_sports
 * - Drops stale/invalid tags (e.g. old "SWIMMING")
 * - Backfills from user_sports when invalid entries were removed
 */
export function resolveProfileDisplaySports(
  displaySports: string[] | null | undefined,
  userSports: UserSportLike[]
): SportCategoryId[] {
  const userSlugsOrdered = userSports
    .map((us) => normalizeDisplaySportSlug(us.sports?.name))
    .filter((s): s is SportCategoryId => s !== null);

  const userSlugSet = new Set(userSlugsOrdered);

  const fromDisplay = normalizeDisplaySportSlugs(displaySports).filter((slug) =>
    userSlugSet.has(slug)
  );

  const rawCount = (displaySports ?? []).filter(Boolean).length;
  const hadInvalidOrStale =
    rawCount > fromDisplay.length ||
    (displaySports ?? []).some((raw) => !normalizeDisplaySportSlug(raw));

  if (fromDisplay.length === 0) {
    return userSlugsOrdered.slice(0, 3);
  }

  if (hadInvalidOrStale && fromDisplay.length < 3) {
    const seen = new Set(fromDisplay);
    for (const slug of userSlugsOrdered) {
      if (fromDisplay.length >= 3) break;
      if (!seen.has(slug)) {
        fromDisplay.push(slug);
        seen.add(slug);
      }
    }
  }

  return fromDisplay.slice(0, 3);
}

/** Persistable slugs for profiles.display_sports (max 3). */
export function displaySportsForSave(
  displaySports: string[] | null | undefined
): SportCategoryId[] {
  return normalizeDisplaySportSlugs(displaySports);
}

/** Compare stored display value with a user_sports row. */
export function displaySportMatchesUserSport(
  stored: string,
  sportName: string | null | undefined
): boolean {
  const storedSlug = normalizeDisplaySportSlug(stored);
  const sportSlug = normalizeDisplaySportSlug(sportName);
  if (storedSlug && sportSlug) return storedSlug === sportSlug;
  return stored === (sportName ?? "");
}

/** Toggle slug in display list (max 3, canonical slugs only). */
export function toggleDisplaySportSlug(
  current: string[],
  sportName: string
): SportCategoryId[] {
  const slug = normalizeDisplaySportSlug(sportName);
  if (!slug) return normalizeDisplaySportSlugs(current);

  const slugs = normalizeDisplaySportSlugs(current);
  if (slugs.includes(slug)) {
    return slugs.filter((s) => s !== slug);
  }
  if (slugs.length >= 3) {
    return [...slugs.slice(1), slug];
  }
  return [...slugs, slug];
}
