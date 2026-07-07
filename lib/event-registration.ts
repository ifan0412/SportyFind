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
