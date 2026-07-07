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

export function positionsFromMetadata(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") return [];
  const m = metadata as Record<string, unknown>;
  if (Array.isArray(m.positions)) {
    return m.positions.filter((v): v is string => typeof v === "string" && v.length > 0);
  }
  if (typeof m.position === "string" && m.position.trim()) {
    return [m.position.trim()];
  }
  return [];
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
        out.positions = cleaned;
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
      out[field.key] = positionsFromMetadata(m);
    } else if (typeof m[field.key] === "string") {
      out[field.key] = m[field.key] as string;
    } else {
      out[field.key] = "";
    }
  }
  return out;
}
