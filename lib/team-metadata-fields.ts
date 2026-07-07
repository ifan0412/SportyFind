import type { SportCategory } from "@/types/team";

export type MetaFieldType = "text" | "select" | "boolean" | "multiselect";

export interface TeamMetaField {
  key: string;
  label: string;
  type: MetaFieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
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

const TEAM_GENDER_FIELD: TeamMetaField = {
  key: "team_gender",
  label: "隊伍性別組別 (選填)",
  type: "select",
  options: [...TEAM_GENDER_OPTIONS],
};

const COMPETITIVE_FIELDS: TeamMetaField[] = [
  { key: "home_court", label: "主場 / 集合場館 (Home Court)", type: "text", placeholder: "例如：九龍灣體育館" },
  { key: "league_name", label: "聯賽 / 組別 (League)", type: "text", placeholder: "例如：Super League" },
  { key: "division_level", label: "級別 (Division)", type: "text", placeholder: "例如：Div 1 / 甲組" },
  { key: "team_colors", label: "隊伍代表色 (Team Colors)", type: "text", placeholder: "例如：Blue / 藍色" },
  { key: "location_regions", label: "活動地區 (Regions)", type: "multiselect", options: TEAM_REGION_OPTIONS },
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
  let specific: TeamMetaField[] = [];
  if (sport === "volleyball" || sport === "basketball" || sport === "soccer") {
    specific = COMPETITIVE_FIELDS;
  } else if (sport === "tennis" || sport === "badminton" || sport === "pickleball") {
    specific = RACKET_FIELDS;
  } else if (sport === "gym" || sport === "running") {
    specific = ENDURANCE_FIELDS;
  }
  return [TEAM_GENDER_FIELD, ...specific];
}

export const TEAM_META_LABELS: Record<string, string> = {
  team_gender: "隊伍性別",
  home_court: "主場 / 場館",
  league_name: "聯賽 / 組別",
  division_level: "級別",
  team_colors: "隊伍代表色",
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

export function formatTeamMetaValue(key: string, value: string | boolean | number | string[]): string {
  if (key === "team_gender" && typeof value === "string") return TEAM_GENDER_LABELS[value] ?? value;
  if (key === "equipment_provided") return value ? "✅ 是" : "❌ 否";
  if (key === "play_style" && typeof value === "string") return TEAM_PLAY_STYLE_LABELS[value] ?? value;
  if (Array.isArray(value)) return value.join("、");
  return String(value);
}

export function regionsToLocationString(regions: string[]): string | null {
  const clean = regions.filter((r) => !isTeamMetaValueEmpty(r));
  return clean.length > 0 ? clean.join("、") : null;
}

export function cleanTeamMetadata(
  metadata: Record<string, string | boolean | string[]>
): Record<string, string | boolean | string[]> {
  const out: Record<string, string | boolean | string[]> = {};
  for (const [key, value] of Object.entries(metadata)) {
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

/** Compact tags for team list cards (no bio). */
export function buildTeamCardTags(
  metadata: Record<string, unknown> | null | undefined
): TeamDisplayTag[] {
  const m = metadata ?? {};
  const tags: TeamDisplayTag[] = [];

  const push = (icon: string, key: string, label?: string) => {
    const raw = m[key];
    if (isTeamMetaValueEmpty(raw)) return;
    if (typeof raw === "string") {
      tags.push({ icon, label: label ?? formatTeamMetaValue(key, raw) });
    } else if (Array.isArray(raw)) {
      tags.push({ icon, label: raw.join("、") });
    }
  };

  push("👤", "team_gender");
  push("🏅", "division_level");
  push("🏆", "league_name");
  push("📅", "training_frequency");
  push("🏟️", "home_court");
  push("🎨", "team_colors");

  return tags.slice(0, 5);
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
  return Object.entries(metadata).filter(
    ([, v]) => !isTeamMetaValueEmpty(v)
  ) as [string, string | boolean | number | string[]][];
}
