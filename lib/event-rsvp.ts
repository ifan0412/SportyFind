import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isConfirmedRegStatus,
  isPendingRegStatus,
  isRejectedRegStatus,
  isWaitlistRegStatus,
  joinWouldBeWaitlist,
  maxCompanionCountForJoin,
  normalizeRegStatus,
  resolveNewJoinStatus,
  countFilledSlots,
} from "@/lib/event-registration";

export type EventRegistrationRow = {
  id: string;
  event_id: string;
  user_id: string;
  status: string | null;
  companion_count?: number | null;
  alias?: string | null;
  note?: string | null;
  registered_at?: string | null;
};

export function isActiveIndividualRegistration(status: string | null | undefined): boolean {
  const s = normalizeRegStatus(status);
  return (
    isConfirmedRegStatus(s) ||
    isWaitlistRegStatus(s) ||
    isPendingRegStatus(s)
  );
}

export function getJoinBlockReason(
  event: {
    registration_type?: string | null;
    accepting_guests?: boolean | null;
    approval_mode?: string | null;
    max_capacity?: number | null;
  },
  registrations: EventRegistrationRow[],
  existingReg: EventRegistrationRow | null | undefined,
  companionCount: number
): string | null {
  if (event.registration_type !== "individual") return null;

  if (existingReg && isActiveIndividualRegistration(existingReg.status)) {
    if (isConfirmedRegStatus(existingReg.status)) {
      const maxCompanions = maxCompanionCountForJoin(event, registrations, existingReg);
      if (companionCount > maxCompanions) {
        return `剩餘正式名額不足，最多可攜 ${maxCompanions} 位同伴。`;
      }
      return null;
    }
    if (isWaitlistRegStatus(existingReg.status)) {
      return "您已在候補名單中，請耐心等候主辦通知。";
    }
    if (isPendingRegStatus(existingReg.status)) {
      return "您的參賽申請審核中，請耐心等候主辦批准。";
    }
  }

  if (
    joinWouldBeWaitlist(event, registrations, companionCount, existingReg ?? undefined) &&
    companionCount > 0
  ) {
    return "候補名單不接受攜伴報名，請改為 0 位攜伴或等候正式名額釋出。";
  }

  return null;
}

/** Client fallback when RPC is stale / duplicate-key on remote DB. */
export async function updateIndividualRegistrationFallback(
  supabase: SupabaseClient,
  opts: {
    eventId: string;
    userId: string;
    registrationId: string;
    previousStatus: string | null | undefined;
    companionCount: number;
    alias: string | null;
    note: string | null;
    event: {
      accepting_guests?: boolean | null;
      registration_type?: string | null;
      approval_mode?: string | null;
      max_capacity?: number | null;
    };
    registrations: EventRegistrationRow[];
  }
): Promise<{ ok: true; status: string } | { ok: false; message: string }> {
  const prev = normalizeRegStatus(opts.previousStatus);
  const filled = countFilledSlots(opts.registrations, "individual");

  let nextStatus = resolveNewJoinStatus(opts.event, {
    filledCount: filled,
    slotsNeeded: 1 + opts.companionCount,
  });

  if (isConfirmedRegStatus(prev)) {
    nextStatus = "going";
  } else if (isPendingRegStatus(prev)) {
    nextStatus = "pending";
  } else if (isWaitlistRegStatus(prev)) {
    nextStatus = "waitlist";
  } else if (isRejectedRegStatus(prev) || prev === "cancelled") {
    // keep computed status
  }

  let companionCount = opts.companionCount;
  if (nextStatus === "waitlist" && companionCount > 0) {
    return { ok: false, message: "候補名單不接受攜伴報名，請改為 0 位攜伴。" };
  }
  if (nextStatus === "waitlist") companionCount = 0;

  const payload: Record<string, unknown> = {
    companion_count: companionCount,
    alias: opts.alias,
    note: opts.note,
    last_updated_at: new Date().toISOString(),
  };

  if (prev === "cancelled" || isRejectedRegStatus(prev)) {
    payload.status = nextStatus;
    payload.registered_at = new Date().toISOString();
  } else if (!isActiveIndividualRegistration(prev)) {
    payload.status = nextStatus;
  }

  const { error } = await supabase
    .from("event_registrations")
    .update(payload)
    .eq("id", opts.registrationId)
    .eq("user_id", opts.userId)
    .eq("event_id", opts.eventId);

  if (error) return { ok: false, message: error.message };

  return {
    ok: true,
    status: String(payload.status ?? prev ?? nextStatus),
  };
}

export async function callUpsertIndividualRsvp(
  supabase: SupabaseClient,
  opts: {
    eventId: string;
    userId: string;
    companionCount: number;
    alias: string | null;
    note: string | null;
    existingReg: EventRegistrationRow | null | undefined;
    event: {
      accepting_guests?: boolean | null;
      registration_type?: string | null;
      approval_mode?: string | null;
      max_capacity?: number | null;
    };
    registrations: EventRegistrationRow[];
  }
): Promise<{ success: boolean; message: string; status?: string }> {
  const { data, error } = await supabase.rpc("upsert_individual_rsvp", {
    p_event_id: opts.eventId,
    p_companion_count: opts.companionCount,
    p_alias: opts.alias,
    p_note: opts.note,
  });

  if (!error) {
    if (data && data.success === false) {
      return { success: false, message: String(data.message || "報名失敗") };
    }
    return {
      success: true,
      message: String(data?.message || "報名成功"),
      status: data?.status ? String(data.status) : undefined,
    };
  }

  const duplicate =
    error.code === "23505" ||
    error.message?.includes("unique_user_per_event") ||
    error.message?.includes("duplicate key");

  if (!duplicate) {
    return { success: false, message: error.message };
  }

  let reg = opts.existingReg;
  if (!reg) {
    const { data: fetched } = await supabase
      .from("event_registrations")
      .select("id, event_id, user_id, status, companion_count, alias, note, registered_at")
      .eq("event_id", opts.eventId)
      .eq("user_id", opts.userId)
      .order("registered_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    reg = fetched as EventRegistrationRow | null;
  }

  if (!reg) {
    return {
      success: false,
      message: "報名失敗：系統偵測到重複紀錄但無法更新，請重新整理後再試。",
    };
  }

  const fallback = await updateIndividualRegistrationFallback(supabase, {
    eventId: opts.eventId,
    userId: opts.userId,
    registrationId: reg.id,
    previousStatus: reg.status,
    companionCount: opts.companionCount,
    alias: opts.alias,
    note: opts.note,
    event: opts.event,
    registrations: opts.registrations,
  });

  if (!fallback.ok) {
    return { success: false, message: fallback.message };
  }

  return {
    success: true,
    message:
      fallback.status === "waitlist"
        ? "已排入候補名單"
        : fallback.status === "pending"
          ? "申請已送出，等候主辦審核"
          : "報名成功",
    status: fallback.status,
  };
}

export async function notifyAfterIndividualJoin(
  supabase: SupabaseClient,
  eventId: string,
  joinedStatus: string,
  opts: { isOrganizer: boolean }
): Promise<void> {
  if (opts.isOrganizer) return;

  const status = joinedStatus.toLowerCase();
  try {
    if (status === "waitlist" || status === "waiting" || status === "queued") {
      await supabase.rpc("notify_event_waitlist_signup", { p_event_id: eventId });
      return;
    }
    if (status === "pending" || status === "going") {
      await supabase.rpc("notify_event_registration", { p_event_id: eventId });
    }
  } catch {
    // Non-blocking
  }
}
