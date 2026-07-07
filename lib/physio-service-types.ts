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

const PHYSIO_SERVICE_TYPE_SET = new Set<string>(PHYSIO_SERVICE_TYPES);

/** Only allow known short service-type labels — never render bio / free text as tags */
export function filterPhysioServiceTypeTags(types: string[]): string[] {
  return [...new Set(types.filter((t) => PHYSIO_SERVICE_TYPE_SET.has(t)))];
}

/** Normalize DB array or legacy single service_type string */
export function normalizePhysioServiceTypes(
  types: unknown,
  legacySingle?: string | null
): string[] {
  if (Array.isArray(types)) {
    const filtered = types.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
    const known = filterPhysioServiceTypeTags(filtered);
    if (known.length) return known;
  }
  if (legacySingle?.trim()) {
    const t = legacySingle.trim();
    if (PHYSIO_SERVICE_TYPE_SET.has(t)) return [t];
  }
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

/** Profile-level service tags (array column only — never parse long legacy bio text) */
export function normalizePhysioProfileTags(
  tags: unknown,
  legacyText?: string | null
): string[] {
  const fromArray = normalizePhysioServiceTypes(tags);
  if (fromArray.length) return fromArray;
  if (legacyText?.trim()) {
    const parts = legacyText
      .split(/[,、，]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const known = parts.filter((p) =>
      (PHYSIO_SERVICE_TYPES as readonly string[]).includes(p)
    );
    if (known.length) return [...new Set(known)];
  }
  return [];
}

/** Merge profile tags with per-service types for listing cards (no legacy text fallback) */
export function physioCardServiceTags(
  profileTags: unknown,
  _legacyText: string | null | undefined,
  services: { service_types?: unknown; service_type?: string | null }[]
): string[] {
  const profile = normalizePhysioServiceTypes(profileTags);
  const fromServices = aggregatePhysioServiceTypes(services);
  return [...new Set([...profile, ...fromServices])];
}
