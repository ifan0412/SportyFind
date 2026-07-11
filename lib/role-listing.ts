/** Whether a profile should appear on public coach / physio listings */

export function isCoachPubliclyListed(profile: {
  is_coach?: boolean | null;
} | null | undefined): boolean {
  return profile?.is_coach === true;
}

export function isPhysioPubliclyListed(profile: {
  is_physio?: boolean | null;
  physio_status?: string | null;
} | null | undefined): boolean {
  return profile?.is_physio === true && profile?.physio_status !== "hidden";
}

/** Active service visible to visitors (owner always sees their own in dashboards) */
export function isCoachServicePubliclyVisible(
  service: { is_active?: boolean | null },
  coach: { is_coach?: boolean | null } | null | undefined,
  viewerId?: string | null,
  coachId?: string | null
): boolean {
  if (viewerId && coachId && viewerId === coachId) return true;
  return !!service.is_active && isCoachPubliclyListed(coach);
}

export function isPhysioServicePubliclyVisible(
  service: { is_active?: boolean | null },
  physio: { is_physio?: boolean | null; physio_status?: string | null } | null | undefined,
  viewerId?: string | null,
  physioId?: string | null
): boolean {
  if (viewerId && physioId && viewerId === physioId) return true;
  return !!service.is_active && isPhysioPubliclyListed(physio);
}
