import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildMetaAuthorizeUrl,
  isMetaOAuthConfigured,
} from "@/lib/meta-oauth";
import type { SocialContext, SocialPlatform } from "@/lib/verification";

const PLATFORMS = new Set<SocialPlatform>(["instagram", "facebook", "threads"]);
const CONTEXTS = new Set<SocialContext>(["profile", "physio"]);

export async function GET(request: Request) {
  if (!isMetaOAuthConfigured()) {
    return NextResponse.json(
      { error: "Meta OAuth 尚未設定。請在 Vercel 加入 META_APP_ID 與 META_APP_SECRET。" },
      { status: 503 }
    );
  }

  const { searchParams, origin } = new URL(request.url);
  const platform = searchParams.get("platform") as SocialPlatform | null;
  const context = (searchParams.get("context") || "profile") as SocialContext;

  if (!platform || !PLATFORMS.has(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }
  if (!CONTEXTS.has(context)) {
    return NextResponse.json({ error: "Invalid context" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/auth?next=${encodeURIComponent("/profile/settings/account")}`);
  }

  const redirectUri = `${origin}/api/social/meta/callback`;
  const authorizeUrl = buildMetaAuthorizeUrl(platform, context, user.id, redirectUri);

  return NextResponse.redirect(authorizeUrl);
}
