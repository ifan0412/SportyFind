import { getSportSchema, type FieldDef } from "@/constants/sportsSchema";
import { normalizeSportCategory } from "@/lib/sports-categories";

export const BALL_SPORT_SLUGS = ["volleyball", "basketball", "soccer", "pickleball"] as const;

export function getPositionField(sportNameOrSlug: string | null | undefined): FieldDef | null {
  const schema = getSportSchema(sportNameOrSlug);
  return schema.find((f) => f.key === "positions" || f.key === "position") ?? null;
}

export function getPositionOptionsForSport(sportNameOrSlug: string | null | undefined): string[] {
  const field = getPositionField(sportNameOrSlug);
  return field?.options ?? [];
}

export function getPositionOptionsForSports(sportSlugs: string[]): string[] {
  const all: string[] = [];
  for (const slug of sportSlugs) {
    all.push(...getPositionOptionsForSport(slug));
  }
  return [...new Set(all)];
}

export function positionsFromMetadata(
  metadata: unknown,
  sportSlug?: string | null
): string[] {
  if (!metadata || typeof metadata !== "object") return [];
  const m = metadata as Record<string, unknown>;
  if (Array.isArray(m.positions)) {
    return m.positions.filter((v): v is string => typeof v === "string" && v.length > 0);
  }
  if (typeof m.position === "string" && m.position.trim()) {
    return [m.position.trim()];
  }
  if (typeof m.positions === "string" && m.positions.trim()) {
    const raw = m.positions.trim();
    if (sportSlug) {
      const options = getPositionOptionsForSport(sportSlug);
      const matched = options.filter((opt) => raw.includes(opt));
      if (matched.length) return matched;
    }
    if (raw.includes("、")) {
      return raw.split("、").map((s) => s.trim()).filter(Boolean);
    }
    return [raw];
  }
  return [];
}

function matchSelectOption(value: unknown, options?: string[]): string {
  if (value == null) return "";
  const text = String(value).trim();
  if (!text || !options?.length) return text;
  if (options.includes(text)) return text;
  const lower = text.toLowerCase();
  const found = options.find((opt) => opt.toLowerCase() === lower);
  return found ?? text;
}

export function formatMetadataFieldValue(
  val: unknown,
  field?: FieldDef | null,
  sportSlug?: string | null
): string | string[] {
  if (field?.multi || Array.isArray(val)) {
    if (Array.isArray(val)) {
      return val.filter((v): v is string => typeof v === "string" && v.length > 0);
    }
    return positionsFromMetadata({ positions: val }, sportSlug);
  }
  if (val == null) return "";
  return String(val);
}

export function listSportMetadataEntries(
  metadata: Record<string, unknown> | null | undefined,
  sportNameOrSlug: string | null | undefined
): { key: string; label: string; value: string | string[] }[] {
  const slug = sportSlugFromName(sportNameOrSlug) ?? sportNameOrSlug ?? "";
  const schema = getSportSchema(slug);
  const m = normalizeMetadataKeys(metadata || {});
  const schemaKeys = new Set(schema.map((f) => f.key));

  const fromSchema = schema
    .map((field) => {
      const raw = m[field.key];
      if (raw == null || raw === "") return null;
      if (Array.isArray(raw) && raw.length === 0) return null;
      return {
        key: field.key,
        label: field.label,
        value: formatMetadataFieldValue(raw, field, slug),
      };
    })
    .filter((row): row is { key: string; label: string; value: string | string[] } => row !== null);

  const extras = Object.entries(m)
    .filter(([key, val]) => !schemaKeys.has(key) && val != null && val !== "")
    .map(([key, val]) => ({
      key,
      label: key.replace(/_/g, " "),
      value: formatMetadataFieldValue(val, null, slug),
    }));

  return [...fromSchema, ...extras];
}

function normalizeMetadataKeys(metadata: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(metadata)) {
    const normalizedKey = key.toLowerCase();
    const existing = out[normalizedKey];
    if (existing == null || existing === "") {
      out[normalizedKey] = val;
      continue;
    }
    if (Array.isArray(val) && val.length > 0) {
      out[normalizedKey] = val;
    }
  }
  return out;
}

export function metadataMatchesPositionFilter(metadata: unknown, selectedPositions: string[]): boolean {
  if (!selectedPositions.length) return true;
  const playerPositions = positionsFromMetadata(metadata);
  return selectedPositions.some((p) => playerPositions.includes(p));
}

export function sportSlugFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  return normalizeSportCategory(name);
}

export function sportFormHasEmptyFields(
  data: Record<string, string | string[]>,
  sportSlug: string
): boolean {
  const schema = getSportSchema(sportSlug);
  for (const field of schema) {
    if (field.multi) {
      const arr = Array.isArray(data[field.key]) ? (data[field.key] as string[]) : [];
      if (!arr.length) return true;
    } else {
      const val = (data[field.key] as string) || "";
      if (!val.trim()) return true;
    }
  }
  return false;
}

export function normalizeSportMetadataForSave(
  data: Record<string, string | string[]>,
  sportSlug: string
): Record<string, unknown> {
  const schema = getSportSchema(sportSlug);
  const out: Record<string, unknown> = {};

  for (const field of schema) {
    const raw = data[field.key];
    if (field.multi) {
      const arr = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
      const cleaned = arr.map((s) => s.trim()).filter(Boolean);
      if (cleaned.length) {
        out[field.key] = cleaned;
        if (field.key === "positions") {
          out.positions = cleaned;
        }
      }
      continue;
    }
    const val = Array.isArray(raw) ? raw.join("、") : (raw ?? "").trim();
    if (val) out[field.key] = val;
  }

  return out;
}

export function sportFormDataFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  sportSlug: string
): Record<string, string | string[]> {
  const schema = getSportSchema(sportSlug);
  const m = metadata || {};
  const out: Record<string, string | string[]> = {};

  for (const field of schema) {
    if (field.multi) {
      const arr = positionsFromMetadata(m, sportSlug);
      const options = field.options ?? [];
      if (!options.length) {
        out[field.key] = arr;
        continue;
      }
      out[field.key] = arr.map((item) => {
        if (options.includes(item)) return item;
        const byCase = options.find((o) => o.toLowerCase() === item.toLowerCase());
        return byCase ?? item;
      });
    } else {
      const raw = m[field.key];
      if (typeof raw === "string" || typeof raw === "number") {
        out[field.key] = matchSelectOption(raw, field.options);
      } else {
        out[field.key] = "";
      }
    }
  }
  return out;
}
