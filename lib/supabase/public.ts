import "server-only";

import { headers } from "next/headers";

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

const PUBLIC_ORIGIN_FALLBACK = "https://sporty-find.com";

/**
 * Absolute origin for Open Graph tags.
 * Prefer custom domain — never ephemeral *.vercel.app deploy aliases (SSO / no public image).
 */
export async function getOgOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "").trim();
  if (configured && !configured.includes(".vercel.app")) {
    return configured;
  }

  try {
    const h = await headers();
    const host = (h.get("x-forwarded-host") || h.get("host") || "")
      .split(",")[0]
      .trim()
      .toLowerCase();
    const proto = (h.get("x-forwarded-proto") || "https").split(",")[0].trim() || "https";
    if (host && !host.includes("localhost") && !host.endsWith(".vercel.app")) {
      return `${proto}://${host}`;
    }
  } catch {
    // headers() unavailable outside a request
  }

  return PUBLIC_ORIGIN_FALLBACK;
}

async function fetchEventWithKey(
  baseUrl: string,
  apiKey: string,
  eventId: string
): Promise<{ row: EventShareRow | null; status: number; errorText: string }> {
  const select =
    "id,title,start_time,end_time,location_name,location_address,cover_image_url,status";
  const endpoint = `${baseUrl}/rest/v1/events?id=eq.${encodeURIComponent(eventId)}&select=${select}`;

  const res = await fetch(endpoint, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { row: null, status: res.status, errorText: body.slice(0, 400) };
  }

  const rows = (await res.json()) as EventShareRow[];
  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  return { row, status: res.status, errorText: "" };
}

/**
 * Load event fields for Open Graph via PostgREST (no cookie / supabase-js session).
 * Tries service_role first, then anon — anon is enough for published events.
 */
export async function fetchEventForShareMetadata(
  id: string
): Promise<EventShareRow | null> {
  const eventId = id?.trim();
  if (!eventId) return null;

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "").trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!baseUrl) {
    console.error("[og] missing NEXT_PUBLIC_SUPABASE_URL");
    return null;
  }

  const keys = [serviceKey, anonKey].filter((k): k is string => Boolean(k));
  if (!keys.length) {
    console.error("[og] missing SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return null;
  }

  let lastError = "";
  for (const key of keys) {
    try {
      const { row, status, errorText } = await fetchEventWithKey(baseUrl, key, eventId);
      if (row) return row;
      if (status >= 400) {
        lastError = `${status} ${errorText}`;
        // Bad/wrong secret → try next key (e.g. fall back to anon)
        continue;
      }
      // 200 but empty — unlikely to appear with another key unless RLS differs
      lastError = `empty for ${eventId}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error("[og] event fetch exception:", lastError);
    }
  }

  console.error("[og] event not loaded", eventId, lastError);
  return null;
}
