export interface VolleyballMetadata {
  position: string;
}

export interface TennisMetadata {
  handedness: string;
  playerType: string;
}

export type SportMetadata = VolleyballMetadata | TennisMetadata;

export interface Profile {
  id: string;
  full_name: string | null;
  bio: string | null;
  location: string | null;
  created_at: string;
}

export interface Sport {
  id: string;
  name: string;
  icon: string | null;
}

export interface UserSport {
  id: string;
  user_id: string;
  sport_id: string;
  metadata: SportMetadata | Record<string, never>;
  sports: Sport;
}

export interface UserSportRow {
  id: string;
  user_id: string;
  sport_id: string;
  metadata: unknown;
  sports: Sport | Sport[] | null;
}

export function parseSportMetadata(
  metadata: unknown,
): SportMetadata | Record<string, never> {
  if (isVolleyballMetadata(metadata) || isTennisMetadata(metadata)) {
    return metadata;
  }

  return {};
}

export function normalizeUserSports(rows: UserSportRow[] | null): UserSport[] {
  if (!rows) {
    return [];
  }

  return rows.flatMap((row) => {
    const sport = Array.isArray(row.sports) ? row.sports[0] : row.sports;

    if (!sport) {
      return [];
    }

    return [
      {
        id: row.id,
        user_id: row.user_id,
        sport_id: row.sport_id,
        metadata: parseSportMetadata(row.metadata),
        sports: sport,
      },
    ];
  });
}

export function isVolleyballMetadata(
  metadata: unknown,
): metadata is VolleyballMetadata {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "position" in metadata &&
    typeof (metadata as VolleyballMetadata).position === "string"
  );
}

export function isTennisMetadata(metadata: unknown): metadata is TennisMetadata {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "handedness" in metadata &&
    "playerType" in metadata &&
    typeof (metadata as TennisMetadata).handedness === "string" &&
    typeof (metadata as TennisMetadata).playerType === "string"
  );
}

export function buildSportMetadata(
  sportName: string,
  fields: {
    position: string;
    handedness: string;
    playerType: string;
  },
): SportMetadata {
  if (sportName === "Volleyball") {
    const metadata: VolleyballMetadata = { position: fields.position.trim() };
    return metadata;
  }

  if (sportName === "Tennis") {
    const metadata: TennisMetadata = {
      handedness: fields.handedness.trim(),
      playerType: fields.playerType.trim(),
    };
    return metadata;
  }

  throw new Error(`Unsupported sport metadata builder for "${sportName}"`);
}

export function formatSportMetadata(
  sportName: string,
  metadata: unknown,
): string {
  if (sportName === "Volleyball" && isVolleyballMetadata(metadata)) {
    return metadata.position;
  }

  if (sportName === "Tennis" && isTennisMetadata(metadata)) {
    return `${metadata.handedness} · ${metadata.playerType}`;
  }

  return "";
}
