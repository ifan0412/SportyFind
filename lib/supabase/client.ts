import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

let client: SupabaseClient | null = null;

export function createSupabaseBrowserClient() {
  if (client) return client;

  const { url, anonKey } = getSupabaseEnv({ runtime: "browser" });
  client = createBrowserClient(url, anonKey);

  return client;
}
