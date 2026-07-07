/** Build public profile URL with optional return path for Back navigation */
export function profileLink(userId: string, returnTo?: string | null): string {
  if (!returnTo) return `/p/${userId}`;
  return `/p/${userId}?returnTo=${encodeURIComponent(returnTo)}`;
}
