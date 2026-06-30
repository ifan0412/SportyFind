import { createClient, SupabaseClient } from "@supabase/supabase-js";

// 宣告一個全域快取變數，鎖死記憶體位置
let browserClientInstance: SupabaseClient | undefined;

export function createSupabaseBrowserClient() {
  if (browserClientInstance) {
    return browserClientInstance;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase Environment Variables");
  }

  browserClientInstance = createClient(url, anonKey);
  return browserClientInstance;
}