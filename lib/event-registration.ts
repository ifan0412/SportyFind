export type EventApprovalMode = "fcfs" | "approval";

export function normalizeRegStatus(status: string | null | undefined) {
  return String(status || "").toLowerCase().trim();
}

export function isConfirmedRegStatus(status: string | null | undefined) {
  return ["going", "confirmed", "accepted"].includes(normalizeRegStatus(status));
}

export function isWaitlistRegStatus(status: string | null | undefined) {
  return ["waitlist", "waiting", "queued"].includes(normalizeRegStatus(status));
}

export function isPendingRegStatus(status: string | null | undefined) {
  return ["pending", "reviewing"].includes(normalizeRegStatus(status));
}

export function isRejectedRegStatus(status: string | null | undefined) {
  return ["kicked", "rejected"].includes(normalizeRegStatus(status));
}

export function formatRegistrationDisplayName(reg: {
  alias?: string | null;
  profiles?: { full_name?: string | null } | null;
  team?: { name_zh?: string | null; name_en?: string | null } | null;
}): string {
  const alias = reg.alias?.trim() || "";
  const baseName =
    reg.profiles?.full_name?.trim() ||
    reg.team?.name_zh?.trim() ||
    reg.team?.name_en?.trim() ||
    "";

  if (baseName && alias) return `${baseName} (${alias})`;
  if (baseName) return baseName;
  if (alias) return alias;
  return "未知參加者";
}

export function countFilledSlots(
  registrations: Array<{ status?: string | null; companion_count?: number | null }>,
  registrationType: string
) {
  return registrations
    .filter((r) => isConfirmedRegStatus(r.status))
    .reduce(
      (acc, curr) =>
        acc + (registrationType === "individual" ? 1 + (curr.companion_count || 0) : 1),
      0
    );
}

export function getEventApprovalMode(event: {
  registration_type?: string | null;
  approval_mode?: string | null;
}): EventApprovalMode {
  if (event.registration_type === "team") return "approval";
  return event.approval_mode === "approval" ? "approval" : "fcfs";
}

export function isEventAcceptingGuests(event: {
  accepting_guests?: boolean | null;
}): boolean {
  return event.accepting_guests !== false;
}

/** Status assigned to a brand-new join or re-apply after rejection/cancel. */
export function resolveNewJoinStatus(
  event: {
    accepting_guests?: boolean | null;
    registration_type?: string | null;
    approval_mode?: string | null;
    max_capacity?: number | null;
  },
  opts: { filledCount: number; slotsNeeded: number }
): "pending" | "waitlist" | "going" {
  const approvalMode = getEventApprovalMode(event);

  if (!isEventAcceptingGuests(event)) {
    return approvalMode === "approval" ? "pending" : "waitlist";
  }

  if (approvalMode === "approval") return "pending";

  if (
    event.max_capacity != null &&
    opts.filledCount + opts.slotsNeeded > event.max_capacity
  ) {
    return "waitlist";
  }

  return "going";
}

/** Slots still available for confirmed attendees (not waitlist). */
export function remainingConfirmedSlots(
  event: { max_capacity?: number | null; registration_type?: string | null },
  registrations: Array<{ status?: string | null; companion_count?: number | null }>
): number | null {
  if (event.max_capacity == null) return null;
  const filled = countFilledSlots(registrations, event.registration_type || "individual");
  return Math.max(0, event.max_capacity - filled);
}

/** Max companions allowed without forcing waitlist (0 when only waitlist is possible). */
export function maxCompanionCountForJoin(
  event: {
    accepting_guests?: boolean | null;
    registration_type?: string | null;
    approval_mode?: string | null;
    max_capacity?: number | null;
  },
  registrations: Array<{ status?: string | null; companion_count?: number | null }>,
  existingReg?: { status?: string | null; companion_count?: number | null } | null
): number {
  if (event.registration_type !== "individual") return 0;

  const approvalMode = getEventApprovalMode(event);
  if (approvalMode === "approval" || !isEventAcceptingGuests(event)) return 0;

  const remaining = remainingConfirmedSlots(event, registrations);
  if (remaining == null) return 3;

  let adjustedRemaining = remaining;
  if (existingReg && isConfirmedRegStatus(existingReg.status)) {
    adjustedRemaining += 1 + (existingReg.companion_count || 0);
  }

  return Math.max(0, Math.min(3, adjustedRemaining - 1));
}

export function joinWouldBeWaitlist(
  event: {
    accepting_guests?: boolean | null;
    registration_type?: string | null;
    approval_mode?: string | null;
    max_capacity?: number | null;
  },
  registrations: Array<{ status?: string | null; companion_count?: number | null }>,
  companionCount: number,
  existingReg?: { status?: string | null; companion_count?: number | null } | null
): boolean {
  if (event.registration_type !== "individual") return false;
  const approvalMode = getEventApprovalMode(event);
  if (approvalMode === "approval") return false;
  if (!isEventAcceptingGuests(event)) return true;

  const filled = countFilledSlots(registrations, "individual");
  let adjustedFilled = filled;
  if (existingReg && isConfirmedRegStatus(existingReg.status)) {
    adjustedFilled -= 1 + (existingReg.companion_count || 0);
  }

  return resolveNewJoinStatus(event, {
    filledCount: adjustedFilled,
    slotsNeeded: 1 + companionCount,
  }) === "waitlist";
}

export function findUserIndividualRegistration<
  T extends { user_id?: string | null; status?: string | null }
>(registrations: T[], userId?: string | null): T | undefined {
  if (!userId) return undefined;
  const mine = registrations.filter((r) => r.user_id === userId);
  if (!mine.length) return undefined;

  return (
    mine.find((r) => {
      const status = normalizeRegStatus(r.status);
      return !["cancelled", "kicked", "rejected"].includes(status);
    }) ?? mine.sort(
      (a, b) =>
        new Date((b as { registered_at?: string }).registered_at || 0).getTime() -
        new Date((a as { registered_at?: string }).registered_at || 0).getTime()
    )[0]
  );
}

export function getVisibleRegistrations<T extends { status?: string | null; user_id?: string | null }>(
  registrations: T[],
  opts: {
    isOrganizer: boolean;
    currentUserId?: string | null;
    registrationType: string;
    approvalMode: EventApprovalMode;
  }
): T[] {
  const active = registrations.filter((r) => normalizeRegStatus(r.status) !== "cancelled");
  if (opts.isOrganizer) return active;

  if (opts.registrationType === "individual" && opts.approvalMode === "approval") {
    return active.filter(
      (r) =>
        isConfirmedRegStatus(r.status) ||
        (opts.currentUserId && r.user_id === opts.currentUserId && isPendingRegStatus(r.status))
    );
  }

  if (opts.registrationType === "individual" && opts.approvalMode === "fcfs") {
    return active.filter(
      (r) => isConfirmedRegStatus(r.status) || isWaitlistRegStatus(r.status)
    );
  }

  return active;
}
