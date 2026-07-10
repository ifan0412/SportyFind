/** Canonical sport categories — single source of truth for tags, filters, teams, services */

export type SportCategoryId =
  | "volleyball"
  | "basketball"
  | "soccer"
  | "tennis"
  | "badminton"
  | "pickleball"
  | "gym"
  | "running"
  | "boxing"
  | "yoga";

export interface SportCategoryDef {
  id: SportCategoryId;
  emoji: string;
  labelZh: string;
  labelEn: string;
}

export const SPORT_CATEGORIES: SportCategoryDef[] = [
  { id: "volleyball", emoji: "🏐", labelZh: "排球", labelEn: "VOLLEYBALL" },
  { id: "basketball", emoji: "🏀", labelZh: "籃球", labelEn: "BASKETBALL" },
  { id: "soccer", emoji: "⚽", labelZh: "足球", labelEn: "SOCCER" },
  { id: "tennis", emoji: "🎾", labelZh: "網球", labelEn: "TENNIS" },
  { id: "badminton", emoji: "🏸", labelZh: "羽毛球", labelEn: "BADMINTON" },
  { id: "pickleball", emoji: "🏓", labelZh: "匹克球", labelEn: "PICKLEBALL" },
  { id: "gym", emoji: "🏋️", labelZh: "健身", labelEn: "GYM" },
  { id: "running", emoji: "🏃", labelZh: "路跑", labelEn: "RUNNING" },
  { id: "boxing", emoji: "🥊", labelZh: "拳擊", labelEn: "BOXING" },
  { id: "yoga", emoji: "🧘", labelZh: "瑜伽", labelEn: "YOGA" },
];

export const SPORT_CATEGORY_IDS = SPORT_CATEGORIES.map((s) => s.id);

const BY_ID = Object.fromEntries(SPORT_CATEGORIES.map((s) => [s.id, s])) as Record<
  SportCategoryId,
  SportCategoryDef
>;

/** Map legacy DB / free-text values → canonical slug */
const LEGACY_ALIASES: Record<string, SportCategoryId> = {
  volleyball: "volleyball",
  排球: "volleyball",
  basketball: "basketball",
  籃球: "basketball",
  soccer: "soccer",
  football: "soccer",
  足球: "soccer",
  "soccer / football": "soccer",
  "football / soccer": "soccer",
  tennis: "tennis",
  網球: "tennis",
  badminton: "badminton",
  羽毛球: "badminton",
  pickleball: "pickleball",
  匹克球: "pickleball",
  gym: "gym",
  fitness: "gym",
  健身: "gym",
  "gym / fitness": "gym",
  running: "running",
  marathon: "running",
  路跑: "running",
  "running / marathon": "running",
  boxing: "boxing",
  拳擊: "boxing",
  yoga: "yoga",
  瑜伽: "yoga",
  // Title-case legacy (sports table / old coach rows)
  Volleyball: "volleyball",
  Basketball: "basketball",
  Tennis: "tennis",
  Badminton: "badminton",
  Pickleball: "pickleball",
  "Soccer / Football": "soccer",
  "Football / Soccer": "soccer",
  "Running / Marathon": "running",
  "Gym / Fitness": "gym",
};

export function normalizeSportCategory(
  raw: string | null | undefined
): SportCategoryId | null {
  if (!raw?.trim()) return null;
  const key = raw.trim();
  const lower = key.toLowerCase();
  if (BY_ID[lower as SportCategoryId]) return lower as SportCategoryId;
  if (LEGACY_ALIASES[key]) return LEGACY_ALIASES[key];
  if (LEGACY_ALIASES[lower]) return LEGACY_ALIASES[lower];
  return null;
}

export function getSportCategory(raw: string | null | undefined): SportCategoryDef | null {
  const id = normalizeSportCategory(raw);
  return id ? BY_ID[id] : null;
}

export function sportCategoryLabelZh(raw: string | null | undefined): string {
  return getSportCategory(raw)?.labelZh ?? raw ?? "";
}

export function sportCategoryLabelEn(raw: string | null | undefined): string {
  return getSportCategory(raw)?.labelEn ?? (raw ?? "").toUpperCase();
}

export function sportMatchesFilter(
  serviceCategory: string | null | undefined,
  filterIds: string[]
): boolean {
  if (!filterIds.length) return true;
  const id = normalizeSportCategory(serviceCategory);
  if (!id) return false;
  return filterIds.includes(id);
}
