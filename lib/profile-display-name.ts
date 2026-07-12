/** Prefer first + last name (profile edit fields) over legacy full_name snapshots. */
export function profileDisplayName(profile: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  handle?: string | null;
}): string {
  const composed = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  return (
    composed ||
    profile.full_name?.trim() ||
    profile.handle?.trim() ||
    "未命名用戶"
  );
}

export function composeProfileFullName(
  firstName?: string | null,
  lastName?: string | null
): string {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim();
}
