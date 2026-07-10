const PROFILE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ProfileLinkTarget = {
  id: string;
  handle?: string | null;
};

export function isProfileUuid(value: string): boolean {
  return PROFILE_UUID_RE.test(value);
}

/** Prefer @handle for public URLs; fall back to user id. */
export function profileSlug(profile: ProfileLinkTarget | string): string {
  if (typeof profile === "string") return profile;
  const handle = profile.handle?.trim();
  return handle || profile.id;
}

/** Build public profile path with optional return path / tab. */
export function profileLink(
  profileOrId: string | ProfileLinkTarget,
  returnTo?: string | null,
  options?: { tab?: "coach" | "physio" | "athlete" }
): string {
  const slug = profileSlug(profileOrId);
  const params = new URLSearchParams();
  if (returnTo) params.set("returnTo", returnTo);
  if (options?.tab && options.tab !== "athlete") params.set("tab", options.tab);
  const qs = params.toString();
  return `/p/${slug}${qs ? `?${qs}` : ""}`;
}

export function profilePublicUrl(
  origin: string,
  profileOrId: string | ProfileLinkTarget,
  returnTo?: string | null
): string {
  return `${origin.replace(/\/$/, "")}${profileLink(profileOrId, returnTo)}`;
}
