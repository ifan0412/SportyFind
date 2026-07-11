import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeMetaCode,
  fetchMetaProfile,
  isMetaOAuthConfigured,
  verifyMetaOAuthState,
} from "@/lib/meta-oauth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error_description") || searchParams.get("error");

  const settingsUrl = `${origin}/profile/settings/account?social=1`;

  if (oauthError) {
    return NextResponse.redirect(
      `${settingsUrl}&social_error=${encodeURIComponent(oauthError)}`
    );
  }

  if (!code || !state || !isMetaOAuthConfigured()) {
    return NextResponse.redirect(`${settingsUrl}&social_error=${encodeURIComponent("連結失敗")}`);
  }

  const parsed = verifyMetaOAuthState(state);
  if (!parsed) {
    return NextResponse.redirect(`${settingsUrl}&social_error=${encodeURIComponent("無效的連結狀態")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== parsed.userId) {
    return NextResponse.redirect(`${origin}/auth`);
  }

  try {
    const redirectUri = `${origin}/api/social/meta/callback`;
    const { accessToken } = await exchangeMetaCode(code, redirectUri);
    const profile = await fetchMetaProfile(parsed.platform, accessToken);

    const { error: upsertError } = await supabase.from("profile_social_connections").upsert(
      {
        user_id: user.id,
        platform: parsed.platform,
        context: parsed.context,
        external_id: profile.externalId,
        username: profile.username,
        profile_url: profile.profileUrl,
        display_name: profile.displayName,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform,context" }
    );

    if (upsertError) throw new Error(upsertError.message);

    const { error: syncError } = await supabase.rpc("sync_social_connection_urls", {
      p_user_id: user.id,
      p_platform: parsed.platform,
      p_context: parsed.context,
      p_profile_url: profile.profileUrl,
    });

    if (syncError) throw new Error(syncError.message);

    const returnTo =
      parsed.context === "physio"
        ? `${origin}/profile?tab=expertise&social_connected=${parsed.platform}`
        : `${settingsUrl}&social_connected=${parsed.platform}`;

    return NextResponse.redirect(returnTo);
  } catch (err) {
    const message = err instanceof Error ? err.message : "連結失敗";
    return NextResponse.redirect(`${settingsUrl}&social_error=${encodeURIComponent(message)}`);
  }
}
