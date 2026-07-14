import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createServiceRoleClient, hasServiceRoleClient } from "@/lib/supabase/service";

const EVENT_SHARE_SELECT =
  "id, title, start_time, end_time, location_name, location_address, cover_image_url, status";

export type EventShareRow = {
  id: string;
  title: string | null;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  location_address: string | null;
  cover_image_url: string | null;
  status: string | null;
};

/** Cookie-less anon client — safe for WhatsApp / Facebook scrapers (no session). */
export function createPublicAnonClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Load event fields for Open Graph / link previews.
 * Prefer service role (RLS bypass) so bots always see publicly shareable events.
 */
export async function fetchEventForShareMetadata(
  id: string
): Promise<EventShareRow | null> {
  if (!id?.trim()) return null;

  if (hasServiceRoleClient()) {
    try {
      const supabase = createServiceRoleClient();
      const { data, error } = await supabase
        .from("events")
        .select(EVENT_SHARE_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) {
        console.error("[og] service role event fetch:", error.message);
      } else if (data) {
        return data as EventShareRow;
      }
    } catch (err) {
      console.error("[og] service role client failed:", err);
    }
  }

  try {
    const supabase = createPublicAnonClient();
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_SHARE_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("[og] anon event fetch:", error.message);
      return null;
    }
    return (data as EventShareRow | null) ?? null;
  } catch (err) {
    console.error("[og] anon client failed:", err);
    return null;
  }
}
