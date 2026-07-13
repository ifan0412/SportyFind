import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSupabaseAuthCookieOptions } from "@/lib/supabase/env";

const SUPPORT_EMAIL = "sportyfind.support@gmail.com";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: getSupabaseAuthCookieOptions(),
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch {
              // Expected when called from a Server Component context.
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch {
              // Expected when called from a Server Component context.
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("roles_confirmed, is_suspended, suspended_reason")
        .eq("id", data.session.user.id)
        .single();

      if (profile?.is_suspended) {
        await supabase.auth.signOut();
        const reason = profile.suspended_reason
          ? `&reason=${encodeURIComponent(profile.suspended_reason)}`
          : "";
        return NextResponse.redirect(
          `${origin}/auth?suspended=1&support=${encodeURIComponent(SUPPORT_EMAIL)}${reason}`
        );
      }

      if (profile && profile.roles_confirmed === false) {
        return NextResponse.redirect(
          `${origin}/onboarding/roles?next=${encodeURIComponent(next)}`
        );
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth`);
}
