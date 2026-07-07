/** Physio treatment / service categories (not sport categories) */

export const PHYSIO_SERVICE_TYPES = [
  "運動復健",
  "傷患評估",
  "手法治療",
  "痛症管理",
  "術後復康",
  "體能訓練",
  "貼紮服務",
  "其他診療",
] as const;

export type PhysioServiceType = (typeof PHYSIO_SERVICE_TYPES)[number];

/** Normalize DB array or legacy single service_type string */
export function normalizePhysioServiceTypes(
  types: unknown,
  legacySingle?: string | null
): string[] {
  if (Array.isArray(types)) {
    const filtered = types.filter((t): t is string => typeof t === "string" && t.length > 0);
    if (filtered.length) return [...new Set(filtered)];
  }
  if (legacySingle?.trim()) return [legacySingle.trim()];
  return [];
}

/** Unique types across multiple services (e.g. for physio listing cards) */
export function aggregatePhysioServiceTypes(
  services: { service_types?: unknown; service_type?: string | null }[]
): string[] {
  const all: string[] = [];
  for (const srv of services) {
    all.push(...normalizePhysioServiceTypes(srv.service_types, srv.service_type));
  }
  return [...new Set(all)];
}

/** Profile-level service tags (array column or legacy text) */
export function normalizePhysioProfileTags(
  tags: unknown,
  legacyText?: string | null
): string[] {
  const fromArray = normalizePhysioServiceTypes(tags);
  if (fromArray.length) return fromArray;
  if (legacyText?.trim()) {
    return [
      ...new Set(
        legacyText
          .split(/[,、，]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      ),
    ];
  }
  return [];
}

/** Merge profile tags with per-service types for listing cards */
export function physioCardServiceTags(
  profileTags: unknown,
  legacyText: string | null | undefined,
  services: { service_types?: unknown; service_type?: string | null }[]
): string[] {
  const profile = normalizePhysioProfileTags(profileTags, legacyText);
  const fromServices = aggregatePhysioServiceTypes(services);
  return [...new Set([...profile, ...fromServices])];
}
