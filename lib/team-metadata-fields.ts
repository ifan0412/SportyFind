import type { SportCategory } from "@/types/team";
import { HK_DISTRICT_BY_ID, LEGACY_LOCATION_TO_DISTRICTS, getDistrictLabel } from "@/lib/hk-locations";

export type MetaFieldType = "text" | "select" | "boolean";

export interface TeamMetaField {
  key: string;
  label: string;
  type: MetaFieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  maxLength?: number;
}

export const TEAM_REGION_OPTIONS = [
  { value: "全港", label: "🌐 全港 All HK" },
  { value: "港島", label: "🏙️ 港島 Hong Kong Island" },
  { value: "九龍", label: "🌆 九龍 Kowloon" },
  { value: "新界", label: "🏞️ 新界 New Territories" },
];

export const TEAM_GENDER_OPTIONS = [
  { value: "men", label: "男子 Men" },
  { value: "women", label: "女子 Women" },
  { value: "mixed", label: "混合 Mixed" },
] as const;

export type TeamGender = (typeof TEAM_GENDER_OPTIONS)[number]["value"];

export const TEAM_CARD_BIO_MAX = 50;

const COMPETITIVE_FIELDS: TeamMetaField[] = [
  { key: "home_court", label: "主場 / 集合場館 (Home Court)", type: "text", placeholder: "例如：九龍灣體育館" },
  {
    key: "league_division",
    label: "聯賽 / 級別 (League & Division)",
    type: "text",
    placeholder: "例如：Super League · 甲一",
  },
  { key: "training_frequency", label: "訓練頻率", type: "text", placeholder: "例如：Saturday / 每週六" },
];

const RACKET_FIELDS: TeamMetaField[] = [
  { key: "avg_skill_level", label: "平均技術水平", type: "text", placeholder: "例如：NTRP 3.0-4.0 / 初中級" },
  {
    key: "play_style",
    label: "比賽形式",
    type: "select",
    options: [
      { value: "singles", label: "單打 Singles" },
      { value: "doubles", label: "雙打 Doubles" },
      { value: "mixed", label: "混雙 Mixed" },
      { value: "all", label: "皆可 All" },
    ],
  },
  { key: "court_surface", label: "場地類型", type: "text", placeholder: "例如：硬地 / 室內木地板" },
  { key: "equipment_provided", label: "提供公用器材 (球/羽毛球等)", type: "boolean" },
];

const ENDURANCE_FIELDS: TeamMetaField[] = [
  { key: "primary_focus", label: "訓練重點", type: "text", placeholder: "例如：健力三項 / 馬拉松配速" },
  { key: "home_base", label: "集合地點", type: "text", placeholder: "例如：Anytime Fitness 尖沙咀 / 跑馬地" },
  { key: "avg_pace", label: "平均配速", type: "text", placeholder: "例如：5:30/km" },
  { key: "required_gear", label: "必備裝備", type: "text", placeholder: "例如：反光背心" },
];

export function getTeamMetaFields(sport: SportCategory | ""): TeamMetaField[] {
  const cardBioField: TeamMetaField = {
    key: "card_bio",
    label: "卡片簡介 (Card Bio)",
    type: "text",
    placeholder: "一句話介紹隊伍，顯示於列表卡片",
    maxLength: TEAM_CARD_BIO_MAX,
  };

  let specific: TeamMetaField[] = [];
  if (sport === "volleyball" || sport === "basketball" || sport === "soccer") {
    specific = COMPETITIVE_FIELDS;
  } else if (sport === "tennis" || sport === "badminton" || sport === "pickleball") {
    specific = RACKET_FIELDS;
  } else if (sport === "gym" || sport === "running") {
    specific = ENDURANCE_FIELDS;
  }

  const withoutDuplicateBio = specific.filter((f) => f.key !== "card_bio");
  return [cardBioField, ...withoutDuplicateBio];
}

export const TEAM_META_LABELS: Record<string, string> = {
  team_gender: "隊伍性別",
  home_court: "主場 / 場館",
  league_division: "聯賽 / 級別",
  league_name: "聯賽 / 組別",
  division_level: "級別",
  card_bio: "卡片簡介",
  location_regions: "活動地區",
  training_frequency: "訓練頻率",
  avg_skill_level: "技術水平",
  play_style: "比賽形式",
  court_surface: "場地類型",
  equipment_provided: "提供器材",
  primary_focus: "訓練重點",
  home_base: "集合地點",
  avg_pace: "平均配速",
  required_gear: "必備裝備",
};

export const TEAM_GENDER_LABELS: Record<string, string> = {
  men: "男子",
  women: "女子",
  mixed: "混合",
};

export const TEAM_PLAY_STYLE_LABELS: Record<string, string> = {
  singles: "單打 Singles",
  doubles: "雙打 Doubles",
  mixed: "混雙 Mixed",
  all: "皆可 All",
};

const EMPTY_STRINGS = new Set(["", "n/a", "na", "none", "null", "-", "—"]);

export function isTeamMetaValueEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") {
    const t = value.trim().toLowerCase();
    return EMPTY_STRINGS.has(t);
  }
  if (Array.isArray(value)) return value.length === 0 || value.every((v) => isTeamMetaValueEmpty(v));
  if (typeof value === "boolean") return !value;
  if (typeof value === "number" && Number.isNaN(value)) return true;
  return false;
}

/** Migrate legacy competitive keys before save/display. */
export function normalizeTeamMetadata(
  metadata: Record<string, string | boolean | string[]>
): Record<string, string | boolean | string[]> {
  const out: Record<string, string | boolean | string[]> = { ...metadata };

  if (isTeamMetaValueEmpty(out.league_division)) {
    const league = typeof out.league_name === "string" ? out.league_name.trim() : "";
    const division = typeof out.division_level === "string" ? out.division_level.trim() : "";
    const merged = [league, division].filter(Boolean).join(" · ");
    if (merged) out.league_division = merged;
  }
  delete out.league_name;
  delete out.division_level;
  delete out.team_colors;

  if (typeof out.card_bio === "string") {
    out.card_bio = out.card_bio.trim().slice(0, TEAM_CARD_BIO_MAX);
  }

  return out;
}

export function getTeamCardBio(metadata: Record<string, unknown> | null | undefined): string {
  const raw = metadata?.card_bio;
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, TEAM_CARD_BIO_MAX);
}

export function formatTeamMetaValue(key: string, value: string | boolean | number | string[]): string {
  if (key === "location_regions" && Array.isArray(value)) {
    return value
      .map((id) => (HK_DISTRICT_BY_ID[id] ? getDistrictLabel(id, "zh") : String(id)))
      .join("、");
  }
  if (key === "location_subdistricts" && Array.isArray(value)) {
    return value.join("、");
  }
  if (key === "team_gender" && typeof value === "string") return TEAM_GENDER_LABELS[value] ?? value;
  if (key === "equipment_provided") return value ? "✅ 是" : "❌ 否";
  if (key === "play_style" && typeof value === "string") return TEAM_PLAY_STYLE_LABELS[value] ?? value;
  if (Array.isArray(value)) return value.join("、");
  return String(value);
}

export function regionsToLocationString(regions: string[]): string | null {
  const clean = regions.filter((r) => !isTeamMetaValueEmpty(r));
  if (!clean.length) return null;
  const labels = clean.map((r) => (HK_DISTRICT_BY_ID[r] ? getDistrictLabel(r, "zh") : r));
  return labels.join("、");
}

export function prepareTeamLocationForForm(
  locationRegion: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined
): { districts: string[]; subdistricts: string[] } {
  const rawSubs = metadata?.location_subdistricts;
  const subdistricts = Array.isArray(rawSubs)
    ? rawSubs.filter((s): s is string => typeof s === "string" && !isTeamMetaValueEmpty(s))
    : [];
  return {
    districts: teamLocationToDistrictIds(locationRegion, metadata),
    subdistricts,
  };
}

/** Activity regions stored on a team (metadata array or legacy location_region string). */
export function getTeamLocationRegions(
  locationRegion: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined
): string[] {
  const meta = metadata?.location_regions;
  if (Array.isArray(meta)) {
    return meta.filter((r): r is string => typeof r === "string" && !isTeamMetaValueEmpty(r));
  }
  if (locationRegion && !isTeamMetaValueEmpty(locationRegion)) {
    return locationRegion
      .split(/[、,]/)
      .map((s) => s.trim())
      .filter((s) => !isTeamMetaValueEmpty(s));
  }
  return [];
}

export function teamLocationToDistrictIds(
  locationRegion: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined
): string[] {
  const teamRegions = getTeamLocationRegions(locationRegion, metadata);
  if (!teamRegions.length) return [];

  const districtIds = new Set<string>();
  for (const region of teamRegions) {
    if (HK_DISTRICT_BY_ID[region]) {
      districtIds.add(region);
      continue;
    }
    const mapped = LEGACY_LOCATION_TO_DISTRICTS[region];
    if (mapped) mapped.forEach((id) => districtIds.add(id));
  }
  return [...districtIds];
}

export function teamMatchesRegionFilter(
  locationRegion: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined,
  filterDistrictIds: string[]
): boolean {
  if (!filterDistrictIds.length) return true;
  const teamRegions = getTeamLocationRegions(locationRegion, metadata);
  if (!teamRegions.length) return false;
  if (teamRegions.includes("全港")) return true;
  const teamDistricts = teamLocationToDistrictIds(locationRegion, metadata);
  if (!teamDistricts.length) return false;
  return filterDistrictIds.some((id) => teamDistricts.includes(id));
}

export function cleanTeamMetadata(
  metadata: Record<string, string | boolean | string[]>
): Record<string, string | boolean | string[]> {
  const normalized = normalizeTeamMetadata(metadata);
  const out: Record<string, string | boolean | string[]> = {};
  for (const [key, value] of Object.entries(normalized)) {
    if (isTeamMetaValueEmpty(value)) continue;
    if (typeof value === "string") {
      out[key] = value.trim();
    } else if (Array.isArray(value)) {
      const arr = value.filter((v) => !isTeamMetaValueEmpty(v));
      if (arr.length > 0) out[key] = arr;
    } else {
      out[key] = value;
    }
  }
  return out;
}

export type TeamDisplayTag = { icon: string; label: string };

/** Compact tags for team list cards (no bio / location / sport — those are rendered separately). */
export function buildTeamCardTags(
  metadata: Record<string, unknown> | null | undefined
): TeamDisplayTag[] {
  const m = metadata ?? {};
  const tags: TeamDisplayTag[] = [];

  const league =
    typeof m.league_division === "string" && !isTeamMetaValueEmpty(m.league_division)
      ? m.league_division.trim()
      : [m.league_name, m.division_level]
          .filter((v): v is string => typeof v === "string" && !isTeamMetaValueEmpty(v))
          .join(" · ");
  if (league) tags.push({ icon: "🏅", label: league });

  const training = m.training_frequency;
  if (typeof training === "string" && !isTeamMetaValueEmpty(training)) {
    tags.push({ icon: "📅", label: training });
  }

  const home = m.home_court;
  if (typeof home === "string" && !isTeamMetaValueEmpty(home)) {
    tags.push({ icon: "🏟️", label: home });
  }

  return tags.slice(0, 4);
}

export function metadataSearchText(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata) return "";
  return Object.entries(metadata)
    .filter(([, v]) => !isTeamMetaValueEmpty(v))
    .flatMap(([, v]) => (Array.isArray(v) ? v : [String(v)]))
    .join(" ")
    .toLowerCase();
}

export function listFilledTeamMetaEntries(
  metadata: Record<string, unknown> | null | undefined
): [string, string | boolean | number | string[]][] {
  if (!metadata) return [];
  const normalized = normalizeTeamMetadata(
    metadata as Record<string, string | boolean | string[]>
  );
  const hidden = new Set(["card_bio", "league_name", "division_level", "team_colors", "location_subdistricts", "team_gender"]);
  return Object.entries(normalized).filter(
    ([key, v]) => !hidden.has(key) && !isTeamMetaValueEmpty(v)
  ) as [string, string | boolean | number | string[]][];
}
