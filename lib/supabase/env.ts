/** Supabase local demo anon key — build-time placeholder only */
const BUILD_PLACEHOLDER_URL = "https://placeholder.supabase.co";
const BUILD_PLACEHOLDER_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

type SupabaseEnvRuntime = "server" | "browser";

/** Auth cookie key from the real Supabase project ref — must match on browser + server. */
export function getSupabaseAuthStorageKey(): string {
  const directUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!directUrl) return "supabase.auth.token";

  try {
    const projectRef = new URL(directUrl).hostname.split(".")[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return "supabase.auth.token";
  }
}

export function getSupabaseAuthCookieOptions() {
  return { name: getSupabaseAuthStorageKey() };
}

function resolveSupabaseUrl(runtime: SupabaseEnvRuntime): string | undefined {
  const directUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!directUrl) return undefined;

  if (runtime === "browser" && typeof window !== "undefined") {
    return `${window.location.origin}/sb`;
  }

  return directUrl;
}

export function getSupabaseEnv(options?: {
  runtime?: SupabaseEnvRuntime;
}): { url: string; anonKey: string } {
  const runtime = options?.runtime ?? "server";
  const url = resolveSupabaseUrl(runtime);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    return { url, anonKey };
  }

  // Next.js prerenders pages (incl. not-found) at build time; missing preview env must not fail CI.
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-export"
  ) {
    return { url: BUILD_PLACEHOLDER_URL, anonKey: BUILD_PLACEHOLDER_ANON_KEY };
  }

  throw new Error(
    "@supabase/ssr: Your project's URL and API key are required to create a Supabase client!\n\n" +
      "Check your Supabase project's API settings to find these values\n\n" +
      "https://supabase.com/dashboard/project/_/settings/api"
  );
}
